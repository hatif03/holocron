from fastapi import FastAPI, BackgroundTasks, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
from typing import Optional

from .registry import get_agent_health
from .config import settings, PROVIDER_DEFAULTS
from .llm import llm
from .agents.planner import PlanRequest, plan_paper
from .agents.writer import DraftRequest, draft_section
from .agents.reviewer import ReviewRequest, review_section
from .agents.typesetter import (
    ParsePdfRequest,
    analyze_paper,
    TemplateParseRequest,
    parse_template,
    CompileRequest,
    compile_latex,
)
from .agents.metadata import MetadataRequest, generate_from_metadata
from .agents.vlm_review import VlmPageRequest, VlmReviewRequest, VlmFixRequest, analyze_page, review_pdf, suggest_fixes
from .orchestrator.commander import GenerateRequest, run_generation

app = FastAPI(title="Holocron Agent Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_generation_jobs: dict[str, dict] = {}


class LlmConfigUpdate(BaseModel):
    provider: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None


@app.get("/health")
async def health():
    return {"status": "online", "agents": get_agent_health()}


@app.get("/config/llm")
async def get_llm_config():
    return settings.public_llm_info()


@app.post("/config/llm")
async def update_llm_config(body: LlmConfigUpdate):
    provider = (body.provider or settings.resolved_provider()).lower()
    if provider not in PROVIDER_DEFAULTS:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")

    payload = body.model_dump(exclude_none=True)
    # Keep existing key if blank string sent (UI may omit re-entry)
    if "api_key" in payload and payload["api_key"] == "":
        del payload["api_key"]

    settings.apply_llm_override(payload)
    settings.persist_llm_override()
    llm.reload()
    return settings.public_llm_info()

@app.post("/agents/planner/plan")
async def planner_plan(req: PlanRequest):
    return await plan_paper(req)


@app.post("/agents/writer/draft")
async def writer_draft(req: DraftRequest):
    return await draft_section(req)


@app.post("/agents/reviewer/review")
async def reviewer_review(req: ReviewRequest):
    return await review_section(req)


@app.post("/agents/paper-parser/analyze")
async def paper_parser_analyze(req: ParsePdfRequest):
    return await analyze_paper(req)


@app.post("/agents/template-parser/parse")
async def template_parser_parse(req: TemplateParseRequest):
    return await parse_template(req)


@app.post("/agents/typesetter/compile")
async def typesetter_compile(req: CompileRequest):
    return await compile_latex(req)


@app.post("/agents/metadata/generate")
async def metadata_generate(req: MetadataRequest):
    return await generate_from_metadata(req)


@app.post("/agents/vlm-review/analyze-page")
async def vlm_analyze_page(req: VlmPageRequest):
    return await analyze_page(req)


@app.post("/agents/vlm-review/review-pdf")
async def vlm_review_pdf(req: VlmReviewRequest):
    return await review_pdf(req)


@app.post("/agents/vlm-review/suggest-fixes")
async def vlm_suggest_fixes(req: VlmFixRequest):
    return await suggest_fixes(req)


@app.post("/agents/commander/generate")
async def commander_generate(req: GenerateRequest, background_tasks: BackgroundTasks):
    gen_id = req.generation_id or str(uuid.uuid4())
    req.generation_id = gen_id
    _generation_jobs[gen_id] = {"status": "running", "events": []}

    async def on_event(agent, event_type, message, metadata):
        _generation_jobs[gen_id]["events"].append(
            {"agent": agent, "event_type": event_type, "message": message, "metadata": metadata}
        )

    async def run():
        try:
            result = await run_generation(req, on_event)
            _generation_jobs[gen_id]["status"] = result.status
            _generation_jobs[gen_id]["result"] = result.model_dump()
        except Exception as e:
            _generation_jobs[gen_id]["status"] = "failed"
            _generation_jobs[gen_id]["error"] = str(e)

    background_tasks.add_task(run)
    return {"generation_id": gen_id, "status": "running"}


@app.get("/agents/commander/status/{generation_id}")
async def commander_status(generation_id: str):
    return _generation_jobs.get(generation_id, {"status": "not_found"})


@app.post("/agents/paper-parser/upload")
async def paper_parser_upload(file: UploadFile = File(...)):
    from .config import settings
    from pathlib import Path
    import aiofiles

    storage = Path(settings.storage_path) / "uploads"
    storage.mkdir(parents=True, exist_ok=True)

    raw_name = file.filename or ""
    safe_name = Path(raw_name).name
    if not safe_name or safe_name in (".", "..") or raw_name != safe_name:
        safe_name = f"{uuid.uuid4()}.pdf"

    dest = (storage / safe_name).resolve()
    if not str(dest).startswith(str(storage.resolve())):
        raise HTTPException(status_code=400, detail="Invalid filename")

    async with aiofiles.open(dest, "wb") as f:
        content = await file.read()
        await f.write(content)

    return await analyze_paper(ParsePdfRequest(file_path=str(dest)))
