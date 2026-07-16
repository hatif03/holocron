import json
import uuid
from pathlib import Path
from typing import Any, Awaitable, Callable

from pydantic import BaseModel

from ..agents.citation_verifier import CitationVerifyRequest, verify_citations
from ..agents.planner import PlanRequest, _ensure_academic_sections, plan_paper
from ..agents.reviewer import ReviewRequest, review_section
from ..agents.typesetter import CompileRequest, compile_latex
from ..agents.vlm_review import VlmReviewRequest, review_pdf
from ..agents.writer import DraftRequest, draft_section
from ..config import settings
from ..orchestrator.graph_context import (
    build_bibtex_entries,
    build_section_latex_blocks,
    copy_figure_assets,
    extract_graph_context,
)
from ..orchestrator.chart_generator import generate_charts_from_graph
from ..orchestrator.graph_contract import GraphContract
from ..supermemory_client import context_for_work, search_work, search_work_hits, store_memory, wait_for_searchable

EventCallback = Callable[[str, str, str, dict], Awaitable[None]]


class GenerateRequest(BaseModel):
    generation_id: str | None = None
    work_id: str
    graph: dict[str, Any]
    config: dict[str, Any]
    title: str = "Research Paper"
    library_bib: list[str] = []


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
        lines = [
            "\\documentclass[conference]{IEEEtran}",
            "\\usepackage{graphicx}",
            "\\usepackage{amsmath}",
            "\\usepackage{hyperref}",
            "\\usepackage{listings}",
            f"\\title{{{safe_title}}}",
            "\\author{\\IEEEauthorblockN{Holocron Generated}}",
            "\\begin{document}",
            "\\maketitle",
        ]
        bib_style = "IEEEtran"
    elif venue_style == "icml":
        lines = [
            "\\documentclass{article}",
            "\\usepackage{graphicx}",
            "\\usepackage{amsmath}",
            "\\usepackage{hyperref}",
            "\\usepackage{listings}",
            "\\usepackage{booktabs}",
            f"\\title{{{safe_title}}}",
            "\\author{Holocron Generated}",
            "\\begin{document}",
            "\\maketitle",
        ]
        bib_style = "plain"
    else:
        lines = [
            "\\documentclass[twocolumn]{article}",
            "\\usepackage{graphicx}",
            "\\usepackage{amsmath}",
            "\\usepackage{hyperref}",
            "\\usepackage{listings}",
            "\\usepackage{booktabs}",
            "\\usepackage{natbib}",
            f"\\title{{{safe_title}}}",
            "\\author{Holocron Generated}",
            "\\begin{document}",
            "\\maketitle",
        ]
        bib_style = "naturemag"

    lines.append("\\lstset{breaklines=true,basicstyle=\\ttfamily\\small}")
    lines.append("\\graphicspath{{figures/}}")

    for section in sections:
        safe = section.replace(" ", "_")
        lines.append(f"\\input{{sections/{safe}.tex}}")
    lines.append(f"\\bibliographystyle{{{bib_style}}}")
    lines.append("\\bibliography{references}")
    lines.append("\\end{document}")
    return "\n".join(lines) + "\n"


def _fallback_section_latex(
    section_name: str,
    graph_snippets: list[str],
    bib_keys: list[str],
    latex_blocks: str = "",
) -> str:
    lines = [f"\\section{{{section_name}}}"]
    for snip in graph_snippets[:12]:
        lines.append(snip.replace("bibtex:", "Reference:"))
    if bib_keys:
        cite_line = " ".join(f"\\cite{{{k}}}" for k in bib_keys[:8])
        lines.append(f"Prior work establishes context for this study {cite_line}.")
    if latex_blocks:
        lines.append(latex_blocks)
    return "\n\n".join(lines)


async def _emit_memory(
    on_event: EventCallback | None,
    work_id: str,
    action: str,
    message: str,
    *,
    section: str = "",
    query: str = "",
    preview: str = "",
    recalled_count: int = 0,
    hits: list[str] | None = None,
):
    meta: dict = {
        "action": action,
        "section": section,
        "containerTag": f"work_{work_id}",
        "preview": preview[:500],
        "query": query,
        "phase": "planning" if action == "profile" else "body_sections",
    }
    if action == "search":
        meta["attempted"] = True
        meta["recalledCount"] = recalled_count
        if hits:
            meta["hits"] = [h[:400] for h in hits[:3]]
    else:
        if recalled_count:
            meta["recalledCount"] = recalled_count
        if hits:
            meta["hits"] = [h[:400] for h in hits[:3]]
    await _emit(on_event, "Supermemory", "memory", message, meta)


