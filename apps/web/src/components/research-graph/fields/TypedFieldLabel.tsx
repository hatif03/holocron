"use client";

import type { NodeFieldSpec } from "@holocron/shared";

export function TypedFieldLabel({ field }: { field: NodeFieldSpec }) {
  const typePrefix =
    field.type === "file"
      ? "file"
      : field.type === "date"
        ? "date"
        : field.type === "number"
          ? "number"
          : field.type === "textarea"
            ? "string"
            : "string";

  return (
    <label className="block text-[10px] font-mono text-muted-foreground mb-0.5">
      <span className="text-blue-600">{typePrefix}</span>{" "}
      <span>{field.label}</span>
      {field.required && <span className="text-red-500">*</span>}
    </label>
  );
}
