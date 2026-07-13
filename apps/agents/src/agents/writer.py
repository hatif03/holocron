import json
from typing import Any

from pydantic import BaseModel

from ..llm import llm


class DraftRequest(BaseModel):
    section_name: str
    context: dict[str, Any]
    style_guide: str = "Nature"


class DraftResponse(BaseModel):
    content: str
    word_count: int


async def draft_section(req: DraftRequest) -> DraftResponse:
    system = (
        f"You are the Writer agent. Generate LaTeX content for the {req.section_name} section "
        f"following {req.style_guide} style guidelines. Output only valid LaTeX."
    )
    user = f"Context:\n{json.dumps(req.context, indent=2)}"
    content = await llm.complete(system, user)
    word_count = len(content.split())
    return DraftResponse(content=content, word_count=word_count)
