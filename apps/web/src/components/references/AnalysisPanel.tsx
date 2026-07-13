"use client";

import type { ReferenceAnalysis } from "@holocron/shared";
import { Badge } from "@/components/ui";

interface AnalysisPanelProps {
  analysis: ReferenceAnalysis | null;
  loading?: boolean;
}

export function AnalysisPanel({ analysis, loading }: AnalysisPanelProps) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Analyzing paper...</p>;
  }
  if (!analysis?.summary) return null;

  return (
    <div className="space-y-4 text-sm border-t border-border pt-4">
      <Badge variant="success">Analysis Complete</Badge>
      <div>
        <h4 className="font-serif font-semibold text-teal-800 mb-1">Summary</h4>
        <p className="text-muted-foreground leading-relaxed">{analysis.summary}</p>
      </div>
      {analysis.research_questions?.length ? (
        <div>
          <h4 className="font-serif font-semibold text-teal-800 mb-1">Research Question</h4>
          <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
            {analysis.research_questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {analysis.methods && (
        <div>
          <h4 className="font-serif font-semibold text-teal-800 mb-1">Methods</h4>
          <p className="text-muted-foreground whitespace-pre-wrap">{analysis.methods}</p>
        </div>
      )}
      {analysis.findings && (
        <div>
          <h4 className="font-serif font-semibold text-teal-800 mb-1">Key Findings</h4>
          <p className="text-muted-foreground whitespace-pre-wrap">{analysis.findings}</p>
        </div>
      )}
    </div>
  );
}
