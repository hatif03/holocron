"use client";

import {
  getNodeDescription,
  getNodeTypeLabel,
  getTypeBadgeColor,
  NODE_ICONS,
  TYPE_BADGE_STYLES,
  type NodeType,
} from "@holocron/shared";
import type { Node } from "@xyflow/react";
import { X, FileText } from "lucide-react";
import { NodeFieldRenderer } from "./fields/NodeFieldRenderer";
import { FigurePreview } from "./fields/FigurePreview";
import { useCanvasStore, updateNodeData, type NodeStatus } from "@/lib/canvas-store";
import { Button } from "@/components/ui";

const STATUS_LABELS: Record<NodeStatus, string> = {
  none: "None",
  draft: "Draft",
  complete: "Complete",
};

interface InspectorProps {
  node: Node | null;
  onClose: () => void;
}

export function NodeInspector({ node, onClose }: InspectorProps) {
  const workId = useCanvasStore((s) => s.workId);
  const openGenerateModal = useCanvasStore((s) => s.openGenerateModal);

  if (!node) return null;

  const type = (node.data?.nodeType as NodeType) || "idea";
  const label = (node.data?.label as string) || getNodeTypeLabel(type);
  const status = ((node.data?.status as NodeStatus) || "none") as NodeStatus;
  const badgeColor = getTypeBadgeColor(type);

  const onFieldChange = (key: string, value: unknown) => {
    updateNodeData(node.id, { [key]: value });
  };

  const onLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData(node.id, { label: e.target.value });
  };

  const onStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateNodeData(node.id, { status: e.target.value });
  };

  const filePath =
    type === "table"
      ? String(node.data?.data_path || "")
      : String(node.data?.figure_path || "");
  const fileUrlKey = type === "table" ? "data_path_url" : "figure_path_url";

  return (
    <aside className="w-80 border-l border-border bg-card flex flex-col shrink-0">
      <div className="flex items-start gap-2 p-4 border-b border-border">
        <span className="text-lg mt-0.5">{NODE_ICONS[type]}</span>
        <div className="flex-1 min-w-0">
          <input
            value={label}
            onChange={onLabelChange}
            className="w-full font-semibold text-sm bg-transparent border-none outline-none focus:ring-0"
          />
          <span
            className={`inline-flex mt-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
              TYPE_BADGE_STYLES[badgeColor] || TYPE_BADGE_STYLES.blue
            }`}
          >
            {getNodeTypeLabel(type)}
          </span>
        </div>
        <select
          value={status}
          onChange={onStatusChange}
          className="text-[10px] rounded border border-border bg-background px-1.5 py-1 shrink-0"
        >
          {(["none", "draft", "complete"] as NodeStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-muted-foreground hover:text-foreground shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-xs text-muted-foreground">{getNodeDescription(type)}</p>

        {type === "end" && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
            Configure generation settings and click Generate Paper to start the
            multi-agent writing pipeline.
          </div>
        )}

        {(type === "figure" || type === "table") && filePath && (
          <FigurePreview
            path={filePath}
            url={
              node.data?.[fileUrlKey]
                ? String(node.data[fileUrlKey])
                : undefined
            }
            caption={String(node.data?.caption || "")}
            large
          />
        )}

        <NodeFieldRenderer
          nodeType={type}
          data={node.data as Record<string, unknown>}
          workId={workId}
          onChange={onFieldChange}
          showFigurePreview={type === "figure" || type === "table"}
        />

        {type === "end" && (
          <Button className="w-full gap-2" onClick={openGenerateModal}>
            <FileText className="h-4 w-4" />
            Generate Paper
          </Button>
        )}
      </div>
    </aside>
  );
}
