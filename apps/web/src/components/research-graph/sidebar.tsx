"use client";

import {
  NODE_CATEGORIES,
  NODE_TYPES,
  getDefaultNodeData,
  getNodeTypeLabel,
  type NodeType,
} from "@holocron/shared";
import type { Node } from "@xyflow/react";

interface SidebarProps {
  nodes: Node[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  workTitle: string;
  workDescription: string;
}

export function GraphSidebar({
  nodes,
  activeTab,
  onTabChange,
  workTitle,
  workDescription,
}: SidebarProps) {
  const tabs = ["Nodes", "References", "Work Info"];

  const grouped = Object.entries(NODE_CATEGORIES).map(([key, cat]) => ({
    key,
    label: cat.label,
    items: nodes.filter((n) =>
      cat.types.includes((n.data?.nodeType as NodeType) || "idea")
    ),
  }));

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col shrink-0">
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
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
              grouped.map(
                (group) =>
                  group.items.length > 0 && (
                    <div key={group.key} className="mb-4">
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                        {group.label} ({group.items.length})
                      </h4>
                      {group.items.map((node) => (
                        <div
                          key={node.id}
                          className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted text-sm"
                        >
                          <span className="truncate">{node.data?.label as string}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                            {getNodeTypeLabel(
                              (node.data?.nodeType as NodeType) || "idea"
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
              )
            )}
          </>
        )}

        {activeTab === "References" && (
          <div className="text-sm text-muted-foreground">
            Link references from the References page to literature nodes.
          </div>
        )}

        {activeTab === "Work Info" && (
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
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 bg-card border border-border rounded-xl shadow-xl py-2 max-h-80 overflow-y-auto w-48">
      {NODE_TYPES.map((type) => (
        <button
          key={type}
          onClick={() => {
            onAdd(type);
            onClose();
          }}
          className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center gap-2"
        >
          <span className="text-xs">{getNodeTypeLabel(type)}</span>
        </button>
      ))}
    </div>
  );
}

export { getDefaultNodeData, getNodeTypeLabel };
