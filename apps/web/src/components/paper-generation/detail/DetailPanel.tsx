"use client";

import { X } from "lucide-react";
import { Card } from "@/components/ui";
import type { LogEvent } from "./LogEntry";

interface DetailPanelProps {
  mode: "search" | "file" | "pdf" | null;
  event: LogEvent | null;
  fileContent: { content: string; words: number; path: string } | null;
  pdfUrl: string | null;
  onClose: () => void;
}

export function DetailPanel({
  mode,
  event,
  fileContent,
  pdfUrl,
  onClose,
}: DetailPanelProps) {
  if (!mode) {
    return (
      <Card className="p-4 flex items-center justify-center min-h-[200px] text-sm text-muted-foreground">
        Select a log entry or file to view details
      </Card>
    );
  }

  return (
    <Card className="p-4 max-h-[calc(100vh-12rem)] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="font-semibold text-sm truncate">
          {mode === "search" && "Search Details — Reference Discovery"}
          {mode === "file" && fileContent?.path.split("/").pop()}
          {mode === "pdf" && "Paper PDF"}
        </h2>
        <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {mode === "search" && event && (
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Search Query
              </div>
              <p className="italic bg-muted/30 rounded-lg p-3 border border-border">
                {String(event.metadata?.search_query || event.message)}
              </p>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Source</div>
              <p>{String(event.metadata?.source || "semantic_scholar")}</p>
            </div>
            {event.metadata?.count != null && (
              <div>
                <div className="text-xs text-muted-foreground">Papers found</div>
                <p>{String(event.metadata.count)}</p>
              </div>
            )}
          </div>
        )}

        {mode === "file" && fileContent && (
          <div>
            <div className="text-xs text-muted-foreground mb-2">
              {fileContent.words} words · TEX
            </div>
            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/20 rounded-lg p-3 border border-border max-h-[60vh] overflow-y-auto">
              {fileContent.content}
            </pre>
          </div>
        )}

        {mode === "pdf" && pdfUrl && (
          <iframe
            src={pdfUrl}
            className="w-full h-[60vh] rounded-lg border border-border"
            title="Paper PDF"
          />
        )}
      </div>
    </Card>
  );
}
