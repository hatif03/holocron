"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  getMemoryTraces,
  memoryTraceSummary,
  subscribeMemoryTraces,
  type MemoryTraceEntry,
} from "@/lib/memory-trace";

function formatAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return new Date(iso).toLocaleString();
}

function TraceRow({ entry }: { entry: MemoryTraceEntry }) {
  return (
    <li className="flex items-start gap-2 text-[10px] font-mono py-1 border-b border-border/50 last:border-0">
      <span
        className={
          entry.action === "write"
            ? "text-emerald-600 shrink-0"
            : "text-blue-600 shrink-0"
        }
      >
        {entry.action}
      </span>
      <span className="text-muted-foreground shrink-0">{entry.source}</span>
      <span className="truncate flex-1">{entry.containerTag}</span>
      {entry.count != null && (
        <span className="text-muted-foreground shrink-0">×{entry.count}</span>
      )}
      <span className="text-muted-foreground shrink-0">{formatAgo(entry.at)}</span>
    </li>
  );
}

interface MemoryActivityStripProps {
  className?: string;
  defaultOpen?: boolean;
}

export function MemoryActivityStrip({
  className = "",
  defaultOpen = false,
}: MemoryActivityStripProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [entries, setEntries] = useState<MemoryTraceEntry[]>([]);

  useEffect(() => {
    setEntries(getMemoryTraces());
    return subscribeMemoryTraces(() => setEntries(getMemoryTraces()));
  }, []);

  const { writeCount, readCount, lastAt } = memoryTraceSummary(entries);
  const active = writeCount + readCount > 0;

  if (!active) return null;

  return (
    <div
      className={`border-t border-border bg-muted/30 px-3 py-1.5 ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left text-[11px] text-muted-foreground hover:text-foreground"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
        <span>
          Memory active
          {writeCount > 0 && ` · ${writeCount} write${writeCount === 1 ? "" : "s"}`}
          {readCount > 0 && ` · ${readCount} read${readCount === 1 ? "" : "s"}`}
          {lastAt && ` · last ${formatAgo(lastAt)}`}
        </span>
        <span className="ml-auto">
          {open ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronUp className="h-3 w-3" />
          )}
        </span>
      </button>
      {open && entries.length > 0 && (
        <ul className="mt-1 max-h-28 overflow-y-auto">
          {entries.slice(0, 12).map((e, i) => (
            <TraceRow key={`${e.at}-${i}`} entry={e} />
          ))}
        </ul>
      )}
    </div>
  );
}
