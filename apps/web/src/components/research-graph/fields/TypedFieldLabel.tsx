"use client";

import type { NodeFieldSpec } from "@holocron/shared";

const LABEL_OVERRIDES: Record<string, string> = {
  body: "Description",
  source_note: "Source note",
  rationale: "Rationale",
  context: "Context",
  bibtex: "BibTeX",
  user_notes: "Notes",
  file_path: "File upload",
  figure_path: "Figure",
  data_path: "Data file",
  pseudo_code: "Pseudo code",
  script_source: "Script source",
  section_name: "Section name",
  draft_notes: "Draft notes",
  related_terms: "Related terms",
  target_value: "Target value",
  columns: "Columns",
  rows: "Rows",
};

export function TypedFieldLabel({
  field,
  compact = false,
}: {
  field: NodeFieldSpec;
  compact?: boolean;
}) {
  const label = LABEL_OVERRIDES[field.key] || field.label;

  if (compact) {
    return (
      <label className="block text-[10px] font-medium text-muted-foreground mb-0.5 capitalize">
        {label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
    );
  }

  return (
    <label className="block text-xs font-medium text-muted-foreground mb-0.5">
      {label}
      {field.required && <span className="text-red-500 ml-0.5">*</span>}
      {field.type === "file" && field.accept && (
        <span className="block text-[10px] font-normal text-muted-foreground/80 mt-0.5">
          Accepts: {field.accept}
        </span>
      )}
    </label>
  );
}
