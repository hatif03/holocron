"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Network, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SimpleDialog } from "@/components/ui/simple-dialog";
import { formatDate } from "@/lib/utils";

interface Work {
  id: string;
  title: string;
  description: string;
  is_template: boolean;
  node_count: string;
  edge_count: string;
  ref_count: string;
  updated_at: string;
}

export default function ResearchGraphPage() {
  const [works, setWorks] = useState<Work[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async (q = "") => {
    const res = await fetch(`/api/works?search=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (Array.isArray(data)) setWorks(data);
  };

  useEffect(() => {
    load();
  }, []);

  const createWork = async () => {
    if (!title.trim()) return;
    setLoading(true);
    const res = await fetch("/api/works", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    const work = await res.json();
    setLoading(false);
    setModalOpen(false);
    setTitle("");
    setDescription("");
    if (work.id) {
      window.location.href = `/research-graph/${work.id}`;
    } else {
      load();
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3 mb-8">
        <Network className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Research Graph
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visual map of your research
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search works..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(search)}
          />
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          New Work
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {works.map((work) => (
          <Link key={work.id} href={`/research-graph/${work.id}`}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold line-clamp-2">{work.title}</h3>
                {work.is_template && <Badge variant="template">Template</Badge>}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {work.description || "No description"}
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>{work.node_count || 0} nodes</span>
                <span>{work.edge_count || 0} edges</span>
                <span>{work.ref_count || 0} refs</span>
                <span className="ml-auto">{formatDate(work.updated_at)}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {works.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-2">No research works yet</p>
          <p className="text-sm">Create your first work to get started</p>
        </div>
      )}

      <SimpleDialog open={modalOpen} onClose={() => setModalOpen(false)} title="Create New Research Work">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">
              Title <span className="text-primary">*</span>
            </label>
            <Input
              className="mt-1"
              placeholder="Enter work title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              className="mt-1"
              placeholder="Enter work description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createWork} disabled={!title.trim() || loading}>
              Create Work
            </Button>
          </div>
        </div>
      </SimpleDialog>
    </div>
  );
}
