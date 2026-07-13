from datetime import datetime, timezone
from typing import Any

AGENT_REGISTRY = [
    {
        "id": "paper-parser",
        "name": "Paper Parser",
        "description": "Research paper understanding and parsing agent.",
        "endpoints": 1,
    },
    {
        "id": "template-parser",
        "name": "Template Parser",
        "description": "Parses LaTeX template packages to extract format rules and structure.",
        "endpoints": 1,
    },
    {
        "id": "commander",
        "name": "Commander",
        "description": "Orchestrates paper writing by assembling context and compiling prompts for content generation.",
        "endpoints": 2,
    },
    {
        "id": "writer",
        "name": "Writer",
        "description": "Generates LaTeX content with iterative review for academic quality.",
        "endpoints": 2,
    },
    {
        "id": "typesetter",
        "name": "Typesetter",
        "description": "Handles resource fetching, template injection, and LaTeX compilation with self-healing.",
        "endpoints": 1,
    },
    {
        "id": "metadata",
        "name": "Metadata",
        "description": "MetaData-based paper generation (Simple Mode) - generates complete papers from 5 natural language fields + BibTeX references.",
        "endpoints": 4,
    },
    {
        "id": "reviewer",
        "name": "Reviewer",
        "description": "Reviews paper content and provides feedback for logical consistency and style.",
        "endpoints": 2,
    },
    {
        "id": "planner",
        "name": "Planner",
        "description": "Creates detailed paragraph-level paper plans and discovers references via Semantic Scholar.",
        "endpoints": 2,
    },
    {
        "id": "vlm-review",
        "name": "Vlm Review",
        "description": "VLM-based PDF review agent for page overflow, underfill, and layout detection",
        "endpoints": 3,
    },
]


def get_agent_health() -> list[dict[str, Any]]:
    now = datetime.now(timezone.utc).isoformat()
    return [
        {
            "id": a["id"],
            "name": a["name"],
            "description": a["description"],
            "status": "online",
            "endpoints": a["endpoints"],
            "lastActive": "Just now",
            "lastSeenAt": now,
        }
        for a in AGENT_REGISTRY
    ]
