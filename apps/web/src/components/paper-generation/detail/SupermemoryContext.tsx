"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import { workTag } from "@holocron/shared";
import type { LogEvent } from "./ProcessLogPanel";

interface RecallEntry {
  action: string;
  section: string;
  query: string;
  message: string;
  preview: string;
  containerTag: string;
  phase: string;
  recalledCount?: number;
  hits?: string[];
  createdAt: string;
}

interface SupermemoryContextProps {
  genId: string;
  workId?: string;
  title?: string;
  isRunning?: boolean;
  phaseQuery?: string;
  events?: LogEvent[];
}

const ACTION_LABELS: Record<string, string> = {
  profile: "Profile",
  search: "Recall",
  store: "Store",
};

export function SupermemoryContext({
  genId,
  workId,
  title,
  isRunning = false,
  events = [],
}: SupermemoryContextProps) {
  const [open, setOpen] = useState(false);
  const [recalls, setRecalls] = useState<RecallEntry[]>([]);

  const load = useCallback(async () => {
    if (!genId) return;
    try {
      const res = await fetch(`/api/generations/${genId}/memory/recalls`);
      if (res.ok) {
        const d = await res.json();
        setRecalls(d.recalls || []);
      }
    } catch {
      setRecalls([]);
    }
  }, [genId]);

  useEffect(() => {
    load();
    if (!isRunning) return;
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [load, isRunning]);

  const fallbackFromEvents = useMemo((): RecallEntry[] => {
    return events
      .filter((e) => e.agent === "Supermemory" && e.event_type === "memory")
      .map((e) => ({
        action: String(e.metadata?.action || "memory"),
        section: String(e.metadata?.section || ""),
        query: String(e.metadata?.query || ""),
        message: e.message,
        preview: String(e.metadata?.preview || ""),
        containerTag: String(e.metadata?.containerTag || ""),
        phase: String(e.metadata?.phase || ""),
        recalledCount: Number(e.metadata?.recalledCount || 0) || undefined,
        hits: Array.isArray(e.metadata?.hits) ? (e.metadata.hits as string[]) : undefined,
        createdAt: String(e.created_at || ""),
      }));
  }, [events]);

  const timeline = recalls.length ? recalls : fallbackFromEvents;
  const searchCount = timeline.filter((r) => r.action === "search").length;
  const storeCount = timeline.filter((r) => r.action === "store").length;

  return (
    <div className="mb-4 rounded-lg border border-border bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <Brain className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Memory trace</span>
        {timeline.length > 0 && (
          <span className="text-[10px] rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">
            {timeline.length} events
          </span>
        )}
        {searchCount > 0 && (
          <span className="text-[10px] text-muted-foreground">{searchCount} recalls</span>
        )}
        {storeCount > 0 && (
          <span className="text-[10px] text-muted-foreground">{storeCount} stores</span>
        )}
        {isRunning && (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        )}
        {workId && (
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
            {workTag(workId)}
          </span>
        )}
      </button>
      {open && (
        <div className="max-h-64 overflow-y-auto border-t border-border/50 px-3 pb-3">
          {timeline.length === 0 ? (
            <p className="py-3 text-xs text-muted-foreground">
              No memory events yet for {title || "this generation"}.
              {isRunning ? " Recalls appear as each section is drafted." : ""}
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {timeline.map((entry, i) => (
                <li key={`${entry.createdAt}-${i}`} className="py-2 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-violet-100 px-1.5 py-0.5 font-medium text-violet-800">
                      {ACTION_LABELS[entry.action] || entry.action}
                    </span>
                    {entry.section && (
                      <span className="text-muted-foreground">{entry.section}</span>
                    )}
                    {entry.phase && (
                      <span className="text-[10px] uppercase text-muted-foreground">
                        {entry.phase}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium">{entry.message}</p>
                  {entry.query && (
                    <p className="text-[10px] italic text-muted-foreground truncate">
                      Query: {entry.query}
                    </p>
                  )}
                  {entry.preview && (
                    <p className="text-[11px] whitespace-pre-wrap rounded border border-violet-100 bg-violet-50/50 p-2 text-muted-foreground line-clamp-4">
                      {entry.preview}
                    </p>
                  )}
                  {entry.hits?.map((hit, j) => (
                    <p
                      key={j}
                      className="text-[11px] whitespace-pre-wrap rounded border border-border bg-muted/30 p-2 text-muted-foreground line-clamp-3"
                    >
                      {hit}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
