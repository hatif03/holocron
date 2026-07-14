"use client";

import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  MousePointer2,
  Hand,
  Lock,
  Unlock,
  Undo2,
  Redo2,
  Plus,
  FileText,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/lib/canvas-store";
import type { Node, Edge } from "@xyflow/react";

interface CanvasToolbarProps {
  zoom: number;
  tool: "select" | "pan";
  onToolChange: (tool: "select" | "pan") => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onSpreadNodes: () => void;
  onAddNode: () => void;
  onGenerate: () => void;
  onRestoreSnapshot: (snapshot: { nodes: Node[]; edges: Edge[] }) => void;
}

export function CanvasToolbar({
  zoom,
  tool,
  onToolChange,
  onZoomIn,
  onZoomOut,
  onFitView,
  onSpreadNodes,
  onAddNode,
  onGenerate,
  onRestoreSnapshot,
}: CanvasToolbarProps) {
  const { nodesLocked, setNodesLocked, undo, redo, canUndo, canRedo } =
    useCanvasStore();

  const handleUndo = () => {
    const snap = undo();
    if (snap) onRestoreSnapshot(snap);
  };

  const handleRedo = () => {
    const snap = redo();
    if (snap) onRestoreSnapshot(snap);
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-card border border-border rounded-xl px-2 py-1.5 shadow-lg">
      <ToolbarGroup>
        <ToolbarButton onClick={onFitView} title="Fit view">
          <Maximize2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onZoomOut} title="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </ToolbarButton>
        <span className="text-xs font-medium w-10 text-center tabular-nums">
          {zoom}%
        </span>
        <ToolbarButton onClick={onZoomIn} title="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <Divider />

      <ToolbarGroup>
        <ToolbarButton
          active={tool === "select"}
          onClick={() => onToolChange("select")}
          title="Select"
        >
          <MousePointer2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={tool === "pan"}
          onClick={() => onToolChange("pan")}
          title="Pan"
        >
          <Hand className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={nodesLocked}
          onClick={() => setNodesLocked(!nodesLocked)}
          title={nodesLocked ? "Unlock nodes" : "Lock nodes"}
        >
          {nodesLocked ? (
            <Lock className="h-4 w-4" />
          ) : (
            <Unlock className="h-4 w-4" />
          )}
        </ToolbarButton>
      </ToolbarGroup>

      <Divider />

      <ToolbarGroup>
        <ToolbarButton onClick={handleUndo} disabled={!canUndo()} title="Undo">
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleRedo} disabled={!canRedo()} title="Redo">
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <Divider />

      <ToolbarGroup>
        <ToolbarButton onClick={onSpreadNodes} title="Spread nodes">
          <LayoutGrid className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <Divider />

      <Button size="sm" variant="outline" onClick={onAddNode} className="gap-1 h-8">
        <Plus className="h-4 w-4" />
        Add Node
      </Button>
      <Button size="sm" onClick={onGenerate} className="gap-1 h-8">
        <FileText className="h-4 w-4" />
        Generate Paper
      </Button>
    </div>
  );
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function Divider() {
  return <div className="w-px h-6 bg-border mx-1" />;
}

function ToolbarButton({
  children,
  onClick,
  active,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "p-1.5 rounded-md transition-colors disabled:opacity-40",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}
