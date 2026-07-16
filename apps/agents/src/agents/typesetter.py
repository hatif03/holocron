import asyncio
import json
from pathlib import Path

import httpx
from pydantic import BaseModel

from ..config import settings
from ..llm import llm

class ParsePdfRequest(BaseModel):
    text: str = ""
    file_path: str = ""


class ParsePdfResponse(BaseModel):
    summary: str
    research_questions: list[str]
    methods: str
    findings: str


async def analyze_paper(req: ParsePdfRequest) -> ParsePdfResponse:
    text = req.text
    if req.file_path and Path(req.file_path).exists():
        try:
            import fitz
            doc = fitz.open(req.file_path)
            text = "\n".join(page.get_text() for page in doc[:10])
            doc.close()
        except Exception:
            text = text or "Unable to extract PDF text."

    system = (
        "You are the Paper Parser agent. Extract structured analysis from academic paper text. "
        "Return JSON: {summary, research_questions[], methods, findings}"
    )
    user = f"Paper text (first 8000 chars):\n{text[:8000]}"

    raw = await llm.complete(system, user)
    try:
        data = json.loads(raw)
        return ParsePdfResponse(
            summary=data.get("summary", ""),
            research_questions=data.get("research_questions", []),
            methods=data.get("methods", ""),
            findings=data.get("findings", ""),
        )
    except json.JSONDecodeError:
        return ParsePdfResponse(
            summary="Paper analysis pending.",
            research_questions=[],
            methods="",
            findings="",
        )


class TemplateParseRequest(BaseModel):
    style_guide: str = "Nature"


class TemplateParseResponse(BaseModel):
    rules: dict
    main_file: str


async def parse_template(req: TemplateParseRequest) -> TemplateParseResponse:
    template_dir = Path(settings.templates_path) / req.style_guide.lower()
    rules = {
        "font": "Times",
        "columns": 2 if req.style_guide == "Nature" else 1,
        "citation_style": "numeric" if req.style_guide == "IEEE" else "author-year",
        "max_pages": 12,
    }
    if template_dir.exists():
        main_tex = template_dir / "main.tex"
        if main_tex.exists():
            content = main_tex.read_text(encoding="utf-8")
            if "twocolumn" in content:
                rules["columns"] = 2
    return TemplateParseResponse(rules=rules, main_file="main.tex")


class CompileRequest(BaseModel):
    project_dir: str
    main_file: str = "main.tex"


class CompileResponse(BaseModel):
    success: bool
    pdf_path: str | None
    log: str


async def compile_latex(req: CompileRequest, max_retries: int = 3) -> CompileResponse:
    project = Path(req.project_dir)
    project.mkdir(parents=True, exist_ok=True)

    log = ""
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=180) as client:
                resp = await client.post(
                    f"{settings.latex_service_url}/compile",
                    json={"project_dir": req.project_dir, "main_file": req.main_file},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("success"):
                        return CompileResponse(
                            success=True,
                            pdf_path=data.get("pdf_path"),
                            log=data.get("log", ""),
                        )
                    log = data.get("log", "")
        except Exception as e:
            log = str(e)

        if attempt < max_retries - 1 and log:
            error_context = log[-2000:]
            fix_targets: list[Path] = [project / req.main_file]
            sections_dir = project / "sections"
            if sections_dir.is_dir():
                fix_targets.extend(sorted(sections_dir.glob("*.tex")))
            bib_path = project / "references.bib"
            if bib_path.exists():
                fix_targets.append(bib_path)

            for target in fix_targets:
                if not target.exists():
                    continue
                fix = await llm.complete(
                    "Fix LaTeX compilation errors. Return only the corrected file content.",
                    f"Errors:\n{error_context}\n\nFile: {target.name}\n\nCurrent content:\n{target.read_text(encoding='utf-8')[:4000]}",
                )
                target.write_text(fix, encoding="utf-8")
            await asyncio.sleep(2**attempt)

    return CompileResponse(success=False, pdf_path=None, log=log)
