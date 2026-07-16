"""Extract structured context from research graph for agent pipeline."""

from __future__ import annotations

import re
from collections import defaultdict, deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class GraphContext:
    title: str = "Research Paper"
    target_venue: str = ""
    ideation: list[dict[str, Any]] = field(default_factory=list)
    literature: list[dict[str, Any]] = field(default_factory=list)
    concepts: list[dict[str, Any]] = field(default_factory=list)
    methods: list[dict[str, Any]] = field(default_factory=list)
    experiments: list[dict[str, Any]] = field(default_factory=list)
    data_sources: list[dict[str, Any]] = field(default_factory=list)
    metrics: list[dict[str, Any]] = field(default_factory=list)
    results: list[dict[str, Any]] = field(default_factory=list)
    findings: list[dict[str, Any]] = field(default_factory=list)
    figures: list[dict[str, Any]] = field(default_factory=list)
    tables: list[dict[str, Any]] = field(default_factory=list)
    paper_sections: list[dict[str, Any]] = field(default_factory=list)
    ordered_node_ids: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "title": self.title,
            "target_venue": self.target_venue,
            "ideation": self.ideation,
            "literature": self.literature,
            "concepts": self.concepts,
            "methods": self.methods,
            "experiments": self.experiments,
            "data_sources": self.data_sources,
            "metrics": self.metrics,
            "results": self.results,
            "findings": self.findings,
            "figures": self.figures,
            "tables": self.tables,
            "paper_sections": self.paper_sections,
            "ordered_node_ids": self.ordered_node_ids,
        }

    def _all_items(self) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        for group in (
            self.ideation, self.literature, self.concepts, self.methods,
            self.experiments, self.data_sources, self.metrics, self.results,
            self.findings, self.figures, self.tables, self.paper_sections,
        ):
            items.extend(group)
        return items

    def item_by_id(self, node_id: str) -> dict[str, Any] | None:
        for item in self._all_items():
            if str(item.get("id", "")) == str(node_id):
                return item
        return None

    def snippets_for_node_ids(self, node_ids: list[str], ordered: bool = True) -> list[str]:
        """Targeted snippets for explicit graph_node_ids from planner."""
        if not node_ids:
            return []
        id_set = {str(i) for i in node_ids}
        order = self.ordered_node_ids if ordered else list(id_set)
        snippets: list[str] = []
        for nid in order:
            if nid not in id_set:
                continue
            item = self.item_by_id(nid)
            if item:
                snippets.extend(_text_fields(item))
        for nid in id_set:
            if nid in order:
                continue
            item = self.item_by_id(nid)
            if item:
                snippets.extend(_text_fields(item))
        return [s for s in snippets if s.strip()]

    def section_flow(self, section_name: str, node_ids: list[str] | None = None) -> str:
        """Topological sub-path for a section's graph nodes."""
        ids = node_ids or []
        if not ids:
            return ""
        id_set = set(str(i) for i in ids)
        id_to_label: dict[str, str] = {}
        for item in self._all_items():
            nid = str(item.get("id", ""))
            if nid:
                id_to_label[nid] = str(item.get("label") or item.get("name") or nid)
        labels = [id_to_label.get(nid, nid) for nid in self.ordered_node_ids if nid in id_set]
        if not labels:
            labels = [id_to_label.get(nid, nid) for nid in ids]
        return " → ".join(labels[:15])

    def snippets_for_section(self, section_name: str) -> list[str]:
        name = section_name.lower()
        snippets: list[str] = []
        if name in ("abstract", "introduction"):
            for group in (self.ideation, self.concepts, self.literature):
                for item in group:
                    snippets.extend(_text_fields(item))
        elif name in ("related work", "related_work"):
            for group in (self.literature, self.concepts):
                for item in group:
                    snippets.extend(_text_fields(item))
        elif name == "methods":
            flow = self.flow_summary()
            if flow:
                snippets.append(f"experiment_flow: {flow}")
            for group in (self.methods, self.experiments, self.data_sources):
                for item in group:
                    snippets.extend(_text_fields(item))
        elif name == "results":
            flow = self.flow_summary()
            if flow:
                snippets.append(f"experiment_flow: {flow}")
            for group in (self.results, self.metrics, self.findings, self.figures, self.tables):
                for item in group:
                    snippets.extend(_text_fields(item))
        elif name == "discussion":
            for group in (self.findings, self.concepts, self.ideation):
                for item in group:
                    snippets.extend(_text_fields(item))
        elif name == "conclusion":
            for group in (self.findings, self.ideation):
                for item in group:
                    snippets.extend(_text_fields(item))
        else:
            for ps in self.paper_sections:
                if str(ps.get("section_name", "")).lower() == name:
                    snippets.extend(_text_fields(ps))
        return [s for s in snippets if s.strip()]

    def flow_summary(self) -> str:
        """Topological narrative of node labels for Methods/Results prompts."""
        if not self.ordered_node_ids:
            return ""
        id_to_label: dict[str, str] = {}
        for group in (
            self.ideation, self.literature, self.concepts, self.methods,
            self.experiments, self.data_sources, self.metrics, self.results,
            self.findings, self.figures, self.tables,
        ):
            for item in group:
                nid = str(item.get("id", ""))
                if nid:
                    id_to_label[nid] = str(item.get("label") or item.get("name") or nid)
        labels = [id_to_label.get(nid, nid) for nid in self.ordered_node_ids if nid in id_to_label]
        return " → ".join(labels[:20])


