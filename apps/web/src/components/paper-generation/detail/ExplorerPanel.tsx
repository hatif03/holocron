"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface FileNode {
  name: string;
  path: string;
  size: number;
  type: "file" | "folder";
  children?: FileNode[];
}

interface ExplorerPanelProps {
  fileTree: FileNode[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIconChar(name: string): string {
  if (name.endsWith(".pdf")) return "P";
  if (name.endsWith(".bib")) return "B";
  if (name.endsWith(".tex")) return "T";
  return "F";
}

function TreeNode({
  node,
  selectedPath,
  onSelectFile,
  depth = 0,
}: {
  node: FileNode;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  depth?: number;
}) {
  const [open, setOpen] = useState(depth < 1);
  const isFolder = node.type === "folder";

  if (isFolder) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 w-full text-left py-0.5 text-xs hover:bg-muted rounded px-1"
          style={{ paddingLeft: depth * 12 + 4 }}
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className="font-medium">{node.name}/</span>
          <span className="text-muted-foreground ml-auto">
            {node.children?.length || 0}
          </span>
        </button>
        {open &&
          node.children?.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              depth={depth + 1}
            />
          ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelectFile(node.path)}
      className={cn(
        "flex items-center gap-2 w-full text-left py-0.5 text-xs hover:bg-muted rounded px-1 font-mono",
        selectedPath === node.path && "bg-primary/10 text-primary"
      )}
      style={{ paddingLeft: depth * 12 + 16 }}
    >
      <span className="w-4 text-center text-[10px]">{fileIconChar(node.name)}</span>
      <span className="truncate flex-1">{node.name}</span>
      <span className="text-muted-foreground shrink-0">{formatSize(node.size)}</span>
    </button>
  );
}

export function ExplorerPanel({ fileTree, selectedPath, onSelectFile }: ExplorerPanelProps) {
  const [reviewMode, setReviewMode] = useState(false);
  const fileCount = fileTree.reduce((acc, n) => acc + (n.children?.length || (n.type === "file" ? 1 : 0)), 0);

  return (
    <Card className="p-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Explorer
          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
            {fileCount}
          </span>
        </h2>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={reviewMode}
            onChange={(e) => setReviewMode(e.target.checked)}
          />
          Review
        </label>
      </div>
      <div className={cn(reviewMode && "opacity-90")}>
        {fileTree.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            selectedPath={selectedPath}
            onSelectFile={onSelectFile}
          />
        ))}
        {fileTree.length === 0 && (
          <p className="text-xs text-muted-foreground">Files will appear as agents generate content.</p>
        )}
      </div>
    </Card>
  );
}
