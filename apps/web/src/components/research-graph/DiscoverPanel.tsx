"use client";

import { useCallback, useState } from "react";
import { Loader2, Search, Plus, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pushMemoryTrace } from "@/lib/memory-trace";
import { similarityBand } from "@/lib/discover-score";
import type { PaperSearchResult } from "@holocron/shared";

type RankedPaper = PaperSearchResult & { similarityScore: number };

const BAND_STYLES = {
  high: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-muted text-muted-foreground",
};

export function DiscoverPanel({ workId }: { workId: string }) {
  const [loading, setLoading] = useState(false);
  const [papers, setPapers] = useState<RankedPaper[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const discover = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/works/${workId}/discover`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Discovery failed");
      setPapers(data.papers || []);
      setQuery(data.query || "");
      if (data.memoryTrace) pushMemoryTrace(data.memoryTrace);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [workId]);

  const addPaper = async (paper: RankedPaper, linkToGraph: boolean) => {
    setActionId(paper.id);
    try {
      const authors = paper.authors?.join(", ") || "";
      const bibtex = `@article{${paper.id},\n  title={${paper.title}},\n  author={${authors}},\n  year={${paper.year ?? ""}}\n}`;
      const res = await fetch(`/api/works/${workId}/discover/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...paper,
          authors,
          bibtex,
          s2_paper_id: paper.id,
          linkToGraph,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      if (data.memoryTrace) pushMemoryTrace(data.memoryTrace);
    } catch (e) {
      setError(String(e));
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Find related papers via Semantic Scholar, ranked by title overlap. Results
        are stored in project memory.
      </p>

      <Button
        size="sm"
        className="w-full gap-2 h-8"
        onClick={discover}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Search className="h-3.5 w-3.5" />
        )}
        Discover related papers
      </Button>

      {query && (
        <p className="text-[10px] text-muted-foreground italic truncate" title={query}>
          Query: {query}
        </p>
      )}
      {error && <p className="text-[11px] text-destructive">{error}</p>}

      {papers.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {papers.length} papers ranked
        </p>
      )}

      <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
        {papers.map((p) => {
          const band = similarityBand(p.similarityScore);
          const pct = Math.round(p.similarityScore * 100);
          return (
            <li
              key={p.id}
              className="rounded border border-border p-2 text-[11px] space-y-1.5"
            >
              <div className="flex items-start gap-2">
                <span
                  className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-medium ${BAND_STYLES[band]}`}
                >
                  {pct}%
                </span>
                <span className="font-medium leading-snug">{p.title}</span>
              </div>
              {p.authors?.length > 0 && (
                <p className="text-muted-foreground line-clamp-1">
                  {p.authors.slice(0, 3).join(", ")}
                  {p.year ? ` (${p.year})` : ""}
                </p>
              )}
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] px-2 gap-1"
                  disabled={actionId === p.id}
                  onClick={() => addPaper(p, false)}
                >
                  <Plus className="h-3 w-3" />
                  Library
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] px-2 gap-1"
                  disabled={actionId === p.id}
                  onClick={() => addPaper(p, true)}
                >
                  <Link2 className="h-3 w-3" />
                  Link node
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
