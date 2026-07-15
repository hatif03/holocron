"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { workTag } from "@holocron/shared";
import { MemoryView } from "@/components/memory/MemoryView";
import { MemoryActivityStrip } from "@/components/memory/MemoryActivityStrip";
import { buildReadTrace, pushMemoryTrace } from "@/lib/memory-trace";
import type { MemoryHit, MemoryProfile } from "@/lib/memory-types";

interface MemoryPanelProps {
  workId: string;
  refreshKey?: string | number;
}

export function MemoryPanel({ workId, refreshKey = 0 }: MemoryPanelProps) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<MemoryHit[]>([]);
  const [profile, setProfile] = useState<MemoryProfile>({ static: [], dynamic: [] });
  const [loading, setLoading] = useState(false);
  const [smStatus, setSmStatus] = useState<string>("checking");
  const [enabled, setEnabled] = useState(true);
  const [showActivity, setShowActivity] = useState(false);

  const loadProfile = useCallback(async () => {
    const res = await fetch(`/api/works/${workId}/memory/profile`);
    const d = await res.json();
    if (d.profile) setProfile(d.profile);
    if (d.hits) setHits(d.hits);
    setEnabled(d.enabled !== false);
  }, [workId]);

  useEffect(() => {
    fetch("/api/agents/health")
      .then((r) => r.json())
      .then((h) => setSmStatus(h.supermemory || "unknown"))
      .catch(() => setSmStatus("unreachable"));

    loadProfile().catch(() => {});
  }, [workId, refreshKey, loadProfile]);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    const [searchRes, profileRes] = await Promise.all([
      fetch(`/api/works/${workId}/memory/search?q=${encodeURIComponent(query)}&limit=8`),
      fetch(`/api/works/${workId}/memory/profile?q=${encodeURIComponent(query)}`),
    ]);
    const searchData = await searchRes.json();
    const profileData = await profileRes.json();
    const merged =
      profileData.hits?.length
        ? profileData.hits
        : (searchData.results || []).map((text: string) => ({ text }));
    setHits(merged);
    if (profileData.profile) setProfile(profileData.profile);
    setEnabled(profileData.enabled !== false);
    pushMemoryTrace(
      buildReadTrace(workId, "memory_panel", {
        query,
        count: merged.length,
      })
    );
    setLoading(false);
  }, [workId, query]);

  const statusVariant = smStatus === "ok" ? "success" : "default";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Brain className="h-3.5 w-3.5" />
          <span>Memory</span>
        </div>
        <Badge variant={statusVariant} className="text-[10px]">
          {smStatus}
        </Badge>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Context from graph saves, uploads, discovery, and paper generation. Scoped
        to{" "}
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
        <Button
          size="sm"
          variant="outline"
          onClick={search}
          disabled={loading}
          className="shrink-0 h-8 px-2"
        >
          <Search className="h-3.5 w-3.5" />
        </Button>
      </div>

      <MemoryView
        workId={workId}
        profile={profile}
        hits={hits}
        query={query}
        enabled={enabled}
        emptyMessage={query ? "No memories found." : "Search to recall stored context."}
      />

      <button
        type="button"
        onClick={() => setShowActivity(!showActivity)}
        className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
      >
        {showActivity ? "Hide activity" : "View activity"}
      </button>
      {showActivity && <MemoryActivityStrip defaultOpen />}
    </div>
  );
}
