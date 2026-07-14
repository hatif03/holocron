"""Google Scholar search with in-memory cache and graceful degradation."""

from __future__ import annotations

import asyncio
import time
from typing import Any

_cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}
_CACHE_TTL = 300.0
_CACHE_MAX = 50


def _normalize_pub(pub: dict[str, Any], index: int) -> dict[str, Any]:
    bib = pub.get("bib", {}) or {}
    authors = bib.get("author", [])
    if isinstance(authors, str):
        authors = [a.strip() for a in authors.split(" and ") if a.strip()]

    pub_url = pub.get("pub_url") or pub.get("eprint_url") or ""
    title = bib.get("title") or pub.get("title") or "Untitled"
    year_raw = bib.get("pub_year")
    year = int(year_raw) if year_raw and str(year_raw).isdigit() else None

    return {
        "id": str(pub.get("author_pub_id") or pub.get("citedby_url") or f"scholar_{index}"),
        "title": title,
        "authors": authors if isinstance(authors, list) else [],
        "year": year,
        "abstract": bib.get("abstract", "") or "",
        "url": pub_url,
        "source": "google_scholar",
        "doi": "",
    }


def _search_sync(query: str, limit: int) -> list[dict[str, Any]]:
    from scholarly import scholarly

    results: list[dict[str, Any]] = []
    search_query = scholarly.search_pubs(query)
    for i, pub in enumerate(search_query):
        if i >= limit:
            break
        try:
            results.append(_normalize_pub(pub, i))
        except Exception:
            continue
    return results


async def search_google_scholar(query: str, limit: int = 10) -> dict[str, Any]:
    key = f"{query.strip().lower()}:{limit}"
    now = time.time()
    cached = _cache.get(key)
    if cached and now - cached[0] < _CACHE_TTL:
        return {"data": cached[1], "cached": True}

    try:
        results = await asyncio.wait_for(
            asyncio.to_thread(_search_sync, query, min(limit, 10)),
            timeout=25.0,
        )
        if len(_cache) >= _CACHE_MAX:
            oldest = min(_cache, key=lambda k: _cache[k][0])
            del _cache[oldest]
        _cache[key] = (now, results)
        return {"data": results, "cached": False}
    except Exception as e:
        return {"data": [], "error": str(e)}