async def _write_section(
    *,
    section: dict,
    gen_id: str,
    req: GenerateRequest,
    on_event: EventCallback | None,
    graph_ctx,
    graph_ctx_dict: dict,
    contract: GraphContract,
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
    latex_blocks_by_section: dict[str, str],
    prior_section_names: list[str] | None = None,
) -> tuple[str, int]:
    name = section.get("name", "Section")
    safe_name = name.replace(" ", "_")
    phase = "introduction" if name.lower() == "introduction" else "body_sections"
    prior_names = prior_section_names or []

    memory_ctx = await context_for_work(
        req.work_id, query=f"{paper_title} {name}"
    )
    if memory_ctx:
        await _emit_memory(
            on_event, req.work_id, "profile",
            f"Refreshed profile for {name}",
            section=name, query=f"{paper_title} {name}", preview=memory_ctx[:500],
        )
    target_words = _section_budget(section, total_sections, target_pages)
    paragraphs = int(section.get("paragraphs") or 3)
    outline = section.get("outline") or []
    if isinstance(outline, str):
        outline = [line.strip() for line in outline.split("\n") if line.strip()]

    node_ids = section.get("graph_node_ids") or contract.node_ids_for_section(name)
    graph_snippets = graph_ctx.snippets_for_node_ids(node_ids) if node_ids else graph_ctx.snippets_for_section(name)
    if not graph_snippets:
        graph_snippets = graph_ctx.snippets_for_section(name)

    section_flow = graph_ctx.section_flow(name, node_ids) or graph_ctx.flow_summary()
    section_figures = copied_figures if name.lower() in ("results", "discussion") else []
    section_latex = latex_blocks_by_section.get(name.lower(), "")
    min_words = _min_section_words(target_words)
    bib_keys = contract.bib_keys_for_section(name) or contract.required_cite_keys()

    await _emit(
        on_event, "Writer", "writing", f"Drafting {name}",
        {"phase": phase, "section": name, "workflow_stage": "writing", "graph_node_ids": node_ids},
    )

    search_q = f"{name} {outline[0] if outline else paper_title}"
    section_hits = await search_work_hits(req.work_id, search_q, limit=3)
    prior_hits: list[str] = []
    if prior_names:
        seen_prior: set[str] = set()
        for prior_name in prior_names[-4:]:
            prior_q = f"section: {prior_name}"
            for hit in await search_work_hits(req.work_id, prior_q, limit=2):
                if hit not in seen_prior:
                    seen_prior.add(hit)
                    prior_hits.append(hit)
        prior_q = f"section: {prior_names[-1]}"
        await _emit_memory(
            on_event, req.work_id, "search",
            f"Recalled {len(prior_hits)} prior section memories for {name}",
            section=name, query=prior_q, preview="\n".join(prior_hits)[:500],
            recalled_count=len(prior_hits), hits=prior_hits or None,
        )
    await _emit_memory(
        on_event, req.work_id, "search",
        f"Recalled {len(section_hits)} memories for {name}",
        section=name, query=search_q, preview="\n".join(section_hits)[:500],
        recalled_count=len(section_hits), hits=section_hits or None,
    )

    draft = await draft_section(
        DraftRequest(
            section_name=name,
            context={
                "graph_context": graph_ctx_dict,
                "plan": plan,
                "title": paper_title,
                "memory": memory_ctx,
                "section_memory": "\n".join(section_hits),
                "prior_sections_memory": "\n".join(prior_hits),
                "discovered_refs": discovered_refs[:8],
                "graph_node_ids": node_ids,
            },
            style_guide=style,
            target_words=target_words,
            paragraphs=paragraphs,
            outline=outline if isinstance(outline, list) else [],
            graph_snippets=graph_snippets,
            figures=section_figures,
            latex_blocks=section_latex,
            experiment_flow=section_flow,
            bib_keys=bib_keys,
        )
    )
    content = draft.content
    word_count = draft.word_count

    if enable_review:
        review_query = f"review feedback {name} {paper_title}"
        review_hits = await search_work_hits(req.work_id, review_query, limit=3)
        review_memory = "\n".join(review_hits)
        await _emit_memory(
            on_event, req.work_id, "search",
            f"Recalled {len(review_hits)} review memories for {name}",
            section=name, query=review_query,
            preview=review_hits[0][:300] if review_hits else "",
            recalled_count=len(review_hits), hits=review_hits or None,
        )
        for i in range(max_reviews):
            await _emit(
                on_event, "Reviewer", "reviewing",
                f"Reviewing {name} (round {i + 1})",
                {"phase": "review", "section": name, "round": i + 1},
            )
            review = await review_section(
                ReviewRequest(
                    section_name=name,
                    content=content,
                    style_guide=style,
                    context={
                        "graph_context": graph_ctx_dict,
                        "memory": memory_ctx,
                        "prior_review_memory": review_memory,
                        "discovered_refs": discovered_refs,
                    },
                    min_words=min_words,
                    graph_snippets=graph_snippets,
                    required_bib_keys=bib_keys,
                    contract_node_count=len(node_ids),
                )
            )
            if review.revised_content:
                content = review.revised_content
                word_count = len(content.split())
            if review.approved and word_count >= min_words:
                await _emit(
                    on_event, "Reviewer", "completed",
                    f"Approved {name} ({word_count} words)",
                    {"phase": "review", "section": name, "approved": True},
                )
                break
            await _emit(
                on_event, "Reviewer", "feedback",
                review.feedback or f"{name} needs revision",
                {"phase": "review", "section": name, "approved": False},
            )
            if review.feedback:
                await store_memory(
                    f"review feedback {name}: {review.feedback}",
                    req.work_id,
                    custom_id=f"gen_{gen_id}_{safe_name}_review_{i + 1}",
                    metadata={
                        "type": "review",
                        "section": name,
                        "generationId": gen_id,
                        "workId": req.work_id,
                    },
                )
                await wait_for_searchable(
                    req.work_id, f"review feedback {name}", timeout_s=10
                )
            review_hits = await search_work_hits(
                req.work_id, f"review feedback {name} {paper_title}", limit=3
            )
            review_memory = "\n".join(review_hits)
            await _emit_memory(
                on_event, req.work_id, "search",
                f"Recalled {len(review_hits)} review memories (round {i + 2})",
                section=name, query=review_query,
                preview=review_hits[0][:300] if review_hits else "",
                recalled_count=len(review_hits), hits=review_hits or None,
            )

    if word_count < min_words and graph_snippets:
        content = _fallback_section_latex(name, graph_snippets, bib_keys, section_latex)
        word_count = len(content.split())

    if section_latex and section_latex.strip() not in content:
        content = content.rstrip() + "\n\n" + section_latex.strip() + "\n"
        word_count = len(content.split())

    section_lower = name.lower()
    has_graph_content = bool(node_ids) or bool(graph_snippets)
    if section_lower in ("related work", "results") and has_graph_content and word_count < 50:
        raise ValueError(
            f"Section {name} is empty or too short ({word_count} words) despite graph content — cannot continue."
        )

    section_path = sections_dir / f"{safe_name}.tex"
    if word_count < 10:
        raise ValueError(f"Section {name} failed — {word_count} words after fallback.")
    section_path.write_text(content, encoding="utf-8")

    contract.mark_satisfied(content, name)

    await store_memory(
        f"section: {name}\n{content}",
        req.work_id,
        custom_id=f"gen_{gen_id}_{safe_name}",
        metadata={"type": "writer", "generationId": gen_id, "workId": req.work_id, "section": name},
    )
    await wait_for_searchable(req.work_id, f"section: {name}", timeout_s=15)
    await _emit_memory(
        on_event, req.work_id, "store",
        f"Stored {name} draft in Supermemory",
        section=name, preview=content[:500],
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

    copied_figures, figure_warnings = copy_figure_assets(req.graph, str(output_dir), settings.storage_path)
    for warn in figure_warnings:
        await _emit(on_event, "Commander", "feedback", warn, {"phase": "body_sections", "figure_warning": True})
    generated_figures = generate_charts_from_graph(
        req.graph, str(output_dir), settings.storage_path
    )
    if generated_figures:
        await _emit(
            on_event, "Commander", "completed",
            f"Generated {len(generated_figures)} chart(s) from data nodes",
            {"phase": "body_sections", "generated_figures": [g["path"] for g in generated_figures]},
        )
    latex_blocks_by_section = build_section_latex_blocks(
        graph_ctx, copied_figures, generated_figures, settings.storage_path
    )
    all_figure_paths = copied_figures + [g["path"] for g in generated_figures]

    total_words = 0
    discovered_refs: list[dict[str, Any]] = []
    contract = GraphContract.from_graph(req.graph)

    await _emit(
        on_event, "Commander", "agent", "CommanderAgent: Starting paper generation pipeline",
        {"phase": "planning", "workflow_stage": "start"},
    )

    memory_ctx = await context_for_work(req.work_id, query=paper_title)
    if memory_ctx:
        await _emit_memory(
            on_event, req.work_id, "profile",
            "Loaded work and user profile from Supermemory",
            query=paper_title, preview=memory_ctx,
        )

    plan = None
    if enable_planning:
        await _emit(
            on_event, "Planner", "searching",
            f"Searching references for: {paper_title}",
            {"phase": "reference_discovery", "search_query": paper_title},
        )
        plan_result = await plan_paper(
            PlanRequest(
                graph=req.graph,
                work_id=req.work_id,
                query=paper_title,
                graph_context=graph_ctx_dict,
                memory_context=memory_ctx or "",
            )
        )
        plan = plan_result.model_dump()
        discovered_refs = plan_result.discovered_refs
        contract = GraphContract.from_graph(req.graph, discovered_refs)

        if not plan_result.sections:
            raise ValueError("Planner returned zero sections — cannot continue.")

        await _emit(
            on_event, "Planner", "found",
            f"Found {len(discovered_refs)} references via {plan_result.search_source}",
            {
                "phase": "reference_discovery",
                "search_query": plan_result.search_query,
                "source": plan_result.search_source,
                "count": len(discovered_refs),
                "discovered_refs": discovered_refs,
            },
        )
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
        await _emit_memory(
            on_event, req.work_id, "store",
            "Stored planner output in Supermemory",
            preview=json.dumps(plan)[:500],
        )

    sections = (plan or {}).get("sections") or [
        {"name": "Abstract", "paragraphs": 1, "target_words": 250},
        {"name": "Introduction", "paragraphs": 4, "target_words": 800},
        {"name": "Methods", "paragraphs": 5, "target_words": 900},
        {"name": "Results", "paragraphs": 4, "target_words": 900},
        {"name": "Discussion", "paragraphs": 4, "target_words": 800},
        {"name": "Conclusion", "paragraphs": 2, "target_words": 300},
    ]
    sections = _ensure_academic_sections(sections, graph_ctx_dict)

    await store_memory(
        contract.summary(),
        req.work_id,
        custom_id=f"gen_{gen_id}_contract",
        metadata={"type": "graph", "generationId": gen_id, "workId": req.work_id},
    )
    await _emit_memory(
        on_event, req.work_id, "store",
        f"Stored GraphContract ({len(contract.obligations)} nodes)",
        preview=contract.summary()[:500],
    )

    section_word_counts: dict[str, int] = {}
    section_files: dict[str, str] = {}

    write_kwargs = dict(
        gen_id=gen_id,
        req=req,
        on_event=on_event,
        graph_ctx=graph_ctx,
        graph_ctx_dict=graph_ctx_dict,
        contract=contract,
        plan=plan,
        paper_title=paper_title,
        memory_ctx=memory_ctx,
        discovered_refs=discovered_refs,
        copied_figures=all_figure_paths,
        style=style,
        target_pages=target_pages,
        total_sections=len(sections),
        enable_review=enable_review,
        max_reviews=max_reviews,
        sections_dir=sections_dir,
        latex_blocks_by_section=latex_blocks_by_section,
    )

    completed_sections: list[str] = []
    for section in sections:
        name, word_count = await _write_section(
            section=section, prior_section_names=completed_sections, **write_kwargs
        )
        completed_sections.append(name)
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

    validation = contract.validate()
    if not validation["passed"]:
        await _emit(
            on_event, "Commander", "agent",
            f"Graph contract: {validation['satisfied']}/{validation['total']} nodes satisfied; re-drafting",
            {"phase": "body_sections", "unsatisfied": validation["unsatisfied_nodes"][:5]},
        )
        for node_info in validation["unsatisfied_nodes"][:3]:
            sec_name = node_info["section"]
            sec = next((s for s in sections if s.get("name") == sec_name), None)
            if not sec:
                continue
            boosted = dict(sec)
            boosted["graph_node_ids"] = [node_info["id"]]
            boosted["target_words"] = int(_section_budget(sec, len(sections), target_pages) * 1.2)
            name, word_count = await _write_section(section=boosted, **write_kwargs)
            old = section_word_counts.get(name, 0)
            total_words += word_count - old
            section_word_counts[name] = word_count
            section_files[name] = (sections_dir / f"{name.replace(' ', '_')}.tex").read_text(encoding="utf-8")

    bib_content = build_bibtex_entries(discovered_refs, req.graph, req.library_bib)
    if not bib_content.strip():
        bib_content = "@article{placeholder2024, title={Placeholder Reference}, year={2024}}\n"
    (output_dir / "references.bib").write_text(bib_content, encoding="utf-8")

    cite_verify = await verify_citations(
        CitationVerifyRequest(
            section_contents=section_files,
            bib_content=bib_content,
            required_keys=contract.required_cite_keys(),
            literature_keys=contract.literature_keys,
        )
    )
    await _emit(
        on_event, "CitationVerifier", "completed" if cite_verify.passed else "feedback",
        cite_verify.report,
        {
            "phase": "review",
            "uncovered_bib_keys": cite_verify.uncovered_bib_keys[:10],
            "uncovered_literature": cite_verify.uncovered_literature,
        },
    )

    if not cite_verify.passed and cite_verify.thinnest_section:
        thinnest = cite_verify.thinnest_section
        sec = next((s for s in sections if s.get("name") == thinnest), None)
        if sec:
            uncovered = cite_verify.uncovered_bib_keys + cite_verify.uncovered_literature
            boosted = dict(sec)
            boosted["outline"] = list(sec.get("outline") or []) + [
                f"Cite these references: {', '.join(uncovered[:8])}"
            ]
            name, word_count = await _write_section(section=boosted, **write_kwargs)
            old = section_word_counts.get(name, 0)
            total_words += word_count - old
            section_word_counts[name] = word_count
            section_files[name] = (sections_dir / f"{name.replace(' ', '_')}.tex").read_text(encoding="utf-8")

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
        if not path.exists() or path.stat().st_size < 20:
            raise ValueError(f"Missing or empty section file: {safe_name}.tex")

    main_tex = _build_main_tex(paper_title, venue_style, list(section_files.keys()))
    (output_dir / "main.tex").write_text(main_tex, encoding="utf-8")

    pdf_path = None
    if compile_pdf:
        await _emit(
            on_event, "Typesetter", "typesetting", "Compiling LaTeX to PDF",
            {"phase": "typesetting", "workflow_stage": "typesetting"},
        )
        compile_result = await compile_latex(
            CompileRequest(project_dir=str(output_dir), main_file="main.tex")
        )
        pdf_path = compile_result.pdf_path
        if compile_result.success:
            await _emit(on_event, "Typesetter", "completed", "PDF compiled successfully",
                        {"phase": "typesetting"})
        else:
            await _emit(on_event, "Typesetter", "feedback", "PDF compilation had warnings",
                        {"phase": "typesetting"})
        if pdf_path:
            vlm = await review_pdf(VlmReviewRequest(pdf_path=pdf_path, target_pages=target_pages))
            await store_memory(
                json.dumps({"passed": vlm.passed, "issues": vlm.issues}),
                req.work_id,
                custom_id=f"gen_{gen_id}_vlm",
                metadata={"type": "vlm_review", "generationId": gen_id, "workId": req.work_id},
            )
            await _emit_memory(
                on_event, req.work_id, "store",
                f"Stored VLM review in memory ({'passed' if vlm.passed else 'issues'})",
                section="review",
                preview=json.dumps(vlm.issues[:2]) if vlm.issues else "passed",
            )
            await _emit(
                on_event, "VLMReview", "completed" if vlm.passed else "feedback",
                f"VLM review: {'passed' if vlm.passed else 'issues found'}",
                {"phase": "review", "issues": vlm.issues[:3] if vlm.issues else []},
            )

    final_validation = contract.validate()
    await store_memory(
        f"Generation {gen_id} complete: {total_words} words, title: {paper_title}",
        req.work_id,
        custom_id=f"gen_{gen_id}_complete",
        metadata={"type": "generation_complete", "generationId": gen_id, "workId": req.work_id},
    )
    await _emit_memory(
        on_event, req.work_id, "store",
        f"Stored generation summary ({total_words} words)",
        section="complete",
        preview=f"{final_validation['satisfied']}/{final_validation['total']} graph nodes satisfied",
    )
    await _emit(
        on_event, "Commander", "completed",
        f"Paper generation complete ({total_words} words, {final_validation['satisfied']}/{final_validation['total']} graph nodes)",
        {"workflow_stage": "complete", "word_count": total_words, "graph_validation": final_validation},
    )

    status = "completed" if (pdf_path or not compile_pdf) else "completed_with_warnings"
    return GenerateResponse(
        generation_id=gen_id,
        status=status,
        output_dir=str(output_dir),
        pdf_path=pdf_path,
        word_count=total_words,
    )
