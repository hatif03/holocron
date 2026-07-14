"""GraphContract — shared state tracking per-node obligations across agents."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from .graph_context import GraphContext, _node_data, _node_id, _node_type, extract_graph_context


SKIP_TYPES = frozenset({"start", "end", "paper_section"})

TYPE_TO_SECTION: dict[str, str] = {
    "literature": "Related Work",
    "concept": "Related Work",
    "idea": "Introduction",
    "question": "Introduction",
    "hypothesis": "Introduction",
    "method": "Methods",
    "experiment": "Methods",
    "data": "Methods",
    "metric": "Results",
    "result": "Results",
    "finding": "Results",
    "figure": "Results",
    "table": "Results",
}


@dataclass
class NodeObligation:
    node_id: str
    node_type: str
    section: str
    label: str
    bib_key: str | None = None
    satisfied: bool = False


@dataclass
class GraphContract:
    """Tracks which graph nodes must appear in which sections and citations."""

    ctx: GraphContext
    obligations: list[NodeObligation] = field(default_factory=list)
    end_notes: str = ""
    literature_keys: list[str] = field(default_factory=list)
    discovered_keys: list[str] = field(default_factory=list)

    @classmethod
    def from_graph(cls, graph: dict[str, Any], discovered_refs: list[dict] | None = None) -> GraphContract:
        ctx = extract_graph_context(graph)
        contract = cls(ctx=ctx)
        contract.discovered_keys = [f"discovered{i}" for i in range(len(discovered_refs or []))]
        contract.literature_keys = [f"lit{i}" for i in range(len(ctx.literature))]

        lit_index = 0
        for node in graph.get("nodes") or []:
            ntype = _node_type(node)
            nid = _node_id(node)
            if not nid:
                continue
            if ntype == "end":
                data = _node_data(node)
                notes = data.get("notes") or data.get("body") or ""
                if notes:
                    contract.end_notes = str(notes)
                continue
            if ntype in SKIP_TYPES:
                continue

            section = TYPE_TO_SECTION.get(ntype, "Discussion")
            data = _node_data(node)
            label = str(node.get("label") or data.get("label") or nid)
            bib_key = None
            if ntype == "literature":
                bib_key = f"lit{lit_index}"
                lit_index += 1

            contract.obligations.append(
                NodeObligation(
                    node_id=nid,
                    node_type=ntype,
                    section=section,
                    label=label,
                    bib_key=bib_key,
                )
            )
        return contract

    def node_ids_for_section(self, section_name: str, explicit_ids: list[str] | None = None) -> list[str]:
        key = section_name.lower()
        if explicit_ids:
            return [str(i) for i in explicit_ids if i]
        return [o.node_id for o in self.obligations if o.section.lower() == key]

    def bib_keys_for_section(self, section_name: str) -> list[str]:
        key = section_name.lower()
        keys: list[str] = []
        if key in ("related work", "related_work"):
            keys.extend(self.literature_keys)
        elif key == "introduction":
            keys.extend(self.discovered_keys[:5])
            keys.extend(self.literature_keys[:3])
        elif key in ("methods", "results", "discussion"):
            keys.extend(self.discovered_keys[:3])
        return keys

    def required_cite_keys(self) -> list[str]:
        return list(self.literature_keys) + list(self.discovered_keys)

    def mark_satisfied(self, content: str, section_name: str) -> None:
        content_lower = content.lower()
        cited = set(re.findall(r"\\cite\{([^}]+)\}", content))
        cited_flat = set()
        for group in cited:
            for k in group.split(","):
                cited_flat.add(k.strip())

        for ob in self.obligations:
            if ob.section.lower() != section_name.lower():
                continue
            if ob.bib_key and ob.bib_key in cited_flat:
                ob.satisfied = True
                continue
            label_words = [w for w in ob.label.split() if len(w) > 4]
            if label_words and any(w.lower() in content_lower for w in label_words[:3]):
                ob.satisfied = True

    def unsatisfied(self) -> list[NodeObligation]:
        return [o for o in self.obligations if not o.satisfied]

    def validate(self) -> dict[str, Any]:
        missing = self.unsatisfied()
        return {
            "passed": len(missing) == 0,
            "total": len(self.obligations),
            "satisfied": len(self.obligations) - len(missing),
            "unsatisfied_nodes": [
                {"id": o.node_id, "type": o.node_type, "section": o.section, "label": o.label}
                for o in missing
            ],
        }

    def summary(self) -> str:
        lines = [
            f"GraphContract: {len(self.obligations)} node obligations",
            f"Literature keys: {', '.join(self.literature_keys) or 'none'}",
            f"Discovered keys: {', '.join(self.discovered_keys) or 'none'}",
        ]
        if self.end_notes:
            lines.append(f"End node notes: {self.end_notes[:300]}")
        for ob in self.obligations[:25]:
            lines.append(f"- [{ob.section}] {ob.node_type}: {ob.label} (id={ob.node_id})")
        return "\n".join(lines)