def _node_id(node: dict) -> str:
    return str(node.get("id") or node.get("node_key") or "")


def _node_type(node: dict) -> str:
    return str(node.get("type") or node.get("data", {}).get("nodeType") or "")


def _node_data(node: dict) -> dict[str, Any]:
    data = node.get("data") or {}
    return data if isinstance(data, dict) else {}


def _text_fields(data: dict[str, Any], *, include_code: bool = False) -> list[str]:
    parts: list[str] = []
    skip_keys = set()
    if not include_code:
        skip_keys = {"pseudo_code", "script_source"}
    for key in (
        "label", "body", "rationale", "context", "description", "definition",
        "user_notes", "pseudo_code", "environment", "value", "significance",
        "caption", "outline", "draft_notes", "name", "formula", "columns", "rows",
        "bibtex", "source_note", "related_terms", "unit", "target_value",
        "script_source", "notes", "file_path", "data_path", "figure_path",
    ):
        if key in skip_keys:
            continue
        val = data.get(key)
        if val and isinstance(val, str):
            parts.append(f"{key}: {val}")
    return parts


def parse_tabular_file(file_path: str, storage_path: str) -> dict[str, Any] | None:
    """Parse CSV/TSV from storage into columns and rows lists."""
    from pathlib import Path

    if not file_path:
        return None
    rel = file_path.replace("\\", "/")
    src = Path(storage_path) / rel
    if not src.is_file():
        return None
    ext = src.suffix.lower()
    if ext not in (".csv", ".tsv", ".txt"):
        return None
    try:
        import csv

        delimiter = "\t" if ext == ".tsv" else ","
        with open(src, newline="", encoding="utf-8", errors="replace") as f:
            reader = csv.reader(f, delimiter=delimiter)
            rows_list = list(reader)
        if not rows_list:
            return None
        headers = [c.strip() for c in rows_list[0]]
        data_rows = rows_list[1:21]
        return {
            "columns": ", ".join(headers),
            "rows": "\n".join(", ".join(c.strip() for c in row) for row in data_rows),
        }
    except Exception:
        return None


def _topological_order(nodes: list[dict], edges: list[dict]) -> list[str]:
    ids = [_node_id(n) for n in nodes if _node_id(n)]
    if not ids:
        return []
    id_set = set(ids)
    type_by_id = {_node_id(n): _node_type(n) for n in nodes}
    adj: dict[str, list[str]] = defaultdict(list)
    indeg: dict[str, int] = {i: 0 for i in ids}
    for e in edges:
        s, t = str(e.get("source", "")), str(e.get("target", ""))
        if s in id_set and t in id_set:
            adj[s].append(t)
            indeg[t] = indeg.get(t, 0) + 1
    starts = [i for i in ids if type_by_id.get(i) == "start"]
    queue: deque[str] = deque(starts or [i for i in ids if indeg.get(i, 0) == 0])
    order: list[str] = []
    seen: set[str] = set()
    while queue:
        cur = queue.popleft()
        if cur in seen:
            continue
        seen.add(cur)
        order.append(cur)
        for nxt in adj.get(cur, []):
            indeg[nxt] -= 1
            if indeg[nxt] <= 0:
                queue.append(nxt)
    for i in ids:
        if i not in seen:
            order.append(i)
    return order


