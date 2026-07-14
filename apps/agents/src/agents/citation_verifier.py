"""Citation verifier — ensure all bib keys are cited and literature nodes covered."""

from __future__ import annotations

import re
from typing import Any

from pydantic import BaseModel, Field


class CitationVerifyRequest(BaseModel):
    section_contents: dict[str, str]
    bib_content: str
    required_keys: list[str] = Field(default_factory=list)
    literature_keys: list[str] = Field(default_factory=list)


class CitationVerifyResponse(BaseModel):
    passed: bool
    cited_keys: list[str]
    uncovered_bib_keys: list[str]
    uncovered_literature: list[str]
    thinnest_section: str | None
    report: str


def _extract_cited_keys(section_contents: dict[str, str]) -> set[str]:
    cited: set[str] = set()
    for content in section_contents.values():
        for match in re.findall(r"\\cite\{([^}]+)\}", content):
            for key in match.split(","):
                cited.add(key.strip())
    return cited


def _extract_bib_keys(bib_content: str) -> set[str]:
    return set(re.findall(r"@\w+\{([^,\s]+)", bib_content))


async def verify_citations(req: CitationVerifyRequest) -> CitationVerifyResponse:
    cited = _extract_cited_keys(req.section_contents)
    bib_keys = _extract_bib_keys(req.bib_content)
    all_required = set(req.required_keys) | bib_keys

    uncovered_bib = sorted(k for k in all_required if k not in cited)
    uncovered_lit = sorted(k for k in req.literature_keys if k not in cited)

    thinnest = None
    min_words = 999999
    for name, content in req.section_contents.items():
        wc = len(content.split())
        if wc < min_words:
            min_words = wc
            thinnest = name

    passed = not uncovered_bib and not uncovered_lit
    report_parts = [
        f"Cited {len(cited)} keys across {len(req.section_contents)} sections.",
        f"Bib entries: {len(bib_keys)}, uncovered: {len(uncovered_bib)}.",
    ]
    if uncovered_bib:
        report_parts.append(f"Uncovered bib keys: {', '.join(uncovered_bib[:15])}")
    if uncovered_lit:
        report_parts.append(f"Uncovered literature: {', '.join(uncovered_lit)}")

    return CitationVerifyResponse(
        passed=passed,
        cited_keys=sorted(cited),
        uncovered_bib_keys=uncovered_bib,
        uncovered_literature=uncovered_lit,
        thinnest_section=thinnest,
        report=" ".join(report_parts),
    )
