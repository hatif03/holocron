"""Minimal LaTeX compile HTTP service."""
import os
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Holocron LaTeX Service")


class CompileRequest(BaseModel):
    project_dir: str
    main_file: str = "main.tex"


class CompileResponse(BaseModel):
    success: bool
    pdf_path: str | None = None
    log: str = ""


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/compile", response_model=CompileResponse)
def compile_latex(req: CompileRequest):
    project = Path(req.project_dir)
    if not project.exists():
        raise HTTPException(404, "Project directory not found")

    main = project / req.main_file
    if not main.exists():
        raise HTTPException(404, f"{req.main_file} not found")

    log_parts = []
    for _ in range(2):
        for cmd in [
            ["pdflatex", "-interaction=nonstopmode", req.main_file],
            ["bibtex", main.stem],
        ]:
            result = subprocess.run(
                cmd,
                cwd=project,
                capture_output=True,
                text=True,
                timeout=120,
            )
            log_parts.append(result.stdout + result.stderr)

    pdf = project / f"{main.stem}.pdf"
    return CompileResponse(
        success=pdf.exists(),
        pdf_path=str(pdf) if pdf.exists() else None,
        log="\n".join(log_parts),
    )
