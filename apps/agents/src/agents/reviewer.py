import json
import re
from typing import Any

from pydantic import BaseModel, Field

from ..llm import llm


class ReviewRequest(BaseModel):
    section_name: str
    content: str
    style_guide: str = "Nature"
    context: dict[str, Any] | None = None
    min_words: int = 200
    graph_snippets: list[str] = Field(default_factory=list)
    required_bib_keys: list[str] = Field(default_factory=list)
    contract_node_count: int = 0


class ReviewResponse(BaseModel):
    approved: bool
    feedback: str
    revised_content: str | None


def _uses_graph_content(content: str, snippets: list[str]) -> bool:
    """Check if section references graph-derived terms."""
    if not snippets:
        return False
    content_lower = content.lower()
    for snip in snippets[:8]:
        for part in snip.split(":")[1:] if ":" in snip else [snip]:
            words = part.strip().split()[:3]
            if words and any(w.lower() in content_lower for w in words if len(w) > 4):
                return True
    return "graph" in content_lower or "experiment" in content_lower


def _citation_coverage(content: str, required_keys: list[str]) -> float:
    if not required_keys:
        return 1.0
    cited: set[str] = set()
    for match in re.findall(r"\\cite\{([^}]+)\}", content):
        for k in match.split(","):
            cited.add(k.strip())
    if not cited:
        return 0.0
    covered = sum(1 for k in required_keys if k in cited)
    return covered / len(required_keys)


def _memory_prompt_blocks(context: dict[str, Any] | None) -> list[str]:
    if not context:
        return []
    blocks: list[str] = []
    memory = context.get("memory")
    if memory:
        blocks.append(f"Work/user memory:\n{memory}")
    review_mem = context.get("prior_review_memory")
    if review_mem:
        blocks.append(f"Prior review feedback from memory:\n{review_mem}")
    return blocks


async def review_section(req: ReviewRequest) -> ReviewResponse:
    word_count = len(req.content.split())
    section_lower = req.section_name.lower()

    if word_count < req.min_words:
        expand_prompt = (
            f"The {req.section_name} section has only {word_count} words but needs at least "
            f"{req.min_words}. Expand with more detail from the graph context while keeping "
            f"{req.style_guide} style. Return JSON with approved=false, feedback explaining "
            f"what to expand, and revised_content with the expanded LaTeX."
        )
        expand_user = expand_prompt + "\n\n" + req.content
        mem_blocks = _memory_prompt_blocks(req.context)
        if mem_blocks:
            expand_user = "\n\n".join(mem_blocks) + "\n\n" + expand_user
        raw = await llm.complete(
            "You are the Reviewer agent. Return JSON: {approved, feedback, revised_content}",
            expand_user,
        )
        try:
            data = json.loads(raw)
            revised = data.get("revised_content")
            rev_words = len(revised.split()) if revised else 0
            approved = bool(data.get("approved")) and rev_words >= req.min_words
            if not approved and rev_words >= req.min_words:
                approved = True
            return ReviewResponse(
                approved=approved,
                feedback=data.get("feedback", "Section too short."),
                revised_content=revised,
            )
        except json.JSONDecodeError:
            pass

    needs_graph = section_lower in ("methods", "results", "related work")
    has_contract_nodes = req.contract_node_count > 0 or bool(req.graph_snippets)
    if needs_graph and has_contract_nodes and not _uses_graph_content(req.content, req.graph_snippets):
        return ReviewResponse(
            approved=False,
            feedback="Section lacks graph-derived content. Reference methods, experiments, metrics, or findings from the research graph.",
            revised_content=None,
        )

    if section_lower in ("related work", "results") and has_contract_nodes and word_count < 50:
        return ReviewResponse(
            approved=False,
            feedback=f"{req.section_name} is too short ({word_count} words) for the graph content assigned to this section.",
            revised_content=None,
        )

    if req.required_bib_keys and _citation_coverage(req.content, req.required_bib_keys) < 0.5:
        missing = [k for k in req.required_bib_keys if k not in req.content]
        return ReviewResponse(
            approved=False,
            feedback=f"Insufficient citations. Include \\cite{{{', '.join(missing[:6])}}} from the graph literature.",
            revised_content=None,
        )

    system = (
        "You are the Reviewer agent. Review academic LaTeX for logical consistency, "
        "style, structure, and minimum length. Never approve sections below the minimum "
        "word count unless revised_content meets the threshold. "
        "Return JSON: {approved: bool, feedback: str, revised_content: str|null}"
    )
    user_parts = [
        f"Section: {req.section_name}",
        f"Style: {req.style_guide}",
        f"Words: {word_count}",
        f"Minimum words: {req.min_words}",
    ]
    if req.required_bib_keys:
        user_parts.append(f"Required citations: {', '.join(req.required_bib_keys[:12])}")
    user_parts.extend(_memory_prompt_blocks(req.context))
    if req.context:
        user_parts.append(f"Context:\n{json.dumps(req.context)}")
    user_parts.append(req.content)
    user = "\n\n".join(user_parts)

    raw = await llm.complete(system, user)
    try:
        data = json.loads(raw)
        revised = data.get("revised_content")
        final_words = len(revised.split()) if revised else word_count
        approved = bool(data.get("approved")) and final_words >= req.min_words
        if req.required_bib_keys and _citation_coverage(revised or req.content, req.required_bib_keys) < 0.3:
            approved = False
        return ReviewResponse(
            approved=approved,
            feedback=data.get("feedback", ""),
            revised_content=revised,
        )
    except json.JSONDecodeError:
        return ReviewResponse(approved=word_count >= req.min_words, feedback="Review passed.", revised_content=None)
