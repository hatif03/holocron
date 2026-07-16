"use client";

import { useEffect, useState } from "react";
import {
  NODE_CATEGORIES,
  NODE_TYPES,
  NODE_ICONS,
  getDefaultNodeData,
  getNodeTypeLabel,
  getTypeBadgeColor,
  TYPE_BADGE_STYLES,
  type NodeType,
} from "@holocron/shared";
import type { Node, Edge } from "@xyflow/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useCanvasStore } from "@/lib/canvas-store";
import { MemoryPanel } from "./MemoryPanel";
import { DiscoverPanel } from "./DiscoverPanel";
import { AskPanel } from "./AskPanel";
import { cn } from "@/lib/utils";

interface SidebarProps {
  workId: string;
  nodes: Node[];
  edges: Edge[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  workTitle: string;
  workDescription: string;
  isTemplate?: boolean;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

export function GraphSidebar({
  workId,
  nodes,
  edges,
  activeTab,
  onTabChange,
  workTitle,
  workDescription,
  isTemplate,
  selectedNodeId,
  onSelectNode,
}: SidebarProps) {
  const tabs = ["Nodes", "Refs", "Discover", "Ask", "Memory", "Info"];
  const lastSavedAt = useCanvasStore((s) => s.lastSavedAt);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const grouped = Object.entries(NODE_CATEGORIES).map(([key, cat]) => ({
    key,
    label: cat.label,
    items: nodes.filter((n) =>
      cat.types.includes((n.data?.nodeType as NodeType) || "idea")
    ),
  }));

  const literatureNodes = nodes.filter(
    (n) => (n.data?.nodeType as NodeType) === "literature"
  );

  const [libraryRefs, setLibraryRefs] = useState<
    { id: string; title: string; authors: string }[]
  >([]);

  useEffect(() => {
    fetch("/api/references")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLibraryRefs(data);
      })
      .catch(() => setLibraryRefs([]));
  }, []);

  const linkedRefIds = new Set(
    literatureNodes
      .map((n) => n.data?.reference_id as string)
      .filter(Boolean)
  );
  const linkedLibraryRefs = libraryRefs.filter((r) => linkedRefIds.has(r.id));

  const toggleCategory = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className="w-[292px] border-r border-sidebar-border bg-sidebar flex flex-col shrink-0">
      <div className="flex border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`shrink-0 px-2.5 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "Nodes" && (
          <>
            {nodes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <div className="text-3xl mb-2">📭</div>
                No nodes yet. Add nodes on the canvas to get started.
              </div>
            ) : (
              grouped.map((group) => {
                if (group.items.length === 0) return null;
                const isCollapsed = collapsed[group.key];
                return (
                  <div key={group.key} className="mb-2">
                    <button
                      type="button"
                      onClick={() => toggleCategory(group.key)}
                      className="flex items-center gap-1 w-full text-xs font-semibold text-muted-foreground mb-1 hover:text-foreground"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      {group.label}
                      <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                        {group.items.length}
                      </span>
                    </button>
                    {!isCollapsed &&
                      group.items.map((node) => {
                        const nodeType =
                          (node.data?.nodeType as NodeType) || "idea";
                        const badgeColor = getTypeBadgeColor(nodeType);
                        const selected = node.id === selectedNodeId;
                        return (
                          <button
                            key={node.id}
                            type="button"
                            onClick={() => onSelectNode(node.id)}
                            className={cn(
                              "flex items-center gap-2 w-full py-1.5 px-2 rounded text-sm text-left transition-colors",
                              selected
                                ? "bg-primary/10 ring-1 ring-primary/30"
                                : "hover:bg-muted"
                            )}
                          >
                            <span className="text-sm shrink-0">{NODE_ICONS[nodeType]}</span>
                            <span className="truncate flex-1">
                              {node.data?.label as string}
                            </span>
                            <span
                              className={cn(
                                "shrink-0 rounded px-1 py-0.5 text-[9px] font-medium",
                                TYPE_BADGE_STYLES[badgeColor] ||
                                  TYPE_BADGE_STYLES.blue
                              )}
                            >
                              {getNodeTypeLabel(nodeType)}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                );
              })
            )}
          </>
        )}

        {activeTab === "Refs" && (
          <div className="space-y-3">
            {linkedLibraryRefs.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">
                  Library links
                </div>
                {linkedLibraryRefs.map((ref) => (
                  <div
                    key={ref.id}
                    className="rounded border border-violet-200 bg-violet-50/50 p-2 text-sm mb-1"
                  >
                    <div className="font-medium truncate">{ref.title}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {ref.authors}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {literatureNodes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No literature nodes yet. Add a Literature node to track references.
              </p>
            ) : (
              literatureNodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => onSelectNode(node.id)}
                  className="w-full text-left rounded border border-border p-2 hover:bg-muted text-sm"
                >
                  <div className="font-medium truncate">
                    {node.data?.label as string}
                  </div>
                  {(node.data?.bibtex as string) ? (
                    <div className="text-[10px] text-muted-foreground line-clamp-2 mt-1 font-mono">
                      {String(node.data.bibtex).slice(0, 80)}…
                    </div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground mt-1">
                      No BibTeX yet
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {activeTab === "Discover" && <DiscoverPanel workId={workId} />}

        {activeTab === "Ask" && <AskPanel workId={workId} />}

        {activeTab === "Memory" && (
          <MemoryPanel workId={workId} refreshKey={lastSavedAt ?? ""} />
        )}

        {activeTab === "Info" && (
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Title</div>
              <div className="font-medium">{workTitle}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Description</div>
              <div>{workDescription || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Nodes</div>
              <div>{nodes.length}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Edges</div>
              <div>{edges.length}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Template</div>
              <div>{isTemplate ? "Yes" : "No"}</div>
            </div>
            {lastSavedAt && (
              <div>
                <div className="text-xs text-muted-foreground">Last saved</div>
                <div className="text-xs">
                  {new Date(lastSavedAt).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

export function AddNodeMenu({
  onAdd,
  open,
  onClose,
}: {
  onAdd: (type: NodeType) => void;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[15] cursor-default"
        aria-label="Close add node menu"
        onClick={onClose}
      />
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 bg-card border border-border rounded-xl shadow-xl py-2 max-h-80 overflow-y-auto w-64">
        {Object.entries(NODE_CATEGORIES).map(([key, cat]) => (
          <div key={key} className="px-2 py-1">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1">
              {cat.label}
            </div>
            {cat.types.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  onAdd(type);
                  onClose();
                }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2 rounded-md"
              >
                <span className="text-base">{NODE_ICONS[type]}</span>
                <span>{getNodeTypeLabel(type)}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

export { getDefaultNodeData, getNodeTypeLabel };
