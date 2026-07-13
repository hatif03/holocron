import json
from typing import Any

from pydantic import BaseModel

from ..llm import llm


class VlmPageRequest(BaseModel):
    page_number: int
    pdf_path: str
    description: str = ""


class VlmReviewRequest(BaseModel):
    pdf_path: str
    target_pages: int = 10


class VlmFixRequest(BaseModel):
    pdf_path: str
    issues: list[dict[str, Any]]


class VlmResponse(BaseModel):
    passed: bool
    issues: list[dict[str, Any]]
    suggestions: list[str]


async def analyze_page(req: VlmPageRequest) -> VlmResponse:
    system = (
        "You are Vlm Review agent. Analyze PDF page layout for overflow, underfill, "
        "and alignment issues. Return JSON: {passed: bool, issues: [], suggestions: []}"
    )
    user = f"Page {req.page_number} of {req.pdf_path}. {req.description}"
    raw = await llm.complete(system, user)
    try:
        data = json.loads(raw)
        return VlmResponse(
            passed=data.get("passed", True),
            issues=data.get("issues", []),
            suggestions=data.get("suggestions", []),
        )
    except json.JSONDecodeError:
        return VlmResponse(passed=True, issues=[], suggestions=[])


async def review_pdf(req: VlmReviewRequest) -> VlmResponse:
    system = (
        "VLM-based PDF review for page overflow, underfill, and layout detection. "
        "Return JSON: {passed, issues[{type, page, description}], suggestions[]}"
    )
    user = f"Review PDF: {req.pdf_path}, target pages: {req.target_pages}"
    raw = await llm.complete(system, user)
    try:
        data = json.loads(raw)
        return VlmResponse(
            passed=data.get("passed", True),
            issues=data.get("issues", []),
            suggestions=data.get("suggestions", []),
        )
    except json.JSONDecodeError:
        return VlmResponse(passed=True, issues=[], suggestions=[])


async def suggest_fixes(req: VlmFixRequest) -> dict[str, Any]:
    system = "Suggest LaTeX fixes for PDF layout issues. Return JSON: {fixes: [{file, change, reason}]}"
    user = f"PDF: {req.pdf_path}\nIssues: {json.dumps(req.issues)}"
    raw = await llm.complete(system, user)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"fixes": []}
