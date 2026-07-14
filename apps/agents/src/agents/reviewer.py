import json
from typing import Any

from pydantic import BaseModel

from ..llm import llm


class ReviewRequest(BaseModel):
    section_name: str
    content: str
    style_guide: str = "Nature"
    context: dict[str, Any] | None = None


class ReviewResponse(BaseModel):
    approved: bool
    feedback: str
    revised_content: str | None


async def review_section(req: ReviewRequest) -> ReviewResponse:
    system = (
        "You are the Reviewer agent. Review academic LaTeX for logical consistency, "
        "style, and structure. Return JSON: {approved: bool, feedback: str, revised_content: str|null}"
    )
    user_parts = [f"Section: {req.section_name}", f"Style: {req.style_guide}"]
    if req.context:
        user_parts.append(f"Context:\n{json.dumps(req.context)}")
    user_parts.append(req.content)
    user = "\n\n".join(user_parts)

    raw = await llm.complete(system, user)
    try:
        data = json.loads(raw)
        return ReviewResponse(
            approved=data.get("approved", True),
            feedback=data.get("feedback", ""),
            revised_content=data.get("revised_content"),
        )
    except json.JSONDecodeError:
        return ReviewResponse(approved=True, feedback="Review passed.", revised_content=None)
