"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { workTag } from "@holocron/shared";

interface SupermemoryContextProps {
  genId: string;
  workId?: string;
  title?: string;
  isRunning?: boolean;
}

export function SupermemoryContext({
  genId,
  workId,
  title,
  isRunning = false,
}: SupermemoryContextProps) {
  const [open, setOpen] = useState(true);
  const [results, setResults] = useState<string[]>([]);
  const [query, setQuery] = useState(title || "plan");

  const load = useCallback(async () => {
    if (!genId) return;
    const q = title || "plan";
    try {
      const res = await fetch(`/api/generations/${genId}/memory?q=${encodeURIComponent(q)}`);
      const d = await res.json();
      setResults(d.results || []);
      if (d.query) setQuery(d.query);
    } catch {
      setResults([]);
    }
  }, [genId, title]);

  useEffect(() => {
    load();
    if (!isRunning) return;
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, [load, isRunning]);

  return (
    <Card className="p-4 mb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Brain className="h-4 w-4 text-violet-600" />
        <span className="font-medium text-sm">Supermemory Context</span>
        {isRunning && (
          <span className="text-[10px] text-violet-600 ml-1 animate-pulse">live</span>
        )}
        {workId && (
          <span className="text-[10px] text-muted-foreground ml-auto font-mono">
            {workTag(workId)}
          </span>
        )}
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Memories recalled for &quot;{query}&quot;
            {isRunning ? " (updating every 2s)" : " at generation start"}.
          </p>
          {results.length > 0 ? (
            <ul className="space-y-1.5 max-h-40 overflow-y-auto">
              {results.map((r, i) => (
                <li
                  key={i}
                  className="text-xs bg-violet-50 border border-violet-100 rounded p-2 whitespace-pre-wrap line-clamp-4"
                >
                  {r}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No memories recalled yet — save the graph or complete a prior generation first.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
