"""Extract structured context from research graph for agent pipeline."""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass, field
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


def _text_fields(data: dict[str, Any]) -> list[str]:
    parts: list[str] = []
    for key in (
        "label", "body", "rationale", "context", "description", "definition",
        "user_notes", "pseudo_code", "environment", "value", "significance",
        "caption", "outline", "draft_notes", "name", "formula", "columns", "rows",
    ):
        val = data.get(key)
        if val and isinstance(val, str):
            parts.append(f"{key}: {val}")
    return parts


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


def build_bibtex_entries(
    discovered_refs: list[dict[str, Any]],
    graph: dict[str, Any],
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
    for i, lit in enumerate(ctx.literature):
        bib = lit.get("bibtex") or ""
        if bib:
            add_entry(f"lit{i}", bib)

    return "\n\n".join(entries) + ("\n" if entries else "")


def copy_figure_assets(
    graph: dict[str, Any],
    output_dir: str,
    storage_path: str,
) -> list[str]:
    import shutil
    from pathlib import Path

    ctx = extract_graph_context(graph)
    fig_dir = Path(output_dir) / "figures"
    fig_dir.mkdir(exist_ok=True)
    copied: list[str] = []
    for fig in ctx.figures:
        path = fig.get("figure_path") or ""
        if not path:
            continue
        src = Path(storage_path) / path.replace("\\", "/")
        if not src.is_file():
            continue
        dest = fig_dir / src.name
        shutil.copy2(src, dest)
        copied.append(f"figures/{src.name}")
    return copied


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


def latex_figures_and_tables(ctx: GraphContext, copied_figures: list[str]) -> str:
    """Pre-built LaTeX blocks for Results section."""
    blocks: list[str] = []
    for fig_path in copied_figures:
        name = fig_path.split("/")[-1]
        blocks.append(
            f"\\begin{{figure}}[h]\n\\centering\n"
            f"\\includegraphics[width=\\linewidth]{{{fig_path}}}\n"
            f"\\caption{{Figure from research graph: {name}}}\n\\end{{figure}}"
        )
    for tbl in ctx.tables:
        blocks.append(latex_table_from_graph(tbl))
    return "\n\n".join(blocks)
