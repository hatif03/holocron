"""Supermemory Local client — agent context layer (see docs/SUPERMEMORY.md)."""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

import httpx

from .config import settings

logger = logging.getLogger(__name__)

_settings_configured = False
_warned_unreachable = False

LOCAL_USER_ID = "00000000-0000-0000-0000-000000000001"
SEARCH_THRESHOLD = 0.3

FILTER_PROMPT = (
    "This is Holocron, a research paper generation app. "
    "containerTag is work_{workId} or user_{userId}. "
    "We store research context, literature references, agent planner/writer/reviewer "
    "outputs, and user preferences for academic writing."
)


def is_enabled() -> bool:
    key = (settings.supermemory_api_key or "").strip()
    return bool(key)


def _work_tag(work_id: str) -> str:
    return f"work_{work_id}"


def _user_tag(user_id: str = LOCAL_USER_ID) -> str:
    return f"user_{user_id}"


def get_client():
    if not is_enabled():
        return None
    try:
        from supermemory import Supermemory

        return Supermemory(
            api_key=settings.supermemory_api_key,
            base_url=settings.supermemory_api_url.rstrip("/"),
        )
    except Exception as e:
        logger.warning("Supermemory client unavailable: %s", e)
        return None


async def health_status() -> str:
    if not is_enabled():
        return "disabled"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{settings.supermemory_api_url.rstrip('/')}/health")
            if resp.status_code < 500:
                return "ok"
    except Exception:
        pass
    return "unreachable"


async def configure_settings_once() -> None:
    global _settings_configured
    if _settings_configured or not is_enabled():
        return
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.patch(
                f"{settings.supermemory_api_url.rstrip('/')}/v3/settings",
                headers={
                    "Authorization": f"Bearer {settings.supermemory_api_key}",
                    "Content-Type": "application/json",
                },
                json={"shouldLLMFilter": True, "filterPrompt": FILTER_PROMPT},
            )
            if resp.status_code < 300:
                _settings_configured = True
                logger.info("Supermemory settings configured")
            else:
                logger.warning("Supermemory settings PATCH failed: %s", resp.status_code)
    except Exception as e:
        logger.warning("Supermemory settings bootstrap failed: %s", e)


def _format_profile(profile_data: Any, search_results: Any = None) -> str:
    parts: list[str] = []
    profile = getattr(profile_data, "profile", None) or profile_data
    if profile:
        static = getattr(profile, "static", None) or profile.get("static", [])
        dynamic = getattr(profile, "dynamic", None) or profile.get("dynamic", [])
        if static:
            parts.append("Static profile:\n" + "\n".join(static))
        if dynamic:
            parts.append("Dynamic profile:\n" + "\n".join(dynamic))
    if search_results:
        results = getattr(search_results, "results", None) or search_results.get("results", [])
        memories = []
        for r in results:
            mem = getattr(r, "memory", None) or r.get("memory")
            chunk = getattr(r, "chunk", None) or r.get("chunk")
            if mem:
                memories.append(mem)
            elif chunk:
                memories.append(chunk)
        if memories:
            parts.append("Relevant memories:\n" + "\n".join(memories))
    return "\n\n".join(parts)


def _parse_search_results(results: Any) -> list[str]:
    items: list[str] = []
    if results is None:
        return items
    result_list = getattr(results, "results", None)
    if result_list is None and isinstance(results, dict):
        result_list = results.get("results", [])
    if result_list is None:
        return items
    for r in result_list:
        mem = getattr(r, "memory", None) or getattr(r, "chunk", None)
        if mem is None and isinstance(r, dict):
            mem = r.get("memory") or r.get("chunk")
        if mem:
            items.append(str(mem))
    return items


async def context_for_work(
    work_id: str,
    query: str,
    user_id: str = LOCAL_USER_ID,
) -> str:
    """Supermemory: profile + search — load work and user context (docs/SUPERMEMORY.md)."""
    client = get_client()
    if not client:
        return ""

    global _warned_unreachable
    parts: list[str] = []

    def _fetch():
        out: list[str] = []
        try:
            user_prof = client.profile(container_tag=_user_tag(user_id))
            formatted = _format_profile(user_prof)
            if formatted:
                out.append(f"User preferences:\n{formatted}")
        except Exception as e:
            logger.warning("User profile fetch failed: %s", e)
        try:
            work_prof = client.profile(container_tag=_work_tag(work_id), q=query)
            formatted = _format_profile(
                work_prof,
                getattr(work_prof, "search_results", None),
            )
            if formatted:
                out.append(f"Work context:\n{formatted}")
        except Exception as e:
            logger.warning("Work profile fetch failed: %s", e)
        return "\n\n".join(out)

    try:
        result = await asyncio.to_thread(_fetch)
        if result:
            return result
    except Exception as e:
        if not _warned_unreachable:
            logger.warning("Supermemory unreachable — continuing without memory: %s", e)
            _warned_unreachable = True
    return ""


async def store_memory(
    content: str,
    work_id: str,
    *,
    custom_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> str | None:
    """Supermemory: add documents — persist agent outputs (docs/SUPERMEMORY.md)."""
    client = get_client()
    if not client or not content.strip():
        return None

    def _add():
        kwargs: dict[str, Any] = {
            "content": content,
            "container_tag": _work_tag(work_id),
            "dreaming": "instant",
        }
        if custom_id:
            kwargs["custom_id"] = custom_id
        if metadata:
            kwargs["metadata"] = metadata
        resp = client.add(**kwargs)
        doc_id = getattr(resp, "id", None)
        if doc_id is None and isinstance(resp, dict):
            doc_id = resp.get("id")
        return doc_id

    try:
        return await asyncio.to_thread(_add)
    except Exception as e:
        logger.warning("Supermemory store failed: %s", e)
        return None


async def search_work_hits(work_id: str, query: str, limit: int = 5) -> list[str]:
    """Return individual memory strings from a work-scoped search."""
    client = get_client()
    if not client:
        return []

    def _search():
        results = client.search.memories(
            q=query,
            container_tag=_work_tag(work_id),
            search_mode="hybrid",
            limit=limit,
            threshold=SEARCH_THRESHOLD,
        )
        return _parse_search_results(results)

    try:
        return await asyncio.to_thread(_search)
    except Exception as e:
        logger.warning("Supermemory search failed for work_%s q=%r: %s", work_id, query[:80], e)
        return []


async def search_work(work_id: str, query: str, limit: int = 5) -> str:
    """Supermemory: hybrid search — recall prior drafts and refs (docs/SUPERMEMORY.md)."""
    hits = await search_work_hits(work_id, query, limit=limit)
    return "\n".join(hits)


async def wait_for_searchable(
    work_id: str,
    query: str,
    *,
    timeout_s: float = 30.0,
    interval_s: float = 1.0,
    limit: int = 3,
) -> list[str]:
    """Poll hybrid search until hits appear or timeout (post instant-dreaming store)."""
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        hits = await search_work_hits(work_id, query, limit=limit)
        if hits:
            return hits
        await asyncio.sleep(interval_s)
    return []
