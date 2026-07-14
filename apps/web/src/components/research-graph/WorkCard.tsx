"use client";

import Link from "next/link";
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";

export interface WorkItem {
  id: string;
  title: string;
  description: string;
  is_template: boolean;
  node_count: string;
  edge_count: string;
  ref_count: string;
  updated_at: string;
}

interface WorkCardProps {
  work: WorkItem;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function WorkCard({ work, onEdit, onDelete, onDuplicate }: WorkCardProps) {
  return (
    <Card className="p-5 hover:shadow-md transition-shadow group h-full">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link href={`/research-graph/${work.id}`} className="flex-1 min-w-0">
          <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {work.title}
          </h3>
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          {work.is_template && <Badge variant="template">Template</Badge>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={(e) => e.preventDefault()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/research-graph/${work.id}`}>Open</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Link href={`/research-graph/${work.id}`} className="block">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {work.description || "No description"}
        </p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>{work.node_count || 0} nodes</span>
          <span>{work.edge_count || 0} edges</span>
          <span>{work.ref_count || 0} refs</span>
          <span className="ml-auto">{formatDate(work.updated_at)}</span>
        </div>
      </Link>
    </Card>
  );
}