def extract_graph_context(graph: dict[str, Any]) -> GraphContext:
    nodes = graph.get("nodes") or []
    edges = graph.get("edges") or []
    ctx = GraphContext()
    ctx.ordered_node_ids = _topological_order(nodes, edges)

    for node in nodes:
        ntype = _node_type(node)
        data = {**_node_data(node), "label": node.get("label") or _node_data(node).get("label")}
        entry = {"id": _node_id(node), "type": ntype, **data}

        if ntype == "start":
            ctx.title = str(data.get("paper_title") or ctx.title)
            ctx.target_venue = str(data.get("target_venue") or "")
        elif ntype in ("idea", "question", "hypothesis"):
            ctx.ideation.append(entry)
        elif ntype == "literature":
            ctx.literature.append(entry)
        elif ntype == "concept":
            ctx.concepts.append(entry)
        elif ntype == "method":
            ctx.methods.append(entry)
        elif ntype == "experiment":
            ctx.experiments.append(entry)
        elif ntype == "data":
            ctx.data_sources.append(entry)
        elif ntype == "metric":
            ctx.metrics.append(entry)
        elif ntype == "result":
            ctx.results.append(entry)
        elif ntype == "finding":
            ctx.findings.append(entry)
        elif ntype == "figure":
            ctx.figures.append(entry)
        elif ntype == "table":
            ctx.tables.append(entry)
        elif ntype == "paper_section":
            ctx.paper_sections.append(entry)
        elif ntype == "end":
            notes = data.get("notes") or data.get("body") or ""
            if notes:
                ctx.findings.append({**entry, "label": "end_notes", "body": str(notes)})

    return ctx


def derive_query_from_graph(graph: dict[str, Any]) -> str:
    ctx = extract_graph_context(graph)
    if ctx.title and ctx.title != "Research Paper":
        return ctx.title
    for item in ctx.ideation:
        body = item.get("body") or item.get("description")
        if body:
            return str(body)[:200]
    return "academic research paper"


def _rewrite_bib_key(bib: str, new_key: str) -> str:
    return re.sub(r"(@\w+\s*\{)[^,\s]+", rf"\g<1>{new_key}", bib.strip(), count=1)


def build_bibtex_entries(
    discovered_refs: list[dict[str, Any]],
    graph: dict[str, Any],
    library_bib: list[str] | None = None,
) -> str:
    entries: list[str] = []
    seen: set[str] = set()

    def add_entry(key: str, bib: str) -> None:
        if key in seen or not bib.strip():
            return
        seen.add(key)
        entries.append(bib.strip())

    for i, ref in enumerate(discovered_refs):
        title = ref.get("title") or f"ref{i}"
        key = f"discovered{i}"
        authors = ref.get("authors") or []
        author_str = " and ".join(authors) if isinstance(authors, list) else str(authors)
        year = ref.get("year") or "n.d."
        abstract = (ref.get("abstract") or "")[:500]
        bib = (
            f"@article{{{key},\n"
            f"  title={{{title}}},\n"
            f"  author={{{author_str}}},\n"
            f"  year={{{year}}},\n"
            f"  note={{{abstract}}}\n"
            f"}}"
        )
        add_entry(key, bib)

    ctx = extract_graph_context(graph)
    lit_idx = 0
    for lit in ctx.literature:
        bib = lit.get("bibtex") or ""
        if bib:
            key = f"lit{lit_idx}"
            add_entry(key, _rewrite_bib_key(bib, key))
            lit_idx += 1

    lib_idx = 0
    for bib in library_bib or []:
        if not bib.strip():
            continue
        key_match = re.search(r"@\w+\s*\{\s*([^,\s]+)", bib)
        key = key_match.group(1) if key_match else f"lib{lib_idx}"
        add_entry(key, bib)
        lib_idx += 1

    return "\n\n".join(entries) + ("\n" if entries else "")


