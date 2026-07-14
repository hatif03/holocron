"use client";

import { useRouter } from "next/navigation";
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SimpleDialog } from "@/components/ui/simple-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface WorkActionsMenuProps {
  workId: string;
  title: string;
  description: string;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
}

export function WorkActionsMenu({
  workId,
  title,
  description,
  onTitleChange,
  onDescriptionChange,
}: WorkActionsMenuProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description);
  const [loading, setLoading] = useState(false);

  const saveEdit = async () => {
    if (!editTitle.trim()) return;
    setLoading(true);
    await fetch(`/api/works/${workId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, description: editDescription }),
    });
    onTitleChange(editTitle);
    onDescriptionChange(editDescription);
    setLoading(false);
    setEditOpen(false);
  };

  const duplicate = async () => {
    const res = await fetch(`/api/works/${workId}/duplicate`, { method: "POST" });
    const copy = await res.json();
    if (copy.id) router.push(`/research-graph/${copy.id}`);
  };

  const confirmDelete = async () => {
    setLoading(true);
    const res = await fetch(`/api/works/${workId}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Failed to delete work");
      return;
    }
    router.push("/research-graph");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="outline" className="h-9 w-9">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              setEditTitle(title);
              setEditDescription(description);
              setEditOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
            Edit metadata
          </DropdownMenuItem>
          <DropdownMenuItem onClick={duplicate}>
            <Copy className="h-4 w-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Delete work
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SimpleDialog open={editOpen} onClose={() => setEditOpen(false)} title="Edit Work">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              className="mt-1"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              className="mt-1"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={!editTitle.trim() || loading}>
              Save
            </Button>
          </div>
        </div>
      </SimpleDialog>

      <SimpleDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Work">
        <p className="text-sm text-muted-foreground mb-4">
          Delete this research work permanently?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={loading}>
            Delete
          </Button>
        </div>
      </SimpleDialog>
    </>
  );
}
