"use client";

import { memo, useCallback } from "react";
import { Handle, Position, NodeResizer, type NodeProps } from "@xyflow/react";
import {
  getNodeTypeLabel,
  getNodeDescription,
  NODE_ICONS,
  TYPE_BADGE_STYLES,
  getTypeBadgeColor,
  type NodeType,
} from "@holocron/shared";
import { MoreVertical, FileText } from "lucide-react";
import { NodeFieldRenderer, NodeAiBadges } from "./fields/NodeFieldRenderer";
import {
  useCanvasStore,
  updateNodeData,
  type NodeStatus,
} from "@/lib/canvas-store";
import { Button } from "@/components/ui";

const NODE_COLORS: Record<string, string> = {
  start: "border-purple-400 bg-purple-50/80",
  end: "border-purple-400 bg-purple-50/80",
  idea: "border-amber-400 bg-amber-50/80",
  question: "border-amber-400 bg-amber-50/80",
  hypothesis: "border-amber-400 bg-amber-50/80",
  literature: "border-blue-400 bg-blue-50/80",
  concept: "border-blue-400 bg-blue-50/80",
  method: "border-green-400 bg-green-50/80",
  experiment: "border-green-400 bg-green-50/80",
  metric: "border-green-400 bg-green-50/80",
  data: "border-green-400 bg-green-50/80",
  result: "border-orange-400 bg-orange-50/80",
  finding: "border-orange-400 bg-orange-50/80",
  figure: "border-orange-400 bg-orange-50/80",
  table: "border-orange-400 bg-orange-50/80",
  paper_section: "border-purple-400 bg-purple-50/80",
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
  const color = NODE_COLORS[type] || "border-gray-300 bg-white";
  const workId = useCanvasStore((s) => s.workId);
  const openGenerateModal = useCanvasStore((s) => s.openGenerateModal);

  const onFieldChange = useCallback(
    (key: string, value: unknown) => {
      updateNodeData(id, { [key]: value });
    },
    [id]
  );

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
            className="text-[10px] rounded border border-border bg-white px-1 py-0.5"
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

        {/* Body */}
        <div className="flex-1 overflow-auto px-3 py-2">
          {type === "end" ? (
            <div className="space-y-2">
              <div className="rounded bg-blue-50 border border-blue-200 px-2 py-1.5 text-[10px] text-blue-800">
                {getNodeDescription("end")}
              </div>
              <NodeFieldRenderer
                nodeType={type}
                data={data as Record<string, unknown>}
                workId={workId}
                onChange={onFieldChange}
                compact
              />
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
            <NodeFieldRenderer
              nodeType={type}
              data={data as Record<string, unknown>}
              workId={workId}
              onChange={onFieldChange}
              compact
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
