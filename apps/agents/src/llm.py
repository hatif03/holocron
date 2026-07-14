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
            sections = [
                {"name": "Abstract", "paragraphs": 1, "target_words": 250, "outline": ["Summary", "Key findings"]},
                {"name": "Introduction", "paragraphs": 4, "target_words": 800, "outline": ["Background", "Gap", "Contributions"]},
                {"name": "Related Work", "paragraphs": 3, "target_words": 600, "outline": ["Prior art", "Comparison"]},
                {"name": "Methods", "paragraphs": 5, "target_words": 900, "outline": ["Design", "Data", "Metrics", "Analysis"]},
                {"name": "Results", "paragraphs": 4, "target_words": 900, "outline": ["Primary outcomes", "Ablations", "Figures"]},
                {"name": "Discussion", "paragraphs": 4, "target_words": 800, "outline": ["Interpretation", "Limitations", "Future work"]},
                {"name": "Conclusion", "paragraphs": 2, "target_words": 300, "outline": ["Summary", "Impact"]},
            ]
            if "paper_section" in user or "Structured graph context" in user:
                pass  # Related Work already included
            return json.dumps({"sections": sections, "discovered_refs": []})
        if "review" in system.lower():
            word_hint = user.split("Words:")[-1].strip() if "Words:" in user else ""
            approved = "below" not in user.lower() and "expand" not in user.lower()
            return json.dumps(
                {
                    "approved": approved,
                    "feedback": "Section meets length and style requirements." if approved else "Expand with more graph-derived detail.",
                    "revised_content": None if approved else self._mock_section_latex("Section", user),
                }
            )
        if "latex" in user.lower() or "section" in system.lower() or "Writer agent" in system:
            section = "Introduction"
            for candidate in ("Abstract", "Introduction", "Related Work", "Methods", "Results", "Discussion", "Conclusion"):
                if candidate.lower() in user.lower():
                    section = candidate
                    break
            return self._mock_section_latex(section, user)
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

    def _mock_section_latex(self, section_name: str, user: str) -> str:
        """~400-word mock LaTeX section for dev/CI without API key."""
        base = (
            f"\\section{{{section_name}}}\n"
            "This section synthesizes evidence from the research graph and cited literature. "
            "Our methodology follows established practices in the field while incorporating "
            "novel elements derived from the structured research workflow. "
        )
        paragraph = (
            "Prior work demonstrates that retrieval-augmented generation improves factual grounding "
            "in scientific writing \\cite{discovered0}. We extend these findings by scoping memory "
            "to individual research works, enabling persistent context across drafting iterations. "
            "Experimental nodes in the graph specify environments, metrics, and expected outcomes; "
            "we align generated prose with those constraints rather than inventing unsupported claims. "
            "Figure nodes supply captions and asset paths that map directly to \\includegraphics "
            "directives in the compiled manuscript. Literature nodes contribute BibTeX entries "
            "merged into references.bib alongside papers discovered during planning. "
        )
        chunks = [base]
        for i in range(12):
            chunks.append(paragraph.replace("discovered0", f"discovered{i % 3}"))
        if "graph context" in user.lower() or "Graph context" in user:
            chunks.append(
                "Graph-derived snippets informed the narrative structure: hypothesis statements "
                "anchor the introduction, method descriptions constrain procedural claims, and "
                "finding nodes supply quantitative summaries referenced in results. "
            )
        if section_name.lower() == "results" and "figures/" in user.lower():
            chunks.append(
                "\\begin{figure}[h]\n\\centering\n\\includegraphics[width=\\linewidth]{figures/tpl_fig1.svg}\n"
                "\\caption{Representative result from seeded graph assets.}\n\\end{figure}\n"
            )
        return "".join(chunks)


# Back-compat alias
K2ThinkClient = LLMClient

llm = LLMClient()
