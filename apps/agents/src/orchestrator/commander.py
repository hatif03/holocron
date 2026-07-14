import json
import time
import uuid
from pathlib import Path
from typing import Any, Awaitable, Callable

from pydantic import BaseModel

from ..agents.planner import PlanRequest, plan_paper
from ..agents.reviewer import ReviewRequest, review_section
from ..agents.typesetter import CompileRequest, compile_latex
from ..agents.vlm_review import VlmReviewRequest, review_pdf
from ..agents.writer import DraftRequest, draft_section
from ..config import settings
from ..orchestrator.graph_context import (
    build_bibtex_entries,
    copy_figure_assets,
    extract_graph_context,
    latex_figures_and_tables,
)
from ..supermemory_client import context_for_work, search_work, store_memory

EventCallback = Callable[[str, str, str, dict], Awaitable[None]]


class GenerateRequest(BaseModel):
    generation_id: str | None = None
    work_id: str
    graph: dict[str, Any]
    config: dict[str, Any]
    title: str = "Research Paper"


class GenerateResponse(BaseModel):
    generation_id: str
    status: str
    output_dir: str
    pdf_path: str | None
    word_count: int


async def _emit(
    cb: EventCallback | None,
    agent: str,
    event_type: str,
    message: str,
    metadata: dict | None = None,
):
    if cb:
        await cb(agent, event_type, message, metadata or {})


