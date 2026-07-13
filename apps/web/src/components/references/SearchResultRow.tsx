"use client";

import type { PaperSearchResult } from "@holocron/shared";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

interface SearchResultRowProps {
  paper: PaperSearchResult;
  selected?: boolean;
  onSelect: () => void;
}

export function SearchResultRow({ paper, selected, onSelect }: SearchResultRowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left py-3 px-3 border-b last:border-0 transition-colors",
        selected ? "bg-primary/5" : "hover:bg-muted/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm text-primary">{paper.title}</div>
        <Badge className="shrink-0 capitalize">
          {paper.source === "arxiv" ? "Arxiv" : "S2"}
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {paper.authors.slice(0, 4).join(", ")}
        {paper.authors.length > 4 ? " et al." : ""}
        {paper.year ? ` · ${paper.year}` : ""}
      </div>
      {paper.abstract && (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{paper.abstract}</p>
      )}
    </button>
  );
}
