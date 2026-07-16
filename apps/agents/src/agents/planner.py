import json

from typing import Any



import httpx

from pydantic import BaseModel



from ..config import settings

from ..llm import llm

from ..orchestrator.graph_context import derive_query_from_graph, extract_graph_context

from ..supermemory_client import search_work





class PlanRequest(BaseModel):

    graph: dict[str, Any]

    query: str = ""

    work_id: str = ""

    graph_context: dict[str, Any] | None = None

    memory_context: str = ""


class PlanResponse(BaseModel):

    sections: list[dict[str, Any]]

    discovered_refs: list[dict[str, Any]]

    search_query: str

    search_source: str = "semantic_scholar"





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





async def search_arxiv(query: str, limit: int = 5) -> list[dict]:

    import xml.etree.ElementTree as ET

    from urllib.parse import quote



    search_query = f"all:{query}"

    url = (

        f"https://export.arxiv.org/api/query?"

        f"search_query={quote(search_query)}&start=0&max_results={limit}"

    )

    try:

        async with httpx.AsyncClient(timeout=30) as client:

            resp = await client.get(url)

            if resp.status_code != 200:

                return []

            root = ET.fromstring(resp.text)

            ns = {"atom": "http://www.w3.org/2005/Atom"}

            results = []

            for entry in root.findall("atom:entry", ns):

                title = (entry.find("atom:title", ns).text or "").strip()

                summary = (entry.find("atom:summary", ns).text or "").strip()

                id_el = entry.find("atom:id", ns)

                link = id_el.text if id_el is not None else ""

                arxiv_id = link.split("/abs/")[-1].split("v")[0] if link else ""

                authors = [

                    a.find("atom:name", ns).text

                    for a in entry.findall("atom:author", ns)

                    if a.find("atom:name", ns) is not None

                ]

                published = entry.find("atom:published", ns)

                year = None

                if published is not None and published.text:

                    year = int(published.text[:4])

                results.append(

                    {

                        "paperId": arxiv_id,

                        "title": title,

                        "year": year,

                        "authors": authors,

                        "abstract": summary,

                        "pdfUrl": f"https://arxiv.org/pdf/{arxiv_id}.pdf" if arxiv_id else "",

                        "source": "arxiv",

                    }

                )

            return results

    except Exception:

        return []





def _merge_paper_sections(
    sections: list[dict[str, Any]], graph_ctx_dict: dict[str, Any]
) -> list[dict[str, Any]]:
    merged = list(sections)
    seen = {str(s.get("name", "")).lower() for s in merged}
    for ps in graph_ctx_dict.get("paper_sections") or []:
        name = str(ps.get("section_name") or "").strip()
        if not name or name.lower() in seen:
            continue
        outline_raw = ps.get("outline") or ""
        outline = [line.strip("- ").strip() for line in str(outline_raw).split("\n") if line.strip()]
        merged.append(
            {
                "name": name,
                "paragraphs": max(2, len(outline) or 3),
                "outline": outline,
                "target_words": 400,
                "graph_node_ids": [ps.get("id")],
            }
        )
        seen.add(name.lower())
    return merged


SECTION_DEFAULTS: dict[str, dict[str, Any]] = {
    "abstract": {"paragraphs": 1, "target_words": 250},
    "introduction": {"paragraphs": 4, "target_words": 800},
    "related work": {"paragraphs": 3, "target_words": 600},
    "methods": {"paragraphs": 5, "target_words": 900},
    "results": {"paragraphs": 4, "target_words": 900},
    "discussion": {"paragraphs": 4, "target_words": 800},
    "conclusion": {"paragraphs": 2, "target_words": 300},
}


def _node_ids_for_section(name: str, graph_ctx_dict: dict[str, Any]) -> list[str]:
    key = name.lower()
    mapping = {
        "abstract": ["ideation", "findings"],
        "introduction": ["ideation", "literature", "concepts"],
        "related work": ["literature", "concepts"],
        "methods": ["methods", "experiments", "data_sources"],
        "results": ["results", "metrics", "findings", "figures", "tables"],
        "discussion": ["findings", "concepts", "ideation"],
        "conclusion": ["findings", "ideation"],
    }
    groups = mapping.get(key, [])
    ids: list[str] = []
    for g in groups:
        for item in graph_ctx_dict.get(g) or []:
            nid = item.get("id")
            if nid:
                ids.append(str(nid))
    return ids


