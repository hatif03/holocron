"use client";

import { useEffect, useState } from "react";
import { ExternalLink, TableIcon, Loader2 } from "lucide-react";

interface DataFilePreviewProps {
  path: string;
  url?: string;
  large?: boolean;
}

function parseCsvPreview(text: string, maxRows = 8): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const split = (line: string) =>
    line.split(delimiter).map((c) => c.replace(/^"|"$/g, "").trim());

  const headers = split(lines[0]);
  const rows = lines.slice(1, maxRows + 1).map(split);
  return { headers, rows };
}

export function DataFilePreview({ path, url, large = false }: DataFilePreviewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);

  const href = url || `/api/works/files?path=${encodeURIComponent(path)}`;
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const isTabular = ["csv", "tsv", "txt"].includes(ext);

  useEffect(() => {
    if (!path || !isTabular) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(href)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load file");
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        const parsed = parseCsvPreview(text);
        setHeaders(parsed.headers);
        setRows(parsed.rows);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Preview failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, href, isTabular]);

  if (!path) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded border border-dashed border-border bg-muted/20 text-muted-foreground ${
          large ? "h-32 text-sm" : "h-16 text-[10px]"
        }`}
      >
        <TableIcon className={large ? "h-8 w-8 mb-1" : "h-4 w-4 mb-0.5"} />
        No data file uploaded
      </div>
    );
  }

  if (["xlsx", "xls", "parquet"].includes(ext)) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 rounded border border-border bg-muted/30 px-2 py-1.5 text-xs">
          <TableIcon className="h-4 w-4 shrink-0" />
          <span className="truncate flex-1">{path.split("/").pop()}</span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Spreadsheet preview in browser is limited — open or use in paper generation pipeline.
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
        >
          Download file <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading preview…
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-[10px] text-destructive">
        {error}{" "}
        <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
          Open file
        </a>
      </p>
    );
  }

  if (!headers.length) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] text-primary hover:underline"
      >
        Open {path.split("/").pop()}
      </a>
    );
  }

  return (
    <div className="space-y-1">
      <div className={`overflow-auto rounded border border-border ${large ? "max-h-48" : "max-h-28"}`}>
        <table className="w-full text-left text-[10px]">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-2 py-1 font-medium border-b border-border whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border/50">
                {headers.map((_, ci) => (
                  <td key={ci} className="px-2 py-0.5 whitespace-nowrap max-w-[120px] truncate">
                    {row[ci] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
      >
        Open full file <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
