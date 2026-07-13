import json
from typing import Any

from pydantic import BaseModel

from ..llm import llm


class MetadataRequest(BaseModel):
    title: str
    abstract: str
    introduction: str
    methods: str
    results: str
    bibtex: str = ""


class MetadataResponse(BaseModel):
    sections: dict[str, str]
    main_tex: str


async def generate_from_metadata(req: MetadataRequest) -> MetadataResponse:
    system = "Generate a complete academic paper in LaTeX from metadata fields. Return JSON with sections dict and main_tex."
    user = req.model_dump_json()
    raw = await llm.complete(system, user)
    try:
        data = json.loads(raw)
        return MetadataResponse(
            sections=data.get("sections", {}),
            main_tex=data.get("main_tex", ""),
        )
    except json.JSONDecodeError:
        main = (
            f"\\documentclass{{article}}\n\\begin{{document}}\n"
            f"\\title{{{req.title}}}\n\\maketitle\n"
            f"\\begin{{abstract}}{req.abstract}\\end{{abstract}}\n"
            f"\\section{{Introduction}}{req.introduction}\n"
            f"\\section{{Methods}}{req.methods}\n"
            f"\\section{{Results}}{req.results}\n"
            f"\\end{{document}}\n"
        )
        return MetadataResponse(
            sections={"main": main},
            main_tex=main,
        )
