import json
from typing import Any

from pydantic import BaseModel, Field

from ..llm import llm


class DraftRequest(BaseModel):
    section_name: str
    context: dict[str, Any]
    style_guide: str = "Nature"
    target_words: int = 400
    paragraphs: int = 3
    outline: list[str] = Field(default_factory=list)
    graph_snippets: list[str] = Field(default_factory=list)
    figures: list[str] = Field(default_factory=list)
    latex_blocks: str = ""
    experiment_flow: str = ""
    bib_keys: list[str] = Field(default_factory=list)


class DraftResponse(BaseModel):
    content: str
    word_count: int


async def draft_section(req: DraftRequest) -> DraftResponse:
    content = await _generate_draft(req, expand=False)
    word_count = len(content.split())
    min_accept = int(req.target_words * 0.7)
    if word_count < min_accept:
        content = await _generate_draft(req, expand=True, prior=content)
        word_count = len(content.split())
    return DraftResponse(content=content, word_count=word_count)


async def _generate_draft(
    req: DraftRequest, expand: bool = False, prior: str = ""
) -> str:
    section_lower = req.section_name.lower()
    is_abstract = section_lower == "abstract"
    header_hint = (
        "Use \\begin{abstract}...\\end{abstract} (no \\section header)."
        if is_abstract
        else f"Use \\section{{{req.section_name}}} as the section header."
    )
    cite_hint = ""
    if req.bib_keys:
        if section_lower in ("related work", "related_work"):
            lit_keys = [k for k in req.bib_keys if k.startswith("lit")]
            cite_hint = (
                f" You MUST cite every literature node: {', '.join(lit_keys)}. "
                f"Use \\cite{{{', '.join(lit_keys)}}} throughout."
            )
        elif section_lower == "introduction":
            cite_hint = (
                f" Cite at least 3 references using keys: {', '.join(req.bib_keys[:8])}. "
                "Include \\cite{} for discovered and literature sources."
            )
        elif section_lower == "results":
            cite_hint = (
                " Include all figure/table/equation LaTeX blocks provided verbatim — "
                "do not paraphrase or omit them. "
                f"Cite supporting refs: {', '.join(req.bib_keys[:6])}."
            )
        elif section_lower == "methods":
            cite_hint = (
                " Include all code/verbatim LaTeX blocks provided verbatim in the Methods section. "
                f"Cite methods literature: {', '.join(req.bib_keys[:6])}."
            )
        else:
            cite_hint = (
                f" Cite using these BibTeX keys: {', '.join(req.bib_keys[:12])}. "
                "Include at least 2 \\cite{} references where appropriate."
            )
    system = (
        f"You are the Writer agent. Generate LaTeX for the {req.section_name} section "
        f"of a {req.style_guide} academic paper following IMRaD conventions. "
        f"Target approximately {req.target_words} words in {req.paragraphs} paragraphs. "
        f"Ground all claims in the provided graph context — do not invent unsupported results. "
        f"{header_hint} "
        f"Output only valid LaTeX (no markdown fences).{cite_hint}"
    )
    if expand:
        system += (
            f" The prior draft was too short. Expand to at least {req.target_words} words "
            "with additional graph-derived detail and citations."
        )

    user_parts = [
        f"Section: {req.section_name}",
        f"Target words: {req.target_words}",
    ]
    if req.experiment_flow:
        user_parts.append(f"Experiment flow: {req.experiment_flow}")
    if req.outline:
        user_parts.append("Outline:\n" + "\n".join(f"- {o}" for o in req.outline))
    if req.graph_snippets:
        user_parts.append("Graph context:\n" + "\n".join(req.graph_snippets[:25]))
    if req.latex_blocks:
        user_parts.append(
            "Include these LaTeX blocks verbatim in the section (do not modify or omit):\n"
            + req.latex_blocks
        )
    if req.figures:
        user_parts.append("Figures to include:\n" + "\n".join(req.figures))
    memory = req.context.get("memory")
    if memory:
        user_parts.append(f"Work/user memory (recall — follow this guidance):\n{memory}")
    section_memory = req.context.get("section_memory")
    if section_memory:
        user_parts.append(f"Recalled for this section:\n{section_memory}")
    prior_memory = req.context.get("prior_sections_memory")
    if prior_memory:
        user_parts.append(f"Prior section drafts from Supermemory:\n{prior_memory}")
    user_parts.append(f"Full context:\n{json.dumps(req.context, indent=2)}")
    if expand and prior:
        user_parts.append(f"Prior draft to expand:\n{prior}")

    user = "\n\n".join(user_parts)
    content = await llm.complete(system, user, max_tokens=8192)
    word_count = len(content.split())
    if word_count < 50 and req.graph_snippets:
        bib_cites = " ".join(f"\\cite{{{k}}}" for k in req.bib_keys[:8])
        fallback = (
            (
                f"\\begin{{abstract}}\n"
                + "\n\n".join(req.graph_snippets[:8])
                + "\n\\end{abstract}\n"
            )
            if is_abstract
            else (
                f"\\section{{{req.section_name}}}\n"
                + "\n\n".join(req.graph_snippets[:8])
            )
            + (f"\n\nPrior work: {bib_cites}" if bib_cites else "")
            + (f"\n\n{req.latex_blocks}" if req.latex_blocks else "")
        )
        return fallback
    return content
