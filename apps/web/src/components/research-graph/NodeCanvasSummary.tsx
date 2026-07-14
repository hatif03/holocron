"use client";

import { getNodeFieldSchema, type NodeType } from "@holocron/shared";

interface NodeCanvasSummaryProps {
  nodeType: NodeType;
  data: Record<string, unknown>;
  label: string;
}

function previewText(data: Record<string, unknown>, nodeType: NodeType): string {
  const schema = getNodeFieldSchema(nodeType);
  for (const field of schema.fields) {
    const val = data[field.key];
    if (val && typeof val === "string" && val.trim()) {
      return val.trim();
    }
  }
  return "";
}

export function NodeCanvasSummary({ nodeType, data }: NodeCanvasSummaryProps) {
  const preview = previewText(data, nodeType);
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground line-clamp-2">
        {preview || "No content yet — select to edit in inspector."}
      </p>
    </div>
  );
}
