"use client";

import {
  getNodeFieldSchema,
  type NodeFieldSpec,
  type NodeType,
} from "@holocron/shared";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TypedFieldLabel } from "./TypedFieldLabel";
import { FileDropzone } from "./FileDropzone";
import { FigurePreview } from "./FigurePreview";
import { Calendar } from "lucide-react";

interface NodeFieldRendererProps {
  nodeType: NodeType;
  data: Record<string, unknown>;
  workId: string;
  onChange: (key: string, value: unknown) => void;
  compact?: boolean;
  showFigurePreview?: boolean;
}

function FieldInput({
  field,
  value,
  data,
  workId,
  onChange,
  compact,
  showFigurePreview,
  nodeType,
}: {
  field: NodeFieldSpec;
  value: unknown;
  data: Record<string, unknown>;
  workId: string;
  onChange: (key: string, value: unknown) => void;
  compact?: boolean;
  showFigurePreview?: boolean;
  nodeType: NodeType;
}) {
  const strVal = value != null ? String(value) : "";

  switch (field.type) {
    case "textarea":
      return (
        <Textarea
          value={strVal}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={compact ? "min-h-[48px] text-[11px] py-1.5 px-2" : "text-xs"}
          rows={compact ? 2 : 3}
        />
      );
    case "date":
      return (
        <div className="relative">
          <Input
            type="date"
            value={strVal}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={compact ? "text-[11px] h-8 pr-8" : "text-xs h-9 pr-9"}
          />
          <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
      );
    case "number":
      return (
        <Input
          type="number"
          value={strVal}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={compact ? "text-[11px] h-8" : "text-xs h-9"}
        />
      );
    case "file":
      return (
        <div className="space-y-1">
          <FileDropzone
            workId={workId}
            value={strVal}
            fileUrl={dataUrlFrom(data, field.key)}
            accept={field.accept}
            placeholder={field.placeholder}
            onChange={(path, url) => {
              onChange(field.key, path);
              if (url) onChange(`${field.key}_url`, url);
            }}
            compact={compact}
          />
          {showFigurePreview &&
            (field.key === "figure_path" || nodeType === "figure" || nodeType === "table") && (
              <FigurePreview
                path={strVal}
                url={dataUrlFrom(data, field.key)}
                large={showFigurePreview}
              />
            )}
        </div>
      );
    default:
      return (
        <Input
          value={strVal}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={compact ? "text-[11px] h-8" : "text-xs h-9"}
        />
      );
  }
}

function dataUrlFrom(data: Record<string, unknown>, key: string): string | undefined {
  const urlKey = `${key}_url`;
  return data[urlKey] ? String(data[urlKey]) : undefined;
}

export function NodeFieldRenderer({
  nodeType,
  data,
  workId,
  onChange,
  compact = false,
  showFigurePreview = false,
}: NodeFieldRendererProps) {
  const schema = getNodeFieldSchema(nodeType);

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {schema.fields.map((field) => (
        <div key={field.key}>
          <TypedFieldLabel field={field} compact={compact} />
          <FieldInput
            field={field}
            value={data[field.key]}
            data={data}
            workId={workId}
            onChange={onChange}
            compact={compact}
            showFigurePreview={showFigurePreview}
            nodeType={nodeType}
          />
        </div>
      ))}
    </div>
  );
}

export function NodeAiBadges({ nodeType }: { nodeType: NodeType }) {
  const schema = getNodeFieldSchema(nodeType);
  const aiFields = schema.fields.filter((f) => f.aiAssist);
  if (!aiFields.length) return null;

  return (
    <div className="flex flex-wrap gap-1 pt-1 border-t border-border/50">
      {aiFields.map((f) => (
        <span
          key={f.key}
          className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium bg-violet-100 text-violet-700"
        >
          AI {f.label}
        </span>
      ))}
    </div>
  );
}
