"use client";

import { X } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { LogEvent } from "./LogEntry";

interface DiscoveredRef {
  title?: string;
  authors?: string[];
  year?: number | string;
  abstract?: string;
  source?: string;
  paperId?: string;
}

interface DetailPanelProps {
  mode: "search" | "file" | "pdf" | "memory" | null;
  event: LogEvent | null;
  fileContent: { content: string; words: number; path: string } | null;
  pdfUrl: string | null;
  memoryResults?: string[];
  onClose: () => void;
}

function RefCard({ paper, index }: { paper: DiscoveredRef; index: number }) {
  const authors = Array.isArray(paper.authors)
    ? paper.authors.join(", ")
    : String(paper.authors || "Unknown authors");
  const source = paper.source || "semantic_scholar";

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{paper.title || `Paper ${index + 1}`}</p>
        <span className="text-[10px] uppercase tracking-wide bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded shrink-0">
          {source.replace("_", " ")}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {authors}
        {paper.year ? ` · ${paper.year}` : ""}
      </p>
      {paper.abstract && (
        <p className="text-xs line-clamp-4 text-muted-foreground">{paper.abstract}</p>
      )}
    </div>
  );
}

export function DetailPanel({
  mode,
  event,
  fileContent,
  pdfUrl,
  memoryResults,
  onClose,
}: DetailPanelProps) {
  if (!mode) {
    return (
      <Card className="p-4 flex items-center justify-center min-h-[200px] text-sm text-muted-foreground">
        Select a log entry or file to view details
      </Card>
    );
  }

  const discoveredRefs = (event?.metadata?.discovered_refs as DiscoveredRef[] | undefined) || [];

  return (
    <Card className="p-4 max-h-[calc(100vh-12rem)] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="font-semibold text-sm truncate">
          {mode === "search" && "Search Details — Reference Discovery"}
          {mode === "memory" && "Supermemory — Memory Event"}
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
            {discoveredRefs.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Discovered Papers
                </div>
                {discoveredRefs.map((paper, i) => (
                  <RefCard key={paper.paperId || i} paper={paper} index={i} />
                ))}
              </div>
            )}
          </div>
        )}

        {mode === "memory" && event && (
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Action</div>
              <p className="capitalize">{String(event.metadata?.action || "recall")}</p>
            </div>
            {event.metadata?.section != null && (
              <div>
                <div className="text-xs text-muted-foreground">Linked section</div>
                <p>{String(event.metadata.section)}</p>
              </div>
            )}
            {event.metadata?.containerTag != null && (
              <div>
                <div className="text-xs text-muted-foreground">Container</div>
                <p className="font-mono text-xs">{String(event.metadata.containerTag)}</p>
              </div>
            )}
            {(memoryResults?.length ? memoryResults : event.metadata?.preview ? [String(event.metadata.preview)] : []).map(
              (text, i) => (
                <div key={i}>
                  <div className="text-xs text-muted-foreground">
                    {memoryResults?.length ? `Memory ${i + 1}` : "Preview"}
                  </div>
                  <p className="text-xs bg-violet-50 border border-violet-100 rounded p-3 whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {text}
                  </p>
                </div>
              )
            )}
            <div>
              <div className="text-xs text-muted-foreground">Message</div>
              <p>{event.message}</p>
            </div>
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
