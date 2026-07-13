from __future__ import annotations

import asyncio
import json
from typing import Any

import httpx
from openai import OpenAI

from .config import settings


class LLMClient:
    """Multi-provider LLM client (OpenAI-compatible + Anthropic Messages)."""

    def __init__(self) -> None:
        self._rebuild()

    def _rebuild(self) -> None:
        creds = settings.resolved_credentials()
        self.provider = creds["provider"]
        self.api_key = creds["api_key"]
        self.base_url = creds["base_url"]
        self.model = creds["model"]
        self.client: OpenAI | None = None
        if self.provider != "anthropic":
            self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)

    def reload(self) -> None:
        self._rebuild()

    async def complete(
        self,
        system: str,
        user: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        if settings.mock_llm:
            return self._mock_response(system, user)

        try:
            if self.provider == "anthropic":
                return await self._complete_anthropic(system, user, temperature, max_tokens)
            return await self._complete_openai(system, user, temperature, max_tokens)
        except Exception as e:
            if settings.mock_llm:
                return self._mock_response(system, user)
            return f"[LLM Error: {e}] Mock fallback content for development."

    async def _complete_openai(
        self,
        system: str,
        user: str,
        temperature: float,
        max_tokens: int,
    ) -> str:
        if self.client is None:
            self._rebuild()
        assert self.client is not None

        response = await asyncio.to_thread(
            self.client.chat.completions.create,
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""

    async def _complete_anthropic(
        self,
        system: str,
        user: str,
        temperature: float,
        max_tokens: int,
    ) -> str:
        url = f"{self.base_url.rstrip('/')}/v1/messages"
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self.model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "system": system,
            "messages": [{"role": "user", "content": user}],
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            res.raise_for_status()
            data = res.json()

        parts = data.get("content") or []
        texts = [p.get("text", "") for p in parts if p.get("type") == "text"]
        return "\n".join(texts).strip()

    def _mock_response(self, system: str, user: str) -> str:
        if "outline" in user.lower() or "plan" in system.lower():
            return json.dumps(
                {
                    "sections": [
                        {"name": "Abstract", "paragraphs": 1},
                        {"name": "Introduction", "paragraphs": 3},
                        {"name": "Methods", "paragraphs": 4},
                        {"name": "Results", "paragraphs": 3},
                        {"name": "Discussion", "paragraphs": 3},
                    ],
                    "discovered_refs": [],
                }
            )
        if "review" in system.lower():
            return json.dumps(
                {"approved": True, "feedback": "Section looks good.", "revised_content": None}
            )
        if "latex" in user.lower() or "section" in system.lower():
            return (
                "\\section{Introduction}\n"
                "This paper presents a comprehensive analysis of the research topic. "
                "Our approach combines rigorous methodology with novel insights derived "
                "from the research graph structure.\n"
            )
        if "layout" in system.lower() or "vlm" in system.lower():
            return json.dumps({"passed": True, "issues": []})
        if "parse" in system.lower() or "pdf" in user.lower()[:100]:
            return json.dumps(
                {
                    "summary": "A comprehensive study examining key research questions.",
                    "research_questions": [
                        "What is the primary hypothesis?",
                        "What methods were used?",
                    ],
                    "methods": "Quantitative analysis with bibliometric data.",
                    "findings": "Significant results supporting the main hypothesis.",
                }
            )
        return "Generated content for development mode."


# Back-compat alias
K2ThinkClient = LLMClient

llm = LLMClient()
