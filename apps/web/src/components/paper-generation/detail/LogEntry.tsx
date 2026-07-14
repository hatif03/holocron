"use client";

import { EVENT_TYPE_COLORS } from "@holocron/shared";
import { cn } from "@/lib/utils";

export interface LogEvent {
  id?: string;
  agent: string;
  event_type: string;
  message: string;
  created_at?: string;
  metadata?: Record<string, unknown>;
}

interface LogEntryProps {
  event: LogEvent;
  selected?: boolean;
  onClick?: () => void;
}

export function LogEntry({ event, selected, onClick }: LogEntryProps) {
  const duration = event.metadata?.duration_ms
    ? `${(Number(event.metadata.duration_ms) / 1000).toFixed(1)}s`
    : event.metadata?.duration_s
      ? `${event.metadata.duration_s}s`
      : null;

  const wordCount = event.metadata?.word_count;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left flex gap-2 py-1.5 px-1 rounded transition-colors",
        selected && "bg-primary/5",
        onClick && "hover:bg-muted/50 cursor-pointer"
      )}
    >
      <div className="flex flex-col items-center pt-1">
        <div
          className={cn(
            "h-2 w-2 rounded-full shrink-0",
            event.event_type === "completed"
              ? "bg-emerald-500"
              : event.event_type === "search"
                ? "bg-orange-400"
                : event.event_type === "found"
                  ? "bg-emerald-400"
                  : event.event_type === "llm"
                    ? "bg-blue-500"
                    : event.event_type === "memory"
                      ? "bg-violet-500"
                      : "bg-primary"
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
            {event.agent}
          </span>
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-medium capitalize",
              EVENT_TYPE_COLORS[event.event_type] || "bg-gray-100 text-gray-700"
            )}
          >
            {event.event_type}
          </span>
          {event.event_type === "completed" && (
            <span className="text-emerald-500 text-xs">✓</span>
          )}
          {wordCount != null && (
            <span className="text-[10px] text-muted-foreground">{String(wordCount)} words</span>
          )}
        </div>
        <p className="text-xs mt-0.5 leading-snug">{event.message}</p>
      </div>
      {duration && (
        <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
          {duration}
        </span>
      )}
    </button>
  );
}