def _ensure_academic_sections(
    sections: list[dict[str, Any]], graph_ctx_dict: dict[str, Any]
) -> list[dict[str, Any]]:
    """Ensure IMRaD outline with Related Work when literature nodes exist."""
    by_name: dict[str, dict[str, Any]] = {}
    for s in sections:
        name = str(s.get("name", "")).strip()
        if name:
            by_name[name.lower()] = s

    required = ["Abstract", "Introduction", "Methods", "Results", "Discussion", "Conclusion"]
    if graph_ctx_dict.get("literature"):
        required.insert(2, "Related Work")

    ordered: list[dict[str, Any]] = []
    for name in required:
        key = name.lower()
        if key in by_name:
            sec = dict(by_name[key])
        else:
            defaults = SECTION_DEFAULTS.get(key, {"paragraphs": 3, "target_words": 500})
            sec = {"name": name, **defaults, "outline": []}
        defaults = SECTION_DEFAULTS.get(key, {})
        if not sec.get("target_words"):
            sec["target_words"] = defaults.get("target_words", 500)
        if not sec.get("paragraphs"):
            sec["paragraphs"] = defaults.get("paragraphs", 3)
        if not sec.get("graph_node_ids"):
            sec["graph_node_ids"] = _node_ids_for_section(name, graph_ctx_dict)
        ordered.append(sec)

    seen = {s["name"].lower() for s in ordered}
    for s in sections:
        name = str(s.get("name", "")).strip()
        if name and name.lower() not in seen:
            ordered.append(s)
            seen.add(name.lower())
    return ordered





async def plan_paper(req: PlanRequest) -> PlanResponse:

    graph_ctx = extract_graph_context(req.graph)

    graph_ctx_dict = req.graph_context or graph_ctx.to_dict()

    query = req.query or derive_query_from_graph(req.graph)



    local_context = ""

    if req.work_id:

        local_context = await search_work(req.work_id, query, limit=5)



    refs = await search_semantic_scholar(query)

    ref_source = "semantic_scholar"

    if not refs:

        refs = await search_arxiv(query)

        ref_source = "arxiv"



    system = (
        "You are the Planner agent. Create a detailed paragraph-level paper outline from a "
        "structured research graph following IMRaD academic structure. Derive sections from "
        "graph evidence: Introduction must cite literature nodes; Methods must reflect "
        "method/experiment/data nodes in topological flow order; Results must include "
        "findings/metrics/figures/tables. Include Related Work when literature nodes exist. "
        "Return JSON with sections array where each section has "
        "name, paragraphs, outline (string array), target_words, graph_node_ids."
    )
    flow = graph_ctx.flow_summary()
    user_parts = [
        f"Structured graph context:\n{json.dumps(graph_ctx_dict, indent=2)}",
        f"Search query: {query}",
    ]
    if flow:
        user_parts.append(f"Experiment flow (topological order): {flow}")

    if req.memory_context:
        user_parts.append(
            f"Work and user profile from Supermemory (use for outline and tone):\n{req.memory_context}"
        )

    if local_context:

        user_parts.append(f"Prior research from user's library:\n{local_context}")

    if refs:

        user_parts.append(

            f"{ref_source.replace('_', ' ').title()} results:\n{json.dumps(refs[:5], indent=2)}"

        )

    user = "\n\n".join(user_parts)



    raw = await llm.complete(system, user)

    try:

        plan = json.loads(raw)

        sections = plan.get("sections", [])

    except json.JSONDecodeError:

        sections = [
            {"name": "Abstract", "paragraphs": 1, "target_words": 250},
            {"name": "Introduction", "paragraphs": 4, "target_words": 800},
            {"name": "Methods", "paragraphs": 5, "target_words": 900},
            {"name": "Results", "paragraphs": 4, "target_words": 900},
            {"name": "Discussion", "paragraphs": 4, "target_words": 800},
            {"name": "Conclusion", "paragraphs": 2, "target_words": 300},
        ]

    sections = _merge_paper_sections(sections, graph_ctx_dict)
    sections = _ensure_academic_sections(sections, graph_ctx_dict)



    return PlanResponse(

        sections=sections,

        discovered_refs=refs,

        search_query=query,

        search_source=ref_source,

    )





def _derive_query(nodes: list) -> str:

    for node in nodes:

        data = node.get("data", {})

        if node.get("type") == "start" and data.get("paper_title"):

            return data["paper_title"]

        if node.get("type") in ("idea", "question", "hypothesis") and data.get("body"):

            return str(data["body"])[:200]

    return "academic research paper"

