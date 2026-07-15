"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SimpleDialog } from "@/components/ui/simple-dialog";
import { PageToolbar } from "@/components/layout/page-toolbar";
import { WorkCard, type WorkItem } from "@/components/research-graph/WorkCard";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ResearchGraphPage() {
  const router = useRouter();
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editWork, setEditWork] = useState<WorkItem | null>(null);
  const [deleteWork, setDeleteWork] = useState<WorkItem | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (q = "") => {
    const res = await fetch(`/api/works?search=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (Array.isArray(data)) setWorks(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => load(search), 300);
    return () => clearTimeout(timer);
  }, [search, load]);

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
      router.push(`/research-graph/${work.id}`);
    } else {
      load(search);
    }
  };

  const saveEdit = async () => {
    if (!editWork || !title.trim()) return;
    setLoading(true);
    await fetch(`/api/works/${editWork.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    setLoading(false);
    setEditWork(null);
    setTitle("");
    setDescription("");
    load(search);
  };

  const confirmDelete = async () => {
    if (!deleteWork) return;
    setLoading(true);
    const res = await fetch(`/api/works/${deleteWork.id}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Failed to delete work");
      return;
    }
    setDeleteWork(null);
    load(search);
  };

  const duplicateWork = async (work: WorkItem) => {
    const res = await fetch(`/api/works/${work.id}/duplicate`, { method: "POST" });
    const copy = await res.json();
    if (copy.id) {
      router.push(`/research-graph/${copy.id}`);
    } else {
      load(search);
    }
  };

  const openEdit = (work: WorkItem) => {
    setEditWork(work);
    setTitle(work.title);
    setDescription(work.description || "");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageToolbar
        title="Research Graph"
        description="Visual map of your research"
        actions={
          <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Work
          </Button>
        }
      >
        <div className="relative w-48 sm:w-56">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-sm"
            placeholder="Search works..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </PageToolbar>

      <ScrollArea className="flex-1">
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {works.map((work) => (
            <WorkCard
              key={work.id}
              work={work}
              onEdit={() => openEdit(work)}
              onDelete={() => setDeleteWork(work)}
              onDuplicate={() => duplicateWork(work)}
            />
          ))}
        </div>

        {works.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="mb-1 text-sm font-medium">No research works yet</p>
            <p className="mb-4 text-xs">Create your first work to get started</p>
            <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              New Work
            </Button>
          </div>
        )}
      </ScrollArea>

      <SimpleDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create New Research Work"
      >
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

      <SimpleDialog
        open={!!editWork}
        onClose={() => setEditWork(null)}
        title="Edit Research Work"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              className="mt-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditWork(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={!title.trim() || loading}>
              Save
            </Button>
          </div>
        </div>
      </SimpleDialog>

      <SimpleDialog
        open={!!deleteWork}
        onClose={() => setDeleteWork(null)}
        title="Delete Research Work"
      >
        <p className="mb-4 text-sm text-muted-foreground">
          Delete &quot;{deleteWork?.title}&quot;? This removes all nodes, edges, and cannot be
          undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteWork(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={loading}>
            Delete
          </Button>
        </div>
      </SimpleDialog>
    </div>
  );
}
