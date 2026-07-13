"use client";

import Link from "next/link";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { Badge, Button } from "@/components/ui";

interface GenerationHeaderProps {
  gen: Record<string, unknown>;
  genId: string;
  onCancel?: () => void;
}

function fileHref(genId: string, pdfPath?: string) {
  if (!pdfPath) return null;
  const rel = String(pdfPath).includes("generations/")
    ? String(pdfPath).replace(/^.*storage[\\/]/, "").replace(/\\/g, "/")
    : `generations/${genId}/${String(pdfPath).split(/[/\\]/).pop()}`;
  return `/api/works/files?path=${encodeURIComponent(rel)}`;
}

export function GenerationHeader({ gen, genId, onCancel }: GenerationHeaderProps) {
  const status = String(gen.status || "pending");
  const isRunning = status === "running" || status === "pending";
  const isCompleted = status.includes("completed");
  const pdfUrl = fileHref(genId, gen.pdf_path as string);

  return (
    <div className="flex items-start justify-between mb-4 gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <Link
          href="/paper-generation"
          className="mt-1 p-1 rounded hover:bg-muted text-muted-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold leading-tight text-accent-yellow tracking-wide">
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
        {isRunning && onCancel && (
          <Button variant="outline" className="text-red-600 border-red-200" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {pdfUrl && (
          <>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              <ExternalLink className="h-4 w-4" />
              View PDF
            </a>
            <a
              href={pdfUrl}
              download
              className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-border hover:bg-muted"
            >
              <Download className="h-4 w-4" />
            </a>
          </>
        )}
      </div>
    </div>
  );
}
