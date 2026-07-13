"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { ReferenceAnalysis, ReferenceDraft } from "@holocron/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AnalysisPanel } from "./AnalysisPanel";

interface ReviewAnalyzeStepProps {
  draft: ReferenceDraft;
  onChange: (patch: Partial<ReferenceDraft>) => void;
  onAnalysis: (analysis: ReferenceAnalysis) => void;
}

export function ReviewAnalyzeStep({
  draft,
  onChange,
  onAnalysis,
}: ReviewAnalyzeStepProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ReferenceAnalysis | null>(
    draft.analysis || null
  );

  const analyze = async () => {
    setAnalyzing(true);
    const res = await fetch("/api/references/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: draft.title,
        abstract: draft.notes,
        url: draft.url,
        file_path: draft.pdf_storage_path,
      }),
    });
    const data = await res.json();
    setAnalysis(data);
    onAnalysis(data);
    setAnalyzing(false);
  };

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      <div>
        <label className="text-sm font-medium">
          Title <span className="text-red-500">*</span>
        </label>
        <Input
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Authors</label>
        <Input
          value={draft.authors}
          onChange={(e) => onChange({ authors: e.target.value })}
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Year</label>
          <Input
            type="number"
            value={draft.year ?? ""}
            onChange={(e) =>
              onChange({ year: e.target.value ? parseInt(e.target.value) : null })
            }
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">DOI</label>
          <Input
            value={draft.doi || ""}
            onChange={(e) => onChange({ doi: e.target.value })}
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">URL</label>
        <Input
          value={draft.url || ""}
          onChange={(e) => onChange({ url: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Notes</label>
        <Textarea
          value={draft.notes || ""}
          onChange={(e) => onChange({ notes: e.target.value })}
          className="mt-1"
          rows={3}
        />
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <div className="font-semibold text-sm">AI Paper Analysis</div>
            <p className="text-xs text-muted-foreground">
              Download the paper, extract structure, and identify key research insights automatically.
            </p>
          </div>
        </div>
        <Button onClick={analyze} disabled={analyzing || !draft.title.trim()} size="sm">
          {analyzing ? "Analyzing..." : "Analyze with AI"}
        </Button>
        {draft.url && (
          <p className="text-[10px] text-muted-foreground">
            Will analyze paper via {draft.url.slice(0, 50)}…
          </p>
        )}
      </div>

      <AnalysisPanel analysis={analysis} loading={analyzing} />
    </div>
  );
}