def _svg_to_png(src: Path, dest: Path) -> bool:
    import subprocess

    for cmd in (
        ["rsvg-convert", "-o", str(dest), str(src)],
        ["magick", "convert", str(src), str(dest)],
    ):
        try:
            r = subprocess.run(cmd, capture_output=True, timeout=30)
            if r.returncode == 0 and dest.is_file():
                return True
        except Exception:
            continue
    return False


def copy_figure_assets(
    graph: dict[str, Any],
    output_dir: str,
    storage_path: str,
) -> tuple[list[str], list[str]]:
    import shutil
    from pathlib import Path

    ctx = extract_graph_context(graph)
    fig_dir = Path(output_dir) / "figures"
    fig_dir.mkdir(exist_ok=True)
    copied: list[str] = []
    warnings: list[str] = []
    for fig in ctx.figures:
        path = fig.get("figure_path") or ""
        if not path:
            continue
        src = Path(storage_path) / path.replace("\\", "/")
        if not src.is_file():
            label = fig.get("label") or path
            warnings.append(f"Figure asset missing on disk: {path} ({label})")
            continue
        if src.suffix.lower() == ".svg":
            dest = fig_dir / f"{src.stem}.png"
            if _svg_to_png(src, dest):
                copied.append(f"figures/{dest.name}")
            else:
                warnings.append(f"SVG figure could not be converted to PNG: {path}")
            continue
        dest = fig_dir / src.name
        shutil.copy2(src, dest)
        copied.append(f"figures/{src.name}")
    return copied, warnings


def _latex_escape(text: str) -> str:
    return (
        text.replace("\\", "\\textbackslash{}")
        .replace("_", "\\_")
        .replace("%", "\\%")
        .replace("&", "\\&")
        .replace("#", "\\#")
    )


def enrich_tables_from_files(ctx: GraphContext, storage_path: str) -> None:
    """Fill table columns/rows from data_path when manual rows are empty."""
    for tbl in ctx.tables:
        if tbl.get("rows") and tbl.get("columns"):
            continue
        data_path = tbl.get("data_path") or ""
        parsed = parse_tabular_file(data_path, storage_path)
        if parsed:
            if not tbl.get("columns"):
                tbl["columns"] = parsed["columns"]
            if not tbl.get("rows"):
                tbl["rows"] = parsed["rows"]


def latex_equations_from_graph(ctx: GraphContext) -> str:
    blocks: list[str] = []
    for metric in ctx.metrics:
        formula = str(metric.get("formula") or "").strip()
        if not formula:
            continue
        label = str(metric.get("label") or metric.get("name") or "Metric")
        safe_formula = _latex_escape(formula) if "\\" not in formula else formula
        if "\\begin{equation}" not in safe_formula:
            blocks.append(
                f"\\begin{{equation}}\n"
                f"{safe_formula}\n"
                f"\\end{{equation}}"
            )
        else:
            blocks.append(safe_formula)
        blocks.append(f"\\textit{{{_latex_escape(label)}}}")
    return "\n\n".join(blocks)


def latex_code_from_graph(ctx: GraphContext) -> str:
    blocks: list[str] = []
    for method in ctx.methods:
        code = str(method.get("pseudo_code") or "").strip()
        if not code:
            continue
        label = str(method.get("label") or "Analysis procedure")
        blocks.append(f"\\textbf{{{_latex_escape(label)}}}")
        blocks.append("\\begin{lstlisting}[language=Python,breaklines=true]")
        blocks.append(code)
        blocks.append("\\end{lstlisting}")
    for fig in ctx.figures:
        script = str(fig.get("script_source") or "").strip()
        if not script:
            continue
        caption = str(fig.get("caption") or fig.get("label") or "Figure script")
        blocks.append(f"\\textbf{{{_latex_escape(caption)}}}")
        blocks.append("\\begin{lstlisting}[language=Python,breaklines=true]")
        blocks.append(script)
        blocks.append("\\end{lstlisting}")
    return "\n\n".join(blocks)


