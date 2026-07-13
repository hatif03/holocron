import asyncio
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Awaitable

from pydantic import BaseModel

from ..config import settings
from ..agents.planner import PlanRequest, plan_paper
from ..agents.writer import DraftRequest, draft_section
from ..agents.reviewer import ReviewRequest, review_section
from ..agents.typesetter import CompileRequest, compile_latex
from ..agents.vlm_review import VlmReviewRequest, review_pdf

EventCallback = Callable[[str, str, str, dict], Awaitable[None]]


class GenerateRequest(BaseModel):
    generation_id: str
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


async def run_generation(
    req: GenerateRequest,
    on_event: EventCallback | None = None,
) -> GenerateResponse:
    gen_id = req.generation_id
    config = req.config
    style = config.get("styleGuide", "Nature")
    max_reviews = config.get("maxReviewIterations", 3)
    enable_review = config.get("enableReviewLoop", True)
    enable_planning = config.get("enablePlanning", True)

    output_dir = Path(settings.storage_path) / "generations" / gen_id
    output_dir.mkdir(parents=True, exist_ok=True)
    sections_dir = output_dir / "sections"
    sections_dir.mkdir(exist_ok=True)

    total_words = 0

    await _emit(on_event, "Commander", "agent", "CommanderAgent: Starting paper generation pipeline")

    plan = None
    if enable_planning:
        await _emit(on_event, "Planner", "writing", "PlannerAgent: Building outline and discovering references")
        plan_result = await plan_paper(PlanRequest(graph=req.graph))
        plan = plan_result.model_dump()
        await _emit(
            on_event,
            "Planner",
            "completed",
            f"Plan created with {len(plan_result.sections)} sections",
            {"search_query": plan_result.search_query, "refs": len(plan_result.discovered_refs)},
        )

    sections = (plan or {}).get("sections") or [
        {"name": "Abstract"},
        {"name": "Introduction"},
        {"name": "Methods"},
        {"name": "Results"},
        {"name": "Discussion"},
    ]

    section_files: dict[str, str] = {}

    for section in sections:
        name = section.get("name", "Section")
        safe_name = name.replace(" ", "_")
        await _emit(on_event, "Writer", "writing", f"WriterAgent: Generating {name} section")

        draft = await draft_section(
            DraftRequest(
                section_name=name,
                context={"graph": req.graph, "plan": plan, "title": req.title},
                style_guide=style,
            )
        )
        content = draft.content

        if enable_review:
            for i in range(max_reviews):
                await _emit(on_event, "Reviewer", "agent", f"ReviewerAgent: Review round {i + 1} for {name}")
                review = await review_section(
                    ReviewRequest(section_name=name, content=content, style_guide=style)
                )
                if review.approved:
                    await _emit(on_event, "Reviewer", "completed", f"Review passed for {name}")
                    break
                if review.revised_content:
                    content = review.revised_content

        section_path = sections_dir / f"{safe_name}.tex"
        section_path.write_text(content, encoding="utf-8")
        section_files[name] = content
        total_words += draft.word_count
        await _emit(
            on_event,
            "Writer",
            "completed",
            f"Generated {name} ({draft.word_count} words)",
            {"word_count": draft.word_count},
        )

    # Write main.tex
    main_tex = _build_main_tex(req.title, style, list(section_files.keys()))
    main_path = output_dir / "main.tex"
    main_path.write_text(main_tex, encoding="utf-8")

    # Write references.bib
    bib_path = output_dir / "references.bib"
    bib_path.write_text("@article{placeholder2024, title={Placeholder Reference}, year={2024}}\n")

    await _emit(on_event, "Typesetter", "writing", "TypesetterAgent: Compiling LaTeX to PDF")
    compile_result = await compile_latex(
        CompileRequest(project_dir=str(output_dir), main_file="main.tex")
    )

    pdf_path = compile_result.pdf_path
    if compile_result.success:
        await _emit(on_event, "Typesetter", "completed", "PDF compiled successfully")
    else:
        await _emit(on_event, "Typesetter", "agent", f"Compile issues: {compile_result.log[:200]}")

    await _emit(on_event, "Vlm Review", "agent", "VlmReviewAgent: Visual layout review of PDF")
    if pdf_path:
        vlm = await review_pdf(VlmReviewRequest(pdf_path=pdf_path, target_pages=config.get("targetPages", 10)))
        if vlm.passed:
            await _emit(on_event, "Vlm Review", "completed", "Layout review passed")
        else:
            await _emit(
                on_event,
                "Vlm Review",
                "agent",
                f"Layout issues found: {len(vlm.issues)}",
                {"issues": vlm.issues},
            )

    await _emit(on_event, "Commander", "completed", f"Paper generation complete ({total_words} words total)")

    return GenerateResponse(
        generation_id=gen_id,
        status="completed" if pdf_path else "completed_with_warnings",
        output_dir=str(output_dir),
        pdf_path=pdf_path,
        word_count=total_words,
    )


def _build_main_tex(title: str, style: str, sections: list[str]) -> str:
    doc_class = "article"
    lines = [
        f"\\documentclass[{ 'twocolumn' if style == 'Nature' else ''}]{{{doc_class}}}",
        "\\usepackage{graphicx}",
        "\\usepackage{amsmath}",
        "\\usepackage{hyperref}",
        "\\title{" + title.replace("_", "\\_") + "}",
        "\\author{AcademicHub Generated}",
        "\\begin{document}",
        "\\maketitle",
    ]
    for section in sections:
        safe = section.replace(" ", "_")
        lines.append(f"\\input{{sections/{safe}.tex}}")
    lines.append("\\bibliographystyle{plain}")
    lines.append("\\bibliography{references}")
    lines.append("\\end{document}")
    return "\n".join(lines) + "\n"
