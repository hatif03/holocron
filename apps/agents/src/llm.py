import asyncio
import json
from typing import Any

from openai import OpenAI

from .config import settings


class K2ThinkClient:
    def __init__(self):
        self.client = OpenAI(
            api_key=settings.k2think_api_key,
            base_url=settings.k2think_base_url.replace("/chat/completions", "")
            if "/chat/completions" in settings.k2think_base_url
            else settings.k2think_base_url,
        )
        self.model = settings.k2think_model

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
        except Exception as e:
            if settings.mock_llm:
                return self._mock_response(system, user)
            return f"[LLM Error: {e}] Mock fallback content for development."

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
            return json.dumps({"approved": True, "feedback": "Section looks good.", "revised_content": None})
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
                    "research_questions": ["What is the primary hypothesis?", "What methods were used?"],
                    "methods": "Quantitative analysis with bibliometric data.",
                    "findings": "Significant results supporting the main hypothesis.",
                }
            )
        return "Generated content for development mode."


llm = K2ThinkClient()
