"use client";

import { useEffect, useState } from "react";
import { BookOpen, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReferenceCard, type ReferenceItem } from "@/components/references/ReferenceCard";
import { AddReferenceModal } from "@/components/references/AddReferenceModal";
import { PageHeader } from "@/components/layout/page-header";

export default function ReferencesPage() {
  const [refs, setRefs] = useState<ReferenceItem[]>([]);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editRef, setEditRef] = useState<(ReferenceItem & { bibtex?: string; doi?: string; notes?: string; url?: string }) | null>(null);

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
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <PageHeader
        title="References"
        description="Papers and BibTeX library"
        icon={BookOpen}
        actions={
          <Button
            onClick={() => {
              setEditRef(null);
              setAddOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Reference
          </Button>
        }
      >
        <div className="flex max-w-xl gap-2">
          <Input
            placeholder="Search references..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} variant="outline" className="gap-1">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </PageHeader>

      <div className="space-y-3">
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
          <p className="text-center text-muted-foreground py-12">
            No references yet. Click Add Reference to get started.
          </p>
        )}
      </div>

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
                url: editRef.url,
                doi: editRef.doi,
                notes: editRef.notes,
                bibtex: editRef.bibtex,
                source: "manual",
                analysis: editRef.analysis as ReferenceItem["analysis"],
              }
            : undefined
        }
      />
    </div>
  );
}
