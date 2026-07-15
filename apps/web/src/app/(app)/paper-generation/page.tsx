"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GenerationCard, type GenerationItem } from "@/components/paper-generation/GenerationCard";
import { MetadataWizard } from "@/components/paper-generation/MetadataWizard";
import { PageToolbar } from "@/components/layout/page-toolbar";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    <div className="flex h-full min-h-0 flex-col">
      <PageToolbar
        title="Paper Generation"
        description="Multi-agent paper pipeline"
        actions={
          <Button size="sm" onClick={() => setWizardOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Paper
          </Button>
        }
      >
        <div className="flex w-48 gap-1.5 sm:w-56">
          <Input
            className="h-8 flex-1 text-sm"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(search)}
          />
          <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => load(search)}>
            <Search className="h-3.5 w-3.5" />
          </Button>
        </div>
      </PageToolbar>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-3">
          {generations.map((gen) => (
            <GenerationCard key={gen.id} gen={gen} onDelete={() => handleDelete(gen.id)} />
          ))}
          {generations.length === 0 && (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No paper generations yet. Click New Paper to start from metadata.
            </p>
          )}
        </div>
      </ScrollArea>

      <MetadataWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}
