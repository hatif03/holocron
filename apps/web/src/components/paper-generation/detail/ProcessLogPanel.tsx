"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui";
import { LogEntry, type LogEvent } from "./LogEntry";

export type { LogEvent };

const PHASE_LABELS: Record<string, string> = {
  planning: "Planning",
  reference_discovery: "Reference Discovery",
  introduction: "Introduction",
  body_sections: "Body Sections",
  typesetting: "Typesetting",
  review: "Review",
  default: "Pipeline",
};

interface ProcessLogPanelProps {
  events: LogEvent[];
  selectedEventIndex: number | null;
  onSelectEvent: (index: number) => void;
}

function groupEvents(events: LogEvent[]): Record<string, LogEvent[]> {
  const groups: Record<string, LogEvent[]> = { default: [] };
  let currentPhase = "default";

  for (const ev of events) {
    const phase = (ev.metadata?.phase as string) || inferPhase(ev);
    if (phase && PHASE_LABELS[phase]) currentPhase = phase;
    if (!groups[currentPhase]) groups[currentPhase] = [];
    groups[currentPhase].push(ev);
  }
  return groups;
}

function inferPhase(ev: LogEvent): string {
  const msg = ev.message.toLowerCase();
  if (msg.includes("plan") || ev.agent === "Planner") return "planning";
  if (msg.includes("reference") || msg.includes("search")) return "reference_discovery";
  if (msg.includes("introduction")) return "introduction";
  if (msg.includes("generating") || ev.agent === "Writer") return "body_sections";
  if (ev.agent === "Typesetter") return "typesetting";
  if (ev.agent === "Reviewer") return "review";
  return "default";
}

export function ProcessLogPanel({
  events,
  selectedEventIndex,
  onSelectEvent,
}: ProcessLogPanelProps) {
  const groups = groupEvents(events);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const globalIndex = (phase: string, localIdx: number): number => {
    let idx = 0;
    for (const [p, evs] of Object.entries(groups)) {
      if (p === phase) return idx + localIdx;
      idx += evs.length;
    }
    return localIdx;
  };

  return (
    <Card className="p-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
      <h2 className="font-semibold mb-3 text-sm">Process Log</h2>
      {events.length === 0 && (
        <p className="text-sm text-muted-foreground">Waiting for agent activity...</p>
      )}
      {Object.entries(groups).map(([phase, evs]) => {
        if (!evs.length) return null;
        const isCollapsed = collapsed[phase];
        const label = PHASE_LABELS[phase] || phase;
        const done = evs.some((e) => e.event_type === "completed");

        return (
          <div key={phase} className="mb-3 border-b border-border/50 pb-2 last:border-0">
            <button
              type="button"
              onClick={() => setCollapsed({ ...collapsed, [phase]: !isCollapsed })}
              className="flex items-center gap-2 w-full text-left py-1"
            >
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : isCollapsed ? (
                <ChevronRight className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0" />
              )}
              <span className="font-medium text-sm">{label}</span>
              <span className="ml-auto text-xs text-muted-foreground">{evs.length}</span>
            </button>
            {!isCollapsed && (
              <div className="pl-2 mt-1 space-y-0.5 border-l-2 border-emerald-200 ml-2">
                {evs.map((ev, localIdx) => {
                  const gIdx = globalIndex(phase, localIdx);
                  return (
                    <LogEntry
                      key={gIdx}
                      event={ev}
                      selected={selectedEventIndex === gIdx}
                      onClick={() => onSelectEvent(gIdx)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}
