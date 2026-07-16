"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { BibEntry } from "@/lib/bib-utils";
import type { LogEvent } from "./LogEntry";

interface DiscoveredRef {
  title?: string;
  authors?: string[];
  year?: number | string;
  abstract?: string;
  source?: string;
  paperId?: string;
}

export interface CitationsSummary {
  entries: BibEntry[];
  usedKeys: string[];
  missingKeys: string[];
  figurePaths: string[];
}

interface DetailPanelProps {
  mode: "search" | "file" | "pdf" | "memory" | "citations" | "citations_verify" | "image" | null;
  event: LogEvent | null;
  fileContent: { content: string; words: number; path: string } | null;
  pdfUrl: string | null;
  imageUrl?: string | null;
  citations?: CitationsSummary | null;
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

function AssetImagePreview({ src, alt, path }: { src: string; alt: string; path?: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="space-y-2">
      {loading && !error && (
        <div className="flex h-48 items-center justify-center rounded-lg border border-border bg-muted/20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load image. Check that the file exists in the generation output folder.
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={alt}
          decoding="async"
          className={`max-h-[60vh] w-full rounded-lg border border-border object-contain ${loading ? "hidden" : ""}`}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      )}
      {path && <p className="font-mono text-xs text-muted-foreground">{path}</p>}
    </div>
  );
}

function fileTypeLabel(path: string): string {
  if (path.endsWith(".tex")) return "TEX";
  if (path.endsWith(".bib")) return "BIB";
  if (path.endsWith(".csv")) return "CSV";
  if (path.endsWith(".py")) return "PY";
  if (path.endsWith(".json")) return "JSON";
  return "TEXT";
}

function BibEntryCard({ entry }: { entry: BibEntry }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <code className="text-xs font-mono text-primary shrink-0">{entry.key}</code>
        {entry.year && (
          <span className="text-xs text-muted-foreground">{entry.year}</span>
        )}
      </div>
      {entry.title && <p className="text-sm font-medium leading-snug">{entry.title}</p>}
      {entry.authors && (
        <p className="text-xs text-muted-foreground">{entry.authors}</p>
      )}
    </div>
  );
}

export function DetailPanel({
  mode,
  event,
  fileContent,
  pdfUrl,
  imageUrl,
  citations,
  memoryResults,
  onClose,
}: DetailPanelProps) {
  if (!mode) {
    return (
      <Card className="flex min-h-[200px] items-center justify-center p-4 text-sm text-muted-foreground lg:min-h-[420px] lg:flex-1">
        Select a log entry or file to view details
      </Card>
    );
  }

  const discoveredRefs = (event?.metadata?.discovered_refs as DiscoveredRef[] | undefined) || [];
  const uncoveredKeys = (event?.metadata?.uncovered_bib_keys as string[] | undefined) || [];
  const uncoveredLit = (event?.metadata?.uncovered_literature as string[] | undefined) || [];

  const title =
    mode === "search"
      ? "Search Details — Reference Discovery"
      : mode === "memory"
        ? "Supermemory — Memory Event"
        : mode === "citations"
          ? "Bibliography & Citations"
          : mode === "citations_verify"
            ? "Citation Verification"
            : mode === "image"
              ? fileContent?.path.split("/").pop() || "Figure"
              : mode === "file"
                ? fileContent?.path.split("/").pop()
                : mode === "pdf"
                  ? "Paper PDF"
                  : "Details";

  return (
    <Card className="flex min-h-[200px] flex-col overflow-hidden p-4 lg:min-h-[420px] lg:flex-1">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <h2 className="truncate text-sm font-semibold">{title}</h2>
        <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {mode === "search" && event && (
          <div className="space-y-4 text-sm">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Search Query
              </div>
              <p className="rounded-lg border border-border bg-muted/30 p-3 italic">
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
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Discovered Papers ({discoveredRefs.length})
                </div>
                {discoveredRefs.map((paper, i) => (
                  <RefCard key={paper.paperId || i} paper={paper} index={i} />
                ))}
              </div>
            )}
          </div>
        )}

        {mode === "citations" && citations && (
          <div className="space-y-4 text-sm">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Bibliography ({citations.entries.length} entries)
              </div>
              {citations.entries.length === 0 ? (
                <p className="text-xs text-muted-foreground">No references.bib found yet.</p>
              ) : (
                <div className="space-y-2">
                  {citations.entries.map((e) => (
                    <BibEntryCard key={e.key} entry={e} />
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                In-text citations ({citations.usedKeys.length})
              </div>
              {citations.usedKeys.length === 0 ? (
                <p className="text-xs text-muted-foreground">No \\cite{} keys found in sections.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {citations.usedKeys.map((k) => (
                    <code
                      key={k}
                      className={`rounded px-1.5 py-0.5 text-xs font-mono ${
                        citations.missingKeys.includes(k)
                          ? "bg-red-100 text-red-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {k}
                    </code>
                  ))}
                </div>
              )}
            </div>
            {citations.missingKeys.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Missing from bibliography: {citations.missingKeys.join(", ")}
              </div>
            )}
            {citations.figurePaths.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Figures & charts ({citations.figurePaths.length})
                </div>
                <ul className="space-y-1 font-mono text-xs text-muted-foreground">
                  {citations.figurePaths.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {mode === "citations_verify" && event && (
          <div className="space-y-3 text-sm">
            <p>{event.message}</p>
            {uncoveredKeys.length > 0 && (
              <div>
                <div className="mb-1 text-xs font-semibold text-muted-foreground">Uncovered bib keys</div>
                <div className="flex flex-wrap gap-1">
                  {uncoveredKeys.map((k) => (
                    <code key={k} className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-mono text-red-800">
                      {k}
                    </code>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Add \\cite{"{key}"} in Related Work or Introduction sections.
                </p>
              </div>
            )}
            {uncoveredLit.length > 0 && (
              <div>
                <div className="mb-1 text-xs font-semibold text-muted-foreground">Uncovered literature</div>
                <ul className="list-inside list-disc text-xs text-muted-foreground">
                  {uncoveredLit.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </div>
            )}
            {!uncoveredKeys.length && !uncoveredLit.length && (
              <p className="text-xs text-emerald-700">All required citations covered.</p>
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
            {(memoryResults?.length ? memoryResults : event.metadata?.preview ? [String(event.metadata.preview)] : []).map(
              (text, i) => (
                <div key={i}>
                  <div className="text-xs text-muted-foreground">
                    {memoryResults?.length ? `Memory ${i + 1}` : "Preview"}
                  </div>
                  <p className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded border border-violet-100 bg-violet-50 p-3 text-xs">
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
            <div className="mb-2 text-xs text-muted-foreground">
              {fileContent.words > 0 ? `${fileContent.words} words · ` : ""}
              {fileTypeLabel(fileContent.path)}
            </div>
            <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/20 p-3 font-mono text-xs">
              {fileContent.content}
            </pre>
          </div>
        )}

        {mode === "image" && imageUrl && (
          <AssetImagePreview
            src={imageUrl}
            alt={fileContent?.path || "Figure"}
            path={fileContent?.path}
          />
        )}

        {mode === "pdf" && pdfUrl && (
          <iframe
            src={pdfUrl}
            className="h-[60vh] w-full rounded-lg border border-border"
            title="Paper PDF"
          />
        )}
      </div>
    </Card>
  );
}
