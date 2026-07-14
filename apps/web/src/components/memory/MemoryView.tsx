"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MemoryHit, MemoryProfile } from "@/lib/memory-types";

interface MemoryViewProps {
  workId?: string;
  profile?: MemoryProfile;
  hits: MemoryHit[];
  query?: string;
  enabled?: boolean;
  compact?: boolean;
  emptyMessage?: string;
}

const TYPE_COLORS: Record<string, string> = {
  planner: "bg-blue-100 text-blue-800",
  writer: "bg-emerald-100 text-emerald-800",
  graph: "bg-orange-100 text-orange-800",
  reference: "bg-purple-100 text-purple-800",
  vlm_review: "bg-gray-100 text-gray-800",
  preference: "bg-violet-100 text-violet-800",
};

function MemoryCard({ hit, compact }: { hit: MemoryHit; compact?: boolean }) {
  const [open, setOpen] = useState(!compact);
  const badgeType = hit.type || String(hit.metadata?.type ?? "");
  const badgeClass = TYPE_COLORS[badgeType] ?? "bg-muted text-muted-foreground";

  return (
    <li className="rounded border border-border bg-muted/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left p-2 hover:bg-muted/40"
      >
        {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
        {badgeType && (
          <Badge className={`text-[9px] px-1 py-0 ${badgeClass}`}>{badgeType}</Badge>
        )}
        {hit.score != null && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            {(hit.score * 100).toFixed(0)}%
          </span>
        )}
        <span className="text-[11px] truncate flex-1">
          {hit.text.slice(0, 80)}{hit.text.length > 80 ? "…" : ""}
        </span>
      </button>
      {open && (
        <div className="px-2 pb-2 space-y-1">
          <p className="text-[11px] leading-snug whitespace-pre-wrap">{hit.text}</p>
          {hit.customId && (
            <p className="text-[10px] font-mono text-muted-foreground">{hit.customId}</p>
          )}
        </div>
      )}
    </li>
  );
}

export function MemoryView({
  workId,
  profile,
  hits,
  query,
  enabled = true,
  compact = false,
  emptyMessage = "No memories found.",
}: MemoryViewProps) {
  if (!enabled) {
    return (
      <p className="text-xs text-muted-foreground italic py-2">
        Supermemory disabled — set SUPERMEMORY_API_KEY in .env
      </p>
    );
  }

  const hasProfile = profile && (profile.static.length > 0 || profile.dynamic.length > 0);

  return (
    <div className="space-y-3">
      {query && (
        <p className="text-xs text-muted-foreground">
          Query: <span className="italic">&quot;{query}&quot;</span>
        </p>
      )}

      {hasProfile && (
        <div className="space-y-2">
          {profile!.static.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Static Profile
              </p>
              <ul className="text-[11px] space-y-1">
                {profile!.static.map((s, i) => (
                  <li key={i} className="bg-violet-50/50 border border-violet-100 rounded p-2">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {profile!.dynamic.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Dynamic Profile
              </p>
              <ul className="text-[11px] space-y-1">
                {profile!.dynamic.map((s, i) => (
                  <li key={i} className="bg-violet-50/50 border border-violet-100 rounded p-2">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {hits.length > 0 ? (
        <ul className="space-y-1.5 max-h-48 overflow-y-auto">
          {hits.map((hit, i) => (
            <MemoryCard key={hit.customId ?? i} hit={hit} compact={compact} />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground italic py-2">{emptyMessage}</p>
      )}

      {workId && (
        <p className="text-[10px] text-muted-foreground font-mono">work_{workId}</p>
      )}
    </div>
  );
}
