"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReferenceCard, type ReferenceItem } from "@/components/references/ReferenceCard";
import { AddReferenceModal } from "@/components/references/AddReferenceModal";
import { PageToolbar } from "@/components/layout/page-toolbar";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ReferencesPage() {
  const [refs, setRefs] = useState<ReferenceItem[]>([]);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editRef, setEditRef] = useState<
    (ReferenceItem & { bibtex?: string; doi?: string; notes?: string; url?: string }) | null
  >(null);

  const load = async (q = "") => {
    const url = q
      ? `/api/references?search=${encodeURIComponent(q)}`
      : "/api/references";
    const res = await fetch(url);
    const data = await res.json();
    if (Array.isArray(data)) setRefs(data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSearch = () => load(search);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this reference?")) return;
    await fetch(`/api/references/${id}`, { method: "DELETE" });
    load(search);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageToolbar
        title="References"
        description="Papers and BibTeX library"
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditRef(null);
              setAddOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Reference
          </Button>
        }
      >
        <div className="flex w-48 gap-1.5 sm:w-56">
          <Input
            className="h-8 flex-1 text-sm"
            placeholder="Search references..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button size="sm" variant="outline" className="h-8 px-2" onClick={handleSearch}>
            <Search className="h-3.5 w-3.5" />
          </Button>
        </div>
      </PageToolbar>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-2 p-3">
          {refs.map((ref) => (
            <ReferenceCard
              key={ref.id}
              reference={ref}
              onEdit={() => {
                setEditRef(ref);
                setAddOpen(true);
              }}
              onDelete={() => handleDelete(ref.id)}
            />
          ))}
          {refs.length === 0 && (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No references yet. Click Add Reference to get started.
            </p>
          )}
        </div>
      </ScrollArea>

      <AddReferenceModal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setEditRef(null);
        }}
        onSaved={() => load(search)}
        editRef={
          editRef
            ? {
                id: editRef.id,
                title: editRef.title,
                authors: editRef.authors || "",
                year: editRef.year,
                url: editRef.url || "",
                doi: editRef.doi || "",
                notes: editRef.notes || "",
                bibtex: editRef.bibtex || "",
                source: ((editRef as { source?: string }).source || "manual") as
                  | "arxiv"
                  | "semantic_scholar"
                  | "google_scholar"
                  | "manual",
                analysis: editRef.analysis as ReferenceItem["analysis"],
              }
            : undefined
        }
      />
    </div>
  );
}
