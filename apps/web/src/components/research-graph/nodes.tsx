"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getNodeTypeLabel } from "@holocron/shared";
import type { NodeType } from "@holocron/shared";

const NODE_ICONS: Record<string, string> = {
  start: "▶",
  end: "⏹",
  idea: "💡",
  question: "❓",
  hypothesis: "🔬",
  literature: "📚",
  concept: "🧠",
  method: "⚙",
  experiment: "🧪",
  metric: "📊",
  data: "💾",
  result: "✅",
  finding: "🔍",
  figure: "📈",
  table: "📋",
  paper_section: "📄",
};

const NODE_COLORS: Record<string, string> = {
  start: "border-purple-400 bg-purple-50",
  end: "border-purple-400 bg-purple-50",
  idea: "border-amber-400 bg-amber-50",
  question: "border-amber-400 bg-amber-50",
  hypothesis: "border-amber-400 bg-amber-50",
  literature: "border-blue-400 bg-blue-50",
  concept: "border-blue-400 bg-blue-50",
  method: "border-green-400 bg-green-50",
  experiment: "border-green-400 bg-green-50",
  metric: "border-green-400 bg-green-50",
  data: "border-green-400 bg-green-50",
  result: "border-orange-400 bg-orange-50",
  finding: "border-orange-400 bg-orange-50",
  figure: "border-orange-400 bg-orange-50",
  table: "border-orange-400 bg-orange-50",
  paper_section: "border-purple-400 bg-purple-50",
};

function ResearchNode({ data, selected }: NodeProps) {
  const type = (data.nodeType as NodeType) || "idea";
  const label = (data.label as string) || getNodeTypeLabel(type);
  const color = NODE_COLORS[type] || "border-gray-300 bg-white";

  return (
    <div
      className={`min-w-[160px] max-w-[240px] rounded-lg border-2 px-3 py-2 shadow-sm ${color} ${
        selected ? "ring-2 ring-primary" : ""
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-primary" />
      <div className="flex items-center gap-2 mb-1">
        <span>{NODE_ICONS[type]}</span>
        <span className="text-xs font-semibold truncate">{label}</span>
      </div>
      {type === "start" && (
        <div className="text-[10px] text-muted-foreground space-y-0.5">
          {(data.paper_title as string) && (
            <div>Title: {String(data.paper_title).slice(0, 30)}</div>
          )}
        </div>
      )}
      {type === "literature" && (data.file_path as string) && (
        <div className="text-[10px] text-muted-foreground truncate">
          PDF attached
        </div>
      )}
      {(data.content as string) && type !== "start" && (
        <div className="text-[10px] text-muted-foreground line-clamp-2">
          {String(data.content).slice(0, 60)}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-primary" />
    </div>
  );
}

export const nodeTypes = {
  research: memo(ResearchNode),
};

export { NODE_ICONS, NODE_COLORS };