def _section_budget(section: dict, total_sections: int, target_pages: int) -> int:
    explicit = section.get("target_words")
    if explicit:
        return int(explicit)
    total_words = target_pages * 250
    return max(200, total_words // max(total_sections, 1))


def _min_section_words(target_words: int) -> int:
    return max(150, int(target_words * 0.85))


def _bib_keys(discovered_refs: list[dict], graph: dict) -> list[str]:
    keys = [f"discovered{i}" for i in range(min(len(discovered_refs), 12))]
    ctx = extract_graph_context(graph)
    keys.extend(f"lit{i}" for i in range(len(ctx.literature)))
    return keys


def _resolve_venue_style(style: str, target_venue: str) -> str:
    venue = (target_venue or "").lower()
    if "icml" in venue:
        return "icml"
    if "ieee" in venue:
        return "ieee"
    if "nature" in venue.lower() or style.lower().startswith("nature"):
        return "nature"
    return "nature"


def _build_main_tex(title: str, venue_style: str, sections: list[str]) -> str:
    safe_title = title.replace("_", "\\_")
    if venue_style == "ieee":
        docclass = "\\documentclass[conference]{article}"
        author = "\\author{Holocron Generated}"
        bib_style = "plain"
    elif venue_style == "icml":
        docclass = "\\documentclass{article}"
        author = "\\author{Holocron Generated}"
        bib_style = "plain"
    else:
        docclass = "\\documentclass[twocolumn]{article}"
        author = "\\author{Holocron Generated}"
        bib_style = "plain"

    lines = [
        docclass,
        "\\usepackage{graphicx}",
        "\\usepackage{amsmath}",
        "\\usepackage{hyperref}",
        "\\usepackage{booktabs}",
        f"\\title{{{safe_title}}}",
        author,
        "\\begin{document}",
        "\\maketitle",
    ]
    for section in sections:
        safe = section.replace(" ", "_")
        lines.append(f"\\input{{sections/{safe}.tex}}")
    lines.append(f"\\bibliographystyle{{{bib_style}}}")
    lines.append("\\bibliography{references}")
    lines.append("\\end{document}")
    return "\n".join(lines) + "\n"


async def _write_section(
    *,
    section: dict,
    gen_id: str,
    req: GenerateRequest,
    on_event: EventCallback | None,
    graph_ctx,
    graph_ctx_dict: dict,
    plan: dict | None,
    paper_title: str,
    memory_ctx: str,
    discovered_refs: list,
    copied_figures: list,
    style: str,
    target_pages: int,
    total_sections: int,
    enable_review: bool,
    max_reviews: int,
    sections_dir: Path,
    latex_blocks: str,
) -> tuple[str, int]:
    name = section.get("name", "Section")
    safe_name = name.replace(" ", "_")
    phase = "introduction" if name.lower() == "introduction" else "body_sections"
    target_words = _section_budget(section, total_sections, target_pages)
    paragraphs = int(section.get("paragraphs") or 3)
    outline = section.get("outline") or []
    if isinstance(outline, str):
        outline = [line.strip() for line in outline.split("\n") if line.strip()]

    graph_snippets = graph_ctx.snippets_for_section(name)
    section_figures = copied_figures if name.lower() in ("results", "discussion") else []
    section_latex = latex_blocks if name.lower() == "results" else ""
    min_words = _min_section_words(target_words)

    await _emit(
        on_event, "Writer", "writing", f"Drafting {name}",
        {"phase": phase, "section": name, "workflow_stage": "writing"},
    )

    search_q = f"{name} {outline[0] if outline else paper_title}"
    section_memory = await search_work(req.work_id, search_q, limit=3)

    draft = await draft_section(
        DraftRequest(
            section_name=name,
            context={
                "graph_context": graph_ctx_dict,
                "plan": plan,
                "title": paper_title,
                "memory": memory_ctx,
                "section_memory": section_memory,
                "discovered_refs": discovered_refs[:8],
            },
            style_guide=style,
            target_words=target_words,
            paragraphs=paragraphs,
            outline=outline if isinstance(outline, list) else [],
            graph_snippets=graph_snippets,
            figures=section_figures,
            latex_blocks=section_latex,
            experiment_flow=graph_ctx.flow_summary(),
            bib_keys=_bib_keys(discovered_refs, req.graph),
        )
    )
    content = draft.content
    word_count = draft.word_count

    if enable_review:
        review_memory = await search_work(
            req.work_id, f"review feedback {name} {paper_title}", limit=3
        )
        for i in range(max_reviews):
            review = await review_section(
                ReviewRequest(
                    section_name=name,
                    content=content,
                    style_guide=style,
                    context={
                        "graph_context": graph_ctx_dict,
                        "prior_review_memory": review_memory,
                        "discovered_refs": discovered_refs[:5],
                    },
                    min_words=min_words,
                    graph_snippets=graph_snippets,
                )
            )
            if review.revised_content:
                content = review.revised_content
                word_count = len(content.split())
            if review.approved and word_count >= min_words:
                break

    section_path = sections_dir / f"{safe_name}.tex"
    if word_count < 10 and section_path.exists():
        content = section_path.read_text(encoding="utf-8")
        word_count = len(content.split())
    else:
        section_path.write_text(content, encoding="utf-8")

    await store_memory(
        f"section: {name}\n{content}",
        req.work_id,
        custom_id=f"gen_{gen_id}_{safe_name}",
        metadata={"type": "writer", "generationId": gen_id, "workId": req.work_id, "section": name},
    )
    await _emit(
        on_event, "Writer", "completed", f"Generated {name} ({word_count} words)",
        {"phase": phase, "word_count": word_count, "section": name},
    )
    return name, word_count


async def run_generation(
    req: GenerateRequest,
    on_event: EventCallback | None = None,
) -> GenerateResponse:
    gen_id = req.generation_id or str(uuid.uuid4())
    config = req.config
    style = config.get("styleGuide", "Nature")
    max_reviews = config.get("maxReviewIterations", 3)
    enable_review = config.get("enableReviewLoop", True)
    enable_planning = config.get("enablePlanning", True)
    target_pages = int(config.get("targetPages", 10) or 10)
    compile_pdf = config.get("compilePdf", True)
    pause_for_feedback = config.get("pauseForFeedback", False)

    graph_ctx = extract_graph_context(req.graph)
    graph_ctx_dict = graph_ctx.to_dict()
    paper_title = graph_ctx.title if graph_ctx.title != "Research Paper" else req.title
    venue_style = _resolve_venue_style(style, graph_ctx.target_venue)
    if graph_ctx.target_venue:
        style = f"{style} ({graph_ctx.target_venue})"

    output_dir = Path(settings.storage_path) / "generations" / gen_id
    output_dir.mkdir(parents=True, exist_ok=True)
    sections_dir = output_dir / "sections"
    sections_dir.mkdir(exist_ok=True)

    copied_figures = copy_figure_assets(req.graph, str(output_dir), settings.storage_path)
    latex_blocks = latex_figures_and_tables(graph_ctx, copied_figures)

    total_words = 0
    discovered_refs: list[dict[str, Any]] = []

    await _emit(
        on_event, "Commander", "agent", "CommanderAgent: Starting paper generation pipeline",
        {"phase": "planning", "workflow_stage": "start"},
    )

    memory_ctx = await context_for_work(req.work_id, query=paper_title)

    plan = None
    if enable_planning:
        plan_result = await plan_paper(
            PlanRequest(
                graph=req.graph,
                work_id=req.work_id,
                query=paper_title,
                graph_context=graph_ctx_dict,
            )
        )
        plan = plan_result.model_dump()
        discovered_refs = plan_result.discovered_refs
        if not plan_result.sections:
            raise ValueError("Planner returned zero sections — cannot continue.")
        await _emit(
            on_event, "Planner", "completed",
            f"Plan created with {len(plan_result.sections)} sections",
            {"phase": "planning", "workflow_stage": "planning"},
        )
        await store_memory(
            json.dumps({"plan": plan, "refs": plan_result.discovered_refs}),
            req.work_id,
            custom_id=f"gen_{gen_id}_plan",
            metadata={"type": "planner", "generationId": gen_id, "workId": req.work_id},
        )

    sections = (plan or {}).get("sections") or [
        {"name": "Abstract", "paragraphs": 1, "target_words": 250},
        {"name": "Introduction", "paragraphs": 4, "target_words": 800},
        {"name": "Methods", "paragraphs": 5, "target_words": 900},
        {"name": "Results", "paragraphs": 4, "target_words": 900},
        {"name": "Discussion", "paragraphs": 4, "target_words": 800},
        {"name": "Conclusion", "paragraphs": 2, "target_words": 300},
    ]

    section_word_counts: dict[str, int] = {}
    section_files: dict[str, str] = {}

    write_kwargs = dict(
        gen_id=gen_id,
        req=req,
        on_event=on_event,
        graph_ctx=graph_ctx,
        graph_ctx_dict=graph_ctx_dict,
        plan=plan,
        paper_title=paper_title,
        memory_ctx=memory_ctx,
        discovered_refs=discovered_refs,
        copied_figures=copied_figures,
        style=style,
        target_pages=target_pages,
        total_sections=len(sections),
        enable_review=enable_review,
        max_reviews=max_reviews,
        sections_dir=sections_dir,
        latex_blocks=latex_blocks,
    )

    for section in sections:
        name, word_count = await _write_section(section=section, **write_kwargs)
        section_word_counts[name] = word_count
        section_files[name] = (sections_dir / f"{name.replace(' ', '_')}.tex").read_text(encoding="utf-8")
        total_words += word_count

        if pause_for_feedback and enable_review:
            return GenerateResponse(
                generation_id=gen_id,
                status="waiting_for_feedback",
                output_dir=str(output_dir),
                pdf_path=None,
                word_count=total_words,
            )

    min_total = target_pages * 400
    expansion_passes = 0
    while total_words < min_total and section_word_counts and expansion_passes < 3:
        expansion_passes += 1
        thinnest_names = sorted(section_word_counts, key=section_word_counts.get)[:3]
        await _emit(
            on_event, "Commander", "agent",
            f"Total words ({total_words}) below target ({min_total}); expanding {', '.join(thinnest_names)}",
            {"phase": "body_sections", "workflow_stage": "expansion"},
        )
        for sec_name in thinnest_names:
            sec = next((s for s in sections if s.get("name") == sec_name), None)
            if not sec:
                continue
            boosted = dict(sec)
            boosted["target_words"] = int(_section_budget(sec, len(sections), target_pages) * 1.3)
            name, word_count = await _write_section(section=boosted, **write_kwargs)
            old = section_word_counts.get(name, 0)
            total_words += word_count - old
            section_word_counts[name] = word_count
            section_files[name] = (sections_dir / f"{name.replace(' ', '_')}.tex").read_text(encoding="utf-8")

    for section in sections:
        name = section.get("name", "Section")
        safe_name = name.replace(" ", "_")
        path = sections_dir / f"{safe_name}.tex"
        if not path.exists():
            raise ValueError(f"Missing section file: {safe_name}.tex — generation incomplete.")

    main_tex = _build_main_tex(paper_title, venue_style, list(section_files.keys()))
    (output_dir / "main.tex").write_text(main_tex, encoding="utf-8")

    bib_content = build_bibtex_entries(discovered_refs, req.graph)
    if not bib_content.strip():
        bib_content = "@article{placeholder2024, title={Placeholder Reference}, year={2024}}\n"
    (output_dir / "references.bib").write_text(bib_content, encoding="utf-8")

    pdf_path = None
    if compile_pdf:
        compile_result = await compile_latex(
            CompileRequest(project_dir=str(output_dir), main_file="main.tex")
        )
        pdf_path = compile_result.pdf_path
        if compile_result.success:
            await _emit(on_event, "Typesetter", "completed", "PDF compiled successfully")
        if pdf_path:
            vlm = await review_pdf(VlmReviewRequest(pdf_path=pdf_path, target_pages=target_pages))
            await store_memory(
                json.dumps({"passed": vlm.passed, "issues": vlm.issues}),
                req.work_id,
                custom_id=f"gen_{gen_id}_vlm",
                metadata={"type": "vlm_review", "generationId": gen_id, "workId": req.work_id},
            )

    await _emit(
        on_event, "Commander", "completed",
        f"Paper generation complete ({total_words} words total)",
        {"workflow_stage": "complete", "word_count": total_words},
    )

    status = "completed" if (pdf_path or not compile_pdf) else "completed_with_warnings"
    return GenerateResponse(
        generation_id=gen_id,
        status=status,
        output_dir=str(output_dir),
        pdf_path=pdf_path,
        word_count=total_words,
    )
