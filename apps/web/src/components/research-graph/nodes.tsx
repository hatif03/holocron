"use client";

import { memo, useCallback } from "react";
import { Handle, Position, NodeResizer, type NodeProps } from "@xyflow/react";
import {
  getNodeTypeLabel,
  NODE_ICONS,
  TYPE_BADGE_STYLES,
  getTypeBadgeColor,
  type NodeType,
} from "@holocron/shared";
import { MoreVertical, FileText } from "lucide-react";
import { NodeCanvasSummary } from "./NodeCanvasSummary";
import { NodeAiBadges } from "./fields/NodeFieldRenderer";
import {
  useCanvasStore,
  updateNodeData,
  type NodeStatus,
} from "@/lib/canvas-store";
import { Button } from "@/components/ui/button";

const NODE_COLORS: Record<string, string> = {
  start: "border-violet-400/40 bg-violet-500/10",
  end: "border-violet-400/40 bg-violet-500/10",
  paper_section: "border-violet-400/40 bg-violet-500/10",
  idea: "border-amber-400/40 bg-amber-500/10",
  question: "border-amber-400/40 bg-amber-500/10",
  hypothesis: "border-amber-400/40 bg-amber-500/10",
  literature: "border-blue-400/40 bg-blue-500/10",
  concept: "border-blue-400/40 bg-blue-500/10",
  method: "border-emerald-400/40 bg-emerald-500/10",
  experiment: "border-emerald-400/40 bg-emerald-500/10",
  metric: "border-emerald-400/40 bg-emerald-500/10",
  data: "border-emerald-400/40 bg-emerald-500/10",
  result: "border-orange-400/40 bg-orange-500/10",
  finding: "border-orange-400/40 bg-orange-500/10",
  figure: "border-orange-400/40 bg-orange-500/10",
  table: "border-orange-400/40 bg-orange-500/10",
};

const STATUS_LABELS: Record<NodeStatus, string> = {
  none: "None",
  draft: "Draft",
  complete: "Complete",
};

function ResearchNode({ id, data, selected }: NodeProps) {
  const type = (data.nodeType as NodeType) || "idea";
  const label = (data.label as string) || getNodeTypeLabel(type);
  const status = ((data.status as NodeStatus) || "none") as NodeStatus;
  const color = NODE_COLORS[type] || "border-border bg-card";
  const openGenerateModal = useCanvasStore((s) => s.openGenerateModal);

  const onStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData(id, { status: e.target.value });
    },
    [id]
  );

  return (
    <>
      {selected && (
        <NodeResizer
          minWidth={280}
          minHeight={120}
          isVisible={selected}
          lineClassName="!border-primary"
          handleClassName="!w-2 !h-2 !bg-primary !border-primary"
        />
      )}
      <div
        className={`w-full h-full min-w-[280px] rounded-lg border-2 shadow-sm flex flex-col ${color} ${
          selected ? "ring-2 ring-primary ring-offset-1" : ""
        }`}
      >
        <Handle type="target" position={Position.Left} className="!bg-primary !w-2 !h-2" />

        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
          <span className="text-sm">{NODE_ICONS[type]}</span>
          <span className="text-xs font-semibold truncate flex-1">{label}</span>
          <select
            value={status}
            onChange={onStatusChange}
            className="text-[10px] rounded-sm border border-border bg-muted/60 px-1 py-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            {(["none", "draft", "complete"] as NodeStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="p-0.5 text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body — compact preview on canvas; full fields in inspector */}
        <div className="flex-1 overflow-hidden px-3 py-2 max-h-32">
          {type === "end" ? (
            <div className="space-y-2">
              <Button
                size="sm"
                className="w-full gap-1 text-xs h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  openGenerateModal();
                }}
              >
                <FileText className="h-3.5 w-3.5" />
                Generate Paper
              </Button>
            </div>
          ) : (
            <NodeCanvasSummary
              nodeType={type}
              data={data as Record<string, unknown>}
              label={label}
            />
          )}
        </div>

        {/* Footer AI badges */}
        <div className="px-3 pb-2">
          <NodeAiBadges nodeType={type} />
        </div>

        <Handle type="source" position={Position.Right} className="!bg-primary !w-2 !h-2" />
      </div>
    </>
  );
}

export const nodeTypes = {
  research: memo(ResearchNode),
};

export { NODE_COLORS, TYPE_BADGE_STYLES, getTypeBadgeColor };
