"""Generate charts from uploaded graph data files."""

from __future__ import annotations

from pathlib import Path
from typing import Any


def _load_dataframe(file_path: str, storage_path: str):
    try:
        import pandas as pd
    except ImportError:
        return None

    if not file_path:
        return None
    rel = file_path.replace("\\", "/")
    src = Path(storage_path) / rel
    if not src.is_file():
        return None
    ext = src.suffix.lower()
    try:
        if ext == ".csv":
            return pd.read_csv(src)
        if ext == ".tsv":
            return pd.read_csv(src, sep="\t")
        if ext in (".xlsx", ".xls"):
            return pd.read_excel(src)
        if ext == ".json":
            return pd.read_json(src)
    except Exception:
        return None
    return None


def _numeric_columns(df) -> list[str]:
    return [c for c in df.columns if str(c) and df[c].dtype.kind in "iufc"]


def _categorical_columns(df) -> list[str]:
    return [c for c in df.columns if c not in _numeric_columns(df)]


def _save_bar_chart(df, out_path: Path, title: str) -> bool:
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        return False

    num_cols = _numeric_columns(df)
    cat_cols = _categorical_columns(df)
    if not num_cols:
        return False

    y_col = num_cols[0]
    if cat_cols:
        x_col = cat_cols[0]
        grouped = df.groupby(x_col, dropna=True)[y_col].mean().sort_values(ascending=False).head(12)
        if grouped.empty:
            return False
        fig, ax = plt.subplots(figsize=(6, 3.5))
        grouped.plot(kind="bar", ax=ax, color="#4f46e5")
        ax.set_xlabel(str(x_col))
        ax.set_ylabel(str(y_col))
    else:
        sample = df[y_col].dropna().head(20)
        if sample.empty:
            return False
        fig, ax = plt.subplots(figsize=(6, 3.5))
        sample.plot(kind="bar", ax=ax, color="#4f46e5")
        ax.set_ylabel(str(y_col))

    ax.set_title(title[:80])
    plt.tight_layout()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return True


def _save_histogram(df, out_path: Path, title: str) -> bool:
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        return False

    num_cols = _numeric_columns(df)
    if not num_cols:
        return False

    col = num_cols[0]
    series = df[col].dropna()
    if series.empty:
        return False

    fig, ax = plt.subplots(figsize=(6, 3.5))
    ax.hist(series, bins=min(20, max(5, len(series) // 5)), color="#0ea5e9", edgecolor="white")
    ax.set_xlabel(str(col))
    ax.set_ylabel("Frequency")
    ax.set_title(title[:80])
    plt.tight_layout()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return True


def generate_charts_from_graph(
    graph: dict[str, Any],
    output_dir: str,
    storage_path: str,
) -> list[dict[str, str]]:
    """Generate bar + histogram PNGs from data/table nodes. Returns figure metadata."""
    from .graph_context import extract_graph_context

    ctx = extract_graph_context(graph)
    fig_dir = Path(output_dir) / "figures"
    generated: list[dict[str, str]] = []
    chart_idx = 0

    sources: list[tuple[dict[str, Any], str]] = []
    for item in ctx.data_sources + ctx.tables:
        path = item.get("data_path") or item.get("file_path") or ""
        if path:
            label = str(item.get("label") or item.get("caption") or "Data")
            sources.append((item, path))

    seen_paths: set[str] = set()
    for item, data_path in sources:
        if data_path in seen_paths:
            continue
        seen_paths.add(data_path)
        df = _load_dataframe(data_path, storage_path)
        if df is None or df.empty:
            continue

        label = str(item.get("label") or item.get("caption") or "Research data")
        bar_name = f"generated_bar_{chart_idx}.png"
        hist_name = f"generated_hist_{chart_idx}.png"
        bar_path = fig_dir / bar_name
        hist_path = fig_dir / hist_name

        if _save_bar_chart(df, bar_path, f"{label} — bar chart"):
            generated.append({
                "path": f"figures/{bar_name}",
                "caption": f"{label}: mean values by category",
                "source": "generated",
            })
        if _save_histogram(df, hist_path, f"{label} — distribution"):
            generated.append({
                "path": f"figures/{hist_name}",
                "caption": f"{label}: frequency distribution",
                "source": "generated",
            })
        chart_idx += 1

    return generated
