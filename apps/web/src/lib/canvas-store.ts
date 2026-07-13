"use client";

import { create } from "zustand";
import type { Node, Edge } from "@xyflow/react";

export type NodeStatus = "none" | "draft" | "complete";

interface GraphSnapshot {
  nodes: Node[];
  edges: Edge[];
}

interface CanvasStore {
  workId: string;
  selectedNodeId: string | null;
  nodesLocked: boolean;
  genModalOpen: boolean;
  lastSavedAt: string | null;
  history: GraphSnapshot[];
  historyIndex: number;

  setWorkId: (id: string) => void;
  setSelectedNodeId: (id: string | null) => void;
  setNodesLocked: (locked: boolean) => void;
  setGenModalOpen: (open: boolean) => void;
  setLastSavedAt: (ts: string) => void;
  openGenerateModal: () => void;

  pushHistory: (snapshot: GraphSnapshot) => void;
  undo: () => GraphSnapshot | null;
  redo: () => GraphSnapshot | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const MAX_HISTORY = 50;

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  workId: "",
  selectedNodeId: null,
  nodesLocked: false,
  genModalOpen: false,
  lastSavedAt: null,
  history: [],
  historyIndex: -1,

  setWorkId: (id) => set({ workId: id }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setNodesLocked: (locked) => set({ nodesLocked: locked }),
  setGenModalOpen: (open) => set({ genModalOpen: open }),
  setLastSavedAt: (ts) => set({ lastSavedAt: ts }),
  openGenerateModal: () => set({ genModalOpen: true }),

  pushHistory: (snapshot) => {
    const { history, historyIndex } = get();
    const trimmed = history.slice(0, historyIndex + 1);
    trimmed.push(snapshot);
    if (trimmed.length > MAX_HISTORY) trimmed.shift();
    set({ history: trimmed, historyIndex: trimmed.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return null;
    const newIndex = historyIndex - 1;
    set({ historyIndex: newIndex });
    return history[newIndex];
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return null;
    const newIndex = historyIndex + 1;
    set({ historyIndex: newIndex });
    return history[newIndex];
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,
}));

export type UpdateNodeDataFn = (nodeId: string, patch: Record<string, unknown>) => void;

let updateNodeDataRef: UpdateNodeDataFn = () => {};

export function registerUpdateNodeData(fn: UpdateNodeDataFn) {
  updateNodeDataRef = fn;
}

export function updateNodeData(nodeId: string, patch: Record<string, unknown>) {
  updateNodeDataRef(nodeId, patch);
}
