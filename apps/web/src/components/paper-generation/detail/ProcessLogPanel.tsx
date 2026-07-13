"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
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
  isRunning?: boolean;
}

interface GroupedPhase {
  phase: string;
  items: { event: LogEvent; globalIndex: number }[];
}

function groupEvents(events: LogEvent[]): GroupedPhase[] {
  const phaseMap: Record<string, { event: LogEvent; globalIndex: number }[]> = {};
  const phaseOrder: string[] = [];
  let currentPhase = "default";

  events.forEach((ev, globalIndex) => {
    const phase = (ev.metadata?.phase as string) || inferPhase(ev);
    if (phase && PHASE_LABELS[phase]) currentPhase = phase;
    if (!phaseMap[currentPhase]) {
      phaseMap[currentPhase] = [];
      phaseOrder.push(currentPhase);
    }
    phaseMap[currentPhase].push({ event: ev, globalIndex });
  });

  return phaseOrder.map((phase) => ({ phase, items: phaseMap[phase] }));
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
  isRunning = false,
}: ProcessLogPanelProps) {
  const groups = groupEvents(events);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <Card className="p-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
      <h2 className="font-medium text-sm mb-3">Process Log</h2>
      {events.length === 0 && (
        <div className="flex items-center gap-3 py-4">
          <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">
            Waiting for agent activity…
          </p>
        </div>
      )}
      {isRunning && events.length > 0 && (
        <div className="mb-3 flex items-center gap-2 text-xs text-primary">
          <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
          Pipeline active
        </div>
      )}
      {groups.map(({ phase, items: evs }) => {
        if (!evs.length) return null;
        const isCollapsed = collapsed[phase];
        const label = PHASE_LABELS[phase] || phase;
        const done = evs.some(({ event: e }) => e.event_type === "completed");

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
              <div className="pl-2 mt-1 space-y-0.5 border-l-2 border-emerald-500/40 ml-2">
                {evs.map(({ event: ev, globalIndex: gIdx }) => (
                  <LogEntry
                    key={gIdx}
                    event={ev}
                    selected={selectedEventIndex === gIdx}
                    onClick={() => onSelectEvent(gIdx)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}