def build_section_latex_blocks(
    ctx: GraphContext,
    copied_figures: list[str],
    generated_figures: list[dict[str, str]],
    storage_path: str,
) -> dict[str, str]:
    enrich_tables_from_files(ctx, storage_path)
    results_parts: list[str] = []
    results_parts.append(
        latex_figures_and_tables(ctx, copied_figures, generated_figures)
    )
    eq = latex_equations_from_graph(ctx)
    if eq:
        results_parts.append(eq)

    methods_code = latex_code_from_graph(ctx)
    return {
        "methods": methods_code,
        "results": "\n\n".join(p for p in results_parts if p.strip()),
    }


def latex_table_from_graph(table_node: dict[str, Any]) -> str:
    """Build a LaTeX table block from a graph table node."""
    caption = str(table_node.get("caption") or table_node.get("label") or "Results")
    columns = str(table_node.get("columns") or "Col1, Col2")
    cols = [c.strip() for c in columns.split(",") if c.strip()]
    col_spec = "l" * max(len(cols), 1)
    lines = [
        "\\begin{table}[h]",
        "\\centering",
        f"\\caption{{{caption.replace('_', ' ')}}}",
        f"\\begin{{tabular}}{{{col_spec}}}",
        "\\hline",
        " & ".join(cols) + " \\\\",
        "\\hline",
    ]
    rows_raw = str(table_node.get("rows") or "")
    for row in rows_raw.split("\n"):
        row = row.strip()
        if not row:
            continue
        cells = [c.strip() for c in row.split(",")]
        while len(cells) < len(cols):
            cells.append("")
        lines.append(" & ".join(cells[: len(cols)]) + " \\\\")
    lines.extend(["\\hline", "\\end{tabular}", "\\end{table}"])
    return "\n".join(lines)


def _figure_caption_for_path(ctx: GraphContext, fig_path: str) -> str:
    name = fig_path.split("/")[-1]
    for fig in ctx.figures:
        uploaded = str(fig.get("figure_path") or "")
        if uploaded and name in uploaded.replace("\\", "/"):
            cap = str(fig.get("caption") or fig.get("label") or "")
            if cap:
                return _latex_escape(cap)
    return _latex_escape(f"Figure: {name}")


def _figure_label_for_path(ctx: GraphContext, fig_path: str) -> str:
    name = fig_path.split("/")[-1]
    for fig in ctx.figures:
        uploaded = str(fig.get("figure_path") or "")
        if uploaded and name in uploaded.replace("\\", "/"):
            key = str(fig.get("id") or fig.get("node_key") or fig.get("label") or name)
            safe = re.sub(r"[^a-zA-Z0-9_]", "_", key).strip("_").lower()
            return safe or "figure"
    stem = Path(name).stem if "." in name else name
    return re.sub(r"[^a-zA-Z0-9_]", "_", stem).strip("_").lower() or "figure"


def latex_figures_and_tables(
    ctx: GraphContext,
    copied_figures: list[str],
    generated_figures: list[dict[str, str]] | None = None,
) -> str:
    """Pre-built LaTeX blocks for Results section."""
    blocks: list[str] = []
    for fig_path in copied_figures:
        caption = _figure_caption_for_path(ctx, fig_path)
        label = _figure_label_for_path(ctx, fig_path)
        blocks.append(
            f"\\begin{{figure}}[tbp]\n\\centering\n"
            f"\\includegraphics[width=\\linewidth]{{{fig_path}}}\n"
            f"\\caption{{{caption}}}\n"
            f"\\label{{fig:{label}}}\n\\end{{figure}}"
        )
    for i, gen in enumerate(generated_figures or []):
        path = gen.get("path") or ""
        if not path:
            continue
        caption = _latex_escape(gen.get("caption") or "Generated chart")
        label = re.sub(r"[^a-zA-Z0-9_]", "_", Path(path).stem).lower() or f"gen_{i}"
        blocks.append(
            f"\\begin{{figure}}[tbp]\n\\centering\n"
            f"\\includegraphics[width=\\linewidth]{{{path}}}\n"
            f"\\caption{{{caption}}}\n"
            f"\\label{{fig:{label}}}\n\\end{{figure}}"
        )
    for tbl in ctx.tables:
        blocks.append(latex_table_from_graph(tbl))
    return "\n\n".join(blocks)
