"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
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
  generationStatus?: string;
  agentsReachable?: boolean;
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
  if (ev.event_type === "memory" || ev.agent === "Supermemory") return "planning";
  if (msg.includes("plan") || ev.agent === "Planner") return "planning";
  if (msg.includes("reference") || msg.includes("search")) return "reference_discovery";
  if (msg.includes("introduction")) return "introduction";
  if (msg.includes("generating") || ev.agent === "Writer") return "body_sections";
  if (ev.agent === "Typesetter") return "typesetting";
  if (ev.agent === "Reviewer" || ev.agent === "CitationVerifier") return "review";
  return "default";
}

function isTerminalStatus(status: string): boolean {
  return ["completed", "completed_with_warnings", "failed", "cancelled"].includes(status);
}

export function ProcessLogPanel({
  events,
  selectedEventIndex,
  onSelectEvent,
  isRunning = false,
  generationStatus = "",
  agentsReachable = true,
}: ProcessLogPanelProps) {
  const groups = groupEvents(events);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const terminal = isTerminalStatus(generationStatus);

  return (
    <Card className="p-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
      <h2 className="font-medium text-sm mb-3">Process Log</h2>

      {events.length === 0 && isRunning && (
        <div className="flex items-center gap-3 py-4">
          <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Waiting for agent activity…</p>
        </div>
      )}

      {events.length === 0 && !isRunning && terminal && (
        <div className="flex items-start gap-3 py-4">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p>No log recorded for this generation.</p>
            <p className="text-xs">
              Run{" "}
              <code className="bg-muted px-1 rounded text-[11px]">
                node scripts/backfill-generation-events.mjs &lt;genId&gt;
              </code>{" "}
              to reconstruct from disk artifacts.
            </p>
          </div>
        </div>
      )}

      {events.length === 0 && !isRunning && !terminal && (
        <p className="text-sm text-muted-foreground py-4">No events yet.</p>
      )}

      {!agentsReachable && isRunning && (
        <div className="mb-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Agents service unreachable. Check{" "}
            <a href="/agents" className="underline">/agents</a> health and ensure Docker agents are running.
          </span>
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
