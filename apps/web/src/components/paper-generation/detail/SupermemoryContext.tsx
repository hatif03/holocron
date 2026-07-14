"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { workTag } from "@holocron/shared";
import { MemoryView } from "@/components/memory/MemoryView";
import type { MemoryHit, MemoryProfile } from "@/lib/memory-types";

interface SupermemoryContextProps {
  genId: string;
  workId?: string;
  title?: string;
  isRunning?: boolean;
  phaseQuery?: string;
}

export function SupermemoryContext({
  genId,
  workId,
  title,
  isRunning = false,
  phaseQuery,
}: SupermemoryContextProps) {
  const [open, setOpen] = useState(true);
  const [profile, setProfile] = useState<MemoryProfile>({ static: [], dynamic: [] });
  const [hits, setHits] = useState<MemoryHit[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [query, setQuery] = useState(phaseQuery || title || "plan");

  const load = useCallback(async () => {
    if (!genId) return;
    const q = phaseQuery || title || "plan";
    setQuery(q);
    try {
      const res = await fetch(`/api/generations/${genId}/memory?q=${encodeURIComponent(q)}`);
      const d = await res.json();
      setHits(
        (d.results || []).map((text: string, i: number) => ({
          text,
          type: d.types?.[i] ?? "",
        }))
      );
      setEnabled(d.enabled !== false);
      if (workId) {
        const profRes = await fetch(
          `/api/works/${workId}/memory/profile?q=${encodeURIComponent(q)}`
        );
        const prof = await profRes.json();
        if (prof.profile) setProfile(prof.profile);
        if (prof.hits?.length) {
          setHits(prof.hits);
        }
        setEnabled(prof.enabled !== false);
      }
    } catch {
      setHits([]);
    }
  }, [genId, workId, title, phaseQuery]);

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
        <div className="mt-3">
          <MemoryView
            workId={workId}
            profile={profile}
            hits={hits}
            query={query}
            enabled={enabled}
            compact
            emptyMessage="No memories recalled yet — save the graph or complete a prior generation first."
          />
        </div>
      )}
    </Card>
  );
}
