"use client";

import { Download, ExternalLink, BookOpen } from "lucide-react";
import { BackLink } from "@/components/layout/back-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generationFilesUrl } from "@/lib/storage-utils";

interface GenerationHeaderProps {
  gen: Record<string, unknown>;
  genId: string;
  onCancel?: () => void;
  onViewCitations?: () => void;
}

export function GenerationHeader({ gen, genId, onCancel, onViewCitations }: GenerationHeaderProps) {
  const status = String(gen.status || "pending");
  const isRunning = status === "running" || status === "pending";
  const isCompleted = status.includes("completed");
  const pdfUrl = generationFilesUrl(genId, gen.pdf_path as string);

  return (
    <div className="flex items-start justify-between mb-4 gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <BackLink href="/paper-generation" className="mt-1" />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-tight tracking-tight">
            {(gen.title as string) || "Paper Generation"}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
            {isRunning && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Generating...
              </span>
            )}
            {isCompleted && (
              <Badge variant="success">Completed</Badge>
            )}
            {(gen.word_count as number) > 0 && (
              <span>{(gen.word_count as number).toLocaleString()} words</span>
            )}
            {(gen.review_count as number) > 0 && (
              <span>{gen.review_count as number} review(s)</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        {onViewCitations && (
          <Button variant="outline" size="sm" onClick={onViewCitations} className="gap-1.5">
            <BookOpen className="h-4 w-4" />
            Citations
          </Button>
        )}
        {isRunning && onCancel && (
          <Button variant="outline" className="text-red-600 border-red-200" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {pdfUrl && (
          <>
            <Button asChild>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                View PDF
              </a>
            </Button>
            <Button variant="outline" size="icon" asChild>
              <a href={pdfUrl} download>
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
