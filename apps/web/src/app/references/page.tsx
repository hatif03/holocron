"use client";

import { useEffect, useState } from "react";
import { BookOpen, Plus, Search, Upload } from "lucide-react";
import { Button, Card, Input, Textarea, Dialog, Badge } from "@/components/ui";

interface Reference {
  id: string;
  title: string;
  authors: string;
  year: number;
  analysis: {
    summary?: string;
    research_questions?: string[];
    methods?: string;
    findings?: string;
  };
}

interface SearchResult {
  paperId: string;
  title: string;
  year: number;
  authors: { name: string }[];
  abstract: string;
}

export default function ReferencesPage() {
  const [refs, setRefs] = useState<Reference[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<Reference | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBibtex, setNewBibtex] = useState("");

  const load = async () => {
    const res = await fetch("/api/references");
    const data = await res.json();
    if (Array.isArray(data)) setRefs(data);
  };

  useEffect(() => {
    load();
  }, []);

  const searchPapers = async () => {
    if (!search.trim()) return;
    const res = await fetch(`/api/references/search?q=${encodeURIComponent(search)}`);
    const data = await res.json();
    setResults(data.data || []);
  };

  const addFromSearch = async (paper: SearchResult) => {
    await fetch("/api/references", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: paper.title,
        authors: paper.authors?.map((a) => a.name).join(", "),
        year: paper.year,
        s2_paper_id: paper.paperId,
      }),
    });
    load();
  };

  const analyzeRef = async (ref: Reference) => {
    const res = await fetch("/api/references/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: ref.title }),
    });
    const analysis = await res.json();
    setSelected({ ...ref, analysis });
  };

  const addManual = async () => {
    await fetch("/api/references", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, bibtex: newBibtex }),
    });
    setAddOpen(false);
    setNewTitle("");
    setNewBibtex("");
    load();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="font-serif text-2xl font-bold">References</h1>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Reference
        </Button>
      </div>

      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Search Semantic Scholar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchPapers()}
          className="flex-1"
        />
        <Button onClick={searchPapers} className="gap-2">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>

      {results.length > 0 && (
        <Card className="p-4 mb-6">
          <h3 className="font-semibold mb-3">Search Results</h3>
          {results.map((paper) => (
            <div key={paper.paperId} className="flex items-start justify-between py-3 border-b last:border-0">
              <div>
                <div className="font-medium text-sm">{paper.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {paper.authors?.slice(0, 3).map((a) => a.name).join(", ")} · {paper.year}
                </div>
              </div>
              <Button size="sm" onClick={() => addFromSearch(paper)}>Add</Button>
            </div>
          ))}
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          {refs.map((ref) => (
            <Card
              key={ref.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => analyzeRef(ref)}
            >
              <h3 className="font-medium text-sm">{ref.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {ref.authors} {ref.year && `· ${ref.year}`}
              </p>
            </Card>
          ))}
          {refs.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              No references yet. Search Semantic Scholar or add manually.
            </p>
          )}
        </div>

        {selected && (
          <Card className="p-5">
            <h3 className="font-semibold mb-4">Paper Analysis</h3>
            <div className="space-y-4 text-sm">
              <div>
                <Badge className="mb-2">Summary</Badge>
                <p>{selected.analysis?.summary || "Analyzing..."}</p>
              </div>
              <div>
                <Badge className="mb-2">Research Questions</Badge>
                <ul className="list-disc pl-4">
                  {(selected.analysis?.research_questions || []).map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
              <div>
                <Badge className="mb-2">Methods</Badge>
                <p>{selected.analysis?.methods || "—"}</p>
              </div>
              <div>
                <Badge className="mb-2">Key Findings</Badge>
                <p>{selected.analysis?.findings || "—"}</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add Reference">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">BibTeX (optional)</label>
            <Textarea value={newBibtex} onChange={(e) => setNewBibtex(e.target.value)} className="mt-1" />
          </div>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
            <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Drag and drop PDF files here
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addManual} disabled={!newTitle.trim()}>Add</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
