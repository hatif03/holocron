import json
from typing import Any

import httpx
from pydantic import BaseModel

from ..config import settings
from ..llm import llm


class PlanRequest(BaseModel):
    graph: dict[str, Any]
    query: str = ""


class PlanResponse(BaseModel):
    sections: list[dict[str, Any]]
    discovered_refs: list[dict[str, Any]]
    search_query: str


async def search_semantic_scholar(query: str, limit: int = 5) -> list[dict]:
    headers = {}
    if settings.semantic_scholar_api_key:
        headers["x-api-key"] = settings.semantic_scholar_api_key

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                "https://api.semanticscholar.org/graph/v1/paper/search",
                params={
                    "query": query,
                    "limit": limit,
                    "fields": "title,authors,year,abstract,externalIds,openAccessPdf",
                },
                headers=headers,
            )
            if resp.status_code == 200:
                data = resp.json()
                return [
                    {
                        "paperId": p.get("paperId"),
                        "title": p.get("title"),
                        "year": p.get("year"),
                        "authors": [a.get("name") for a in p.get("authors", [])],
                        "abstract": p.get("abstract", ""),
                        "pdfUrl": (p.get("openAccessPdf") or {}).get("url"),
                    }
                    for p in data.get("data", [])
                ]
    except Exception:
        pass
    return []


async def plan_paper(req: PlanRequest) -> PlanResponse:
    nodes = req.graph.get("nodes", [])
    query = req.query or _derive_query(nodes)

    refs = await search_semantic_scholar(query)

    system = "You are the Planner agent. Create a detailed paragraph-level paper outline from a research graph. Return JSON with sections array."
    user = f"Research graph:\n{json.dumps(req.graph, indent=2)}\n\nSearch query: {query}"

    raw = await llm.complete(system, user)
    try:
        plan = json.loads(raw)
        sections = plan.get("sections", [])
    except json.JSONDecodeError:
        sections = [
            {"name": "Abstract", "paragraphs": 1},
            {"name": "Introduction", "paragraphs": 3},
            {"name": "Methods", "paragraphs": 4},
            {"name": "Results", "paragraphs": 3},
            {"name": "Discussion", "paragraphs": 3},
        ]

    return PlanResponse(
        sections=sections,
        discovered_refs=refs,
        search_query=query,
    )


def _derive_query(nodes: list) -> str:
    for node in nodes:
        data = node.get("data", {})
        if node.get("type") == "start" and data.get("paper_title"):
            return data["paper_title"]
        if node.get("type") == "idea" and data.get("content"):
            return str(data["content"])[:200]
    return "academic research paper"
