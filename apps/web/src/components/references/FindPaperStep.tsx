"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import type { PaperSearchField, PaperSearchResult, PaperSearchSource } from "@holocron/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchResultRow } from "./SearchResultRow";

interface FindPaperStepProps {
  onSelect: (paper: PaperSearchResult) => void;
  onImportBibTeX: () => void;
}

export function FindPaperStep({ onSelect, onImportBibTeX }: FindPaperStepProps) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<PaperSearchSource>("arxiv");
  const [field, setField] = useState<PaperSearchField>("title");
  const [results, setResults] = useState<PaperSearchResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showS2, setShowS2] = useState(false);

  useEffect(() => {
    fetch("/api/settings/search-sources")
      .then((r) => r.json())
      .then((data) => {
        setShowS2(Boolean(data.semantic_scholar));
        if (data.default) setSource(data.default);
      })
      .catch(() => setShowS2(false));
  }, []);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearchError(null);
    const res = await fetch(
      `/api/references/search?q=${encodeURIComponent(query)}&source=${source}&field=${field}`
    );
    const data = await res.json();
    setResults(data.data || []);
    if (data.error) setSearchError(data.error);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search papers by title, topic, or keywords..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          className="flex-1"
        />
        <Button onClick={search} disabled={loading} className="gap-1 shrink-0">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              checked={source === "arxiv"}
              onChange={() => setSource("arxiv")}
            />
            arXiv
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              checked={source === "google_scholar"}
              onChange={() => setSource("google_scholar")}
            />
            Google Scholar
          </label>
          {showS2 && (
            <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground">
              <input
                type="radio"
                checked={source === "semantic_scholar"}
                onChange={() => setSource("semantic_scholar")}
              />
              Semantic Scholar
            </label>
          )}
        </div>
        {source !== "google_scholar" && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" checked={field === "title"} onChange={() => setField("title")} />
              Title
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" checked={field === "all"} onChange={() => setField("all")} />
              All Fields
            </label>
          </div>
        )}
        <button
          type="button"
          onClick={onImportBibTeX}
          className="ml-auto text-primary text-sm hover:underline"
        >
          Import BibTeX
        </button>
      </div>

      {searchError && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {searchError}. Try arXiv instead.
        </p>
      )}

      {results.length > 0 && (
        <div className="border border-border rounded-lg max-h-64 overflow-y-auto">
          {results.map((paper) => (
            <SearchResultRow
              key={paper.id}
              paper={paper}
              selected={selectedId === paper.id}
              onSelect={() => {
                setSelectedId(paper.id);
                onSelect(paper);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
