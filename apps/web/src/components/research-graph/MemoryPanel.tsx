"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { workTag } from "@holocron/shared";

interface MemoryPanelProps {
  workId: string;
}

export function MemoryPanel({ workId }: MemoryPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [smStatus, setSmStatus] = useState<string>("checking");

  useEffect(() => {
    fetch("/api/agents/health")
      .then((r) => r.json())
      .then((h) => setSmStatus(h.supermemory || "unknown"))
      .catch(() => setSmStatus("unreachable"));
  }, []);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    const res = await fetch(
      `/api/works/${workId}/memory/search?q=${encodeURIComponent(query)}&limit=8`
    );
    const data = await res.json();
    setResults(data.results || []);
    setLoading(false);
  }, [workId, query]);

  const statusVariant =
    smStatus === "ok"
      ? "success"
      : smStatus === "disabled"
        ? "default"
        : "default";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Brain className="h-3.5 w-3.5" />
          <span title="Powered by Supermemory — see docs/SUPERMEMORY.md">
            Supermemory
          </span>
        </div>
        <Badge variant={statusVariant} className="text-[10px]">
          {smStatus}
        </Badge>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Memories stored when you save the graph, upload PDFs, analyze references,
        or run paper generation. Scoped to{" "}
        <code className="text-[10px] bg-muted px-1 rounded">{workTag(workId)}</code>.
      </p>

      <div className="flex gap-1">
        <Input
          placeholder="Search memories..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          className="h-8 text-xs"
        />
        <Button size="sm" variant="outline" onClick={search} disabled={loading} className="shrink-0 h-8 px-2">
          <Search className="h-3.5 w-3.5" />
        </Button>
      </div>

      {results.length > 0 ? (
        <ul className="space-y-2">
          {results.map((snippet, i) => (
            <li
              key={i}
              className="text-[11px] leading-snug rounded border border-border bg-muted/30 p-2 line-clamp-4"
            >
              {snippet}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground py-4 text-center">
          {query ? "No memories found." : "Search to recall stored context."}
        </p>
      )}
    </div>
  );
}
