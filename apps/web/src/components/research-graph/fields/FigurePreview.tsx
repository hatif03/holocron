"use client";

import { ExternalLink, ImageIcon } from "lucide-react";

interface FigurePreviewProps {
  path: string;
  url?: string;
  caption?: string;
  large?: boolean;
}

export function FigurePreview({ path, url, caption, large = false }: FigurePreviewProps) {
  if (!path) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded border border-dashed border-border bg-muted/20 text-muted-foreground ${
          large ? "h-32 text-sm" : "h-16 text-[10px]"
        }`}
      >
        <ImageIcon className={large ? "h-8 w-8 mb-1" : "h-4 w-4 mb-0.5"} />
        No figure uploaded
      </div>
    );
  }

  const href = url || `/api/works/files?path=${encodeURIComponent(path)}`;
  const isImage = /\.(png|jpe?g|svg|gif|webp)$/i.test(path);

  return (
    <div className="space-y-1">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={href}
          alt={caption || "Figure preview"}
          className={`w-full rounded border border-border object-contain bg-white ${
            large ? "max-h-48" : "max-h-20"
          }`}
        />
      ) : (
        <div className="flex items-center gap-2 rounded border border-border bg-muted/30 px-2 py-1.5 text-xs">
          <ImageIcon className="h-4 w-4" />
          {path.split("/").pop()}
        </div>
      )}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
      >
        Open file <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
