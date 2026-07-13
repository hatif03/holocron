"use client";

import { useEffect, useState } from "react";
import { Box, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GenerationCard, type GenerationItem } from "@/components/paper-generation/GenerationCard";
import { MetadataWizard } from "@/components/paper-generation/MetadataWizard";

export default function PaperGenerationListPage() {
  const [generations, setGenerations] = useState<GenerationItem[]>([]);
  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);

  const load = async (q = "") => {
    const url = q
      ? `/api/generations?search=${encodeURIComponent(q)}`
      : "/api/generations";
    const res = await fetch(url);
    const data = await res.json();
    if (Array.isArray(data)) setGenerations(data);
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => load(search), 5000);
    return () => clearInterval(interval);
  }, [search]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this generation?")) return;
    await fetch(`/api/generations/${id}`, { method: "DELETE" });
    load(search);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Box className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Paper Generation
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Multi-agent paper pipeline
            </p>
          </div>
        </div>
        <Button onClick={() => setWizardOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Paper
        </Button>
      </div>

      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(search)}
          className="flex-1"
        />
        <Button variant="outline" onClick={() => load(search)}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4">
        {generations.map((gen) => (
          <GenerationCard key={gen.id} gen={gen} onDelete={() => handleDelete(gen.id)} />
        ))}
      </div>

      {generations.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          No paper generations yet. Click New Paper to start from metadata.
        </div>
      )}

      <MetadataWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}
