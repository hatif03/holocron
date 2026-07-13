"use client";

import { useEffect, useState, useCallback } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { formatDate } from "@/lib/utils";

interface Event {
  id?: string;
  agent: string;
  event_type: string;
  message: string;
  created_at?: string;
  metadata?: Record<string, unknown>;
}

const EVENT_COLORS: Record<string, string> = {
  writing: "bg-blue-100 text-blue-700",
  agent: "bg-purple-100 text-purple-700",
  llm: "bg-indigo-100 text-indigo-700",
  completed: "bg-emerald-100 text-emerald-700",
};

export default function PaperGenerationDetailPage({
  params,
}: {
  params: Promise<{ genId: string }>;
}) {
  const [genId, setGenId] = useState<string>("");
  const [data, setData] = useState<{
    generation: Record<string, unknown>;
    events: Event[];
    files: string[];
  } | null>(null);

  useEffect(() => {
    params.then((p) => setGenId(p.genId));
  }, [params]);

  const load = useCallback(async () => {
    if (!genId) return;
    const res = await fetch(`/api/generations/${genId}`);
    const json = await res.json();
    setData(json);
  }, [genId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [load]);

  if (!data) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  const gen = data.generation;
  const events = data.events || [];
  const files = data.files || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold">
            {(gen.title as string) || "Paper Generation"}
          </h1>
          <div className="flex gap-3 mt-2 text-sm text-muted-foreground">
            <Badge variant={gen.status === "completed" ? "success" : "default"}>
              {String(gen.status)}
            </Badge>
            {(gen.word_count as number) > 0 && (
              <span>{gen.word_count as number} words</span>
            )}
          </div>
        </div>
        {(gen.pdf_path as string) && (
          <Button variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            View PDF
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Process Log */}
        <Card className="p-4 lg:col-span-1 max-h-[70vh] overflow-y-auto">
          <h2 className="font-semibold mb-4">Process Log</h2>
          <div className="space-y-4">
            {events.length === 0 && (
              <p className="text-sm text-muted-foreground">Waiting for agent activity...</p>
            )}
            {events.map((ev, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      ev.event_type === "completed" ? "bg-emerald-500" : "bg-primary animate-pulse"
                    }`}
                  />
                  {i < events.length - 1 && (
                    <div className="w-px flex-1 bg-border min-h-[24px]" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        EVENT_COLORS[ev.event_type] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {ev.event_type}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {ev.created_at ? formatDate(ev.created_at) : "Just now"}
                    </span>
                  </div>
                  <p className="text-sm">{ev.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ev.agent}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Explorer */}
        <Card className="p-4 lg:col-span-1">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Explorer
          </h2>
          <div className="text-sm space-y-1 font-mono">
            <div className="font-semibold text-muted-foreground mb-2">Sections/</div>
            {files.filter((f) => f.startsWith("sections/")).map((f) => (
              <div key={f} className="pl-3 py-0.5 hover:bg-muted rounded cursor-pointer">
                📄 {f.split("/").pop()}
              </div>
            ))}
            <div className="font-semibold text-muted-foreground mt-4 mb-2">Project Files</div>
            {files.filter((f) => !f.startsWith("sections/")).map((f) => (
              <div key={f} className="pl-3 py-0.5 hover:bg-muted rounded cursor-pointer flex items-center gap-2">
                {f.endsWith(".pdf") ? "📕" : f.endsWith(".bib") ? "📚" : "📝"} {f}
              </div>
            ))}
            {files.length === 0 && (
              <p className="text-muted-foreground pl-3">Files will appear as agents generate content</p>
            )}
          </div>
        </Card>

        {/* Search Details */}
        <Card className="p-4 lg:col-span-1">
          <h2 className="font-semibold mb-4">Search Details — Reference Discovery</h2>
          <div className="text-sm space-y-3">
            <div>
              <div className="text-xs text-muted-foreground">Search Query</div>
              <p className="mt-1 italic">
                {events.find((e) => e.metadata?.search_query)
                  ? String(events.find((e) => e.metadata?.search_query)!.metadata!.search_query)
                  : "Queries will appear when Planner agent discovers references"}
              </p>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Source</div>
              <p>semantic_scholar</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
