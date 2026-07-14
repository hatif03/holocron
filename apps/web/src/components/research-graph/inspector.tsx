"use client";

import { useEffect, useState } from "react";
import {
  getNodeDescription,
  getNodeTypeLabel,
  getTypeBadgeColor,
  getDefaultNodeData,
  NODE_ICONS,
  NODE_TYPES,
  TYPE_BADGE_STYLES,
  type NodeType,
} from "@holocron/shared";
import type { Node } from "@xyflow/react";
import { X, FileText } from "lucide-react";
import { NodeFieldRenderer } from "./fields/NodeFieldRenderer";
import { FigurePreview } from "./fields/FigurePreview";
import { useCanvasStore, updateNodeData, type NodeStatus } from "@/lib/canvas-store";
import { Button } from "@/components/ui/button";

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

  const onTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as NodeType;
    const defaults = getDefaultNodeData(newType);
    updateNodeData(node.id, {
      nodeType: newType,
      ...defaults,
      label: node.data?.label || getNodeTypeLabel(newType),
      status: node.data?.status || "none",
    });
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
        <div>
          <label className="text-xs font-medium text-muted-foreground">Node type</label>
          <select
            value={type}
            onChange={onTypeChange}
            className="mt-1 w-full h-9 rounded-lg border border-border px-2 text-xs"
          >
            {NODE_TYPES.map((t) => (
              <option key={t} value={t}>
                {NODE_ICONS[t]} {getNodeTypeLabel(t)}
              </option>
            ))}
          </select>
        </div>

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

        {type === "literature" && (
          <LiteratureRefPicker
            value={String(node.data?.reference_id || "")}
            onSelect={(ref) => {
              onFieldChange("reference_id", ref.id);
              if (ref.bibtex) onFieldChange("bibtex", ref.bibtex);
            }}
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

function LiteratureRefPicker({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (ref: { id: string; bibtex?: string }) => void;
}) {
  const [refs, setRefs] = useState<{ id: string; title: string; bibtex?: string }[]>([]);

  useEffect(() => {
    fetch("/api/references")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRefs(data);
      })
      .catch(() => setRefs([]));
  }, []);

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">Pick from library</label>
      <select
        className="mt-1 w-full h-9 rounded-lg border border-border px-2 text-xs"
        value={value}
        onChange={(e) => {
          const ref = refs.find((r) => r.id === e.target.value);
          if (ref) onSelect(ref);
        }}
      >
        <option value="">— Select reference —</option>
        {refs.map((r) => (
          <option key={r.id} value={r.id}>
            {r.title.slice(0, 60)}
          </option>
        ))}
      </select>
    </div>
  );
}
