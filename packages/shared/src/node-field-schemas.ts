import type { NodeType } from "./node-types.js";

export type FieldType = "text" | "textarea" | "date" | "file" | "number";

export interface NodeFieldSpec {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  accept?: string;
  placeholder?: string;
  aiAssist?: boolean;
}

export interface NodeTypeMeta {
  description: string;
  fields: NodeFieldSpec[];
  badgeColor: string;
}

const PDF_ACCEPT = ".pdf";
const DATA_ACCEPT = ".csv,.json,.xlsx,.xls,.txt,.parquet,.tsv";
const IMAGE_ACCEPT = ".png,.jpg,.jpeg,.svg,.pdf";

export const NODE_FIELD_SCHEMAS: Record<NodeType, NodeTypeMeta> = {
  start: {
    description:
      "Paper writing starting point. Define your paper metadata here.",
    badgeColor: "purple",
    fields: [
      {
        key: "paper_title",
        label: "Paper Title",
        type: "text",
        placeholder: "Enter paper title...",
      },
      {
        key: "target_venue",
        label: "Target Venue",
        type: "text",
        placeholder: "e.g., ICML 2025, Nature...",
      },
      {
        key: "deadline",
        label: "Deadline",
        type: "date",
        placeholder: "yyyy/mm/dd",
      },
    ],
  },
  end: {
    description:
      "Paper generation entry point. Configure template and generate your paper.",
    badgeColor: "purple",
    fields: [
      {
        key: "notes",
        label: "Notes",
        type: "textarea",
        placeholder: "Optional notes for generation...",
      },
    ],
  },
  idea: {
    description: "Core research idea or hypothesis statement.",
    badgeColor: "amber",
    fields: [
      {
        key: "body",
        label: "body",
        type: "textarea",
        required: true,
        placeholder: "Describe your research idea...",
        aiAssist: true,
      },
      {
        key: "source_note",
        label: "source_note",
        type: "text",
        placeholder: "Please Input String",
        aiAssist: true,
      },
    ],
  },
  question: {
    description: "Research question to investigate.",
    badgeColor: "amber",
    fields: [
      {
        key: "body",
        label: "body",
        type: "textarea",
        required: true,
        aiAssist: true,
      },
      {
        key: "context",
        label: "context",
        type: "textarea",
        aiAssist: true,
      },
    ],
  },
  hypothesis: {
    description: "Testable hypothesis derived from the research idea.",
    badgeColor: "amber",
    fields: [
      {
        key: "body",
        label: "body",
        type: "textarea",
        required: true,
        aiAssist: true,
      },
      {
        key: "rationale",
        label: "rationale",
        type: "textarea",
        aiAssist: true,
      },
    ],
  },
  literature: {
    description: "Reference paper with BibTeX and optional PDF upload.",
    badgeColor: "blue",
    fields: [
      {
        key: "bibtex",
        label: "bibtex",
        type: "textarea",
        required: true,
        aiAssist: true,
      },
      {
        key: "user_notes",
        label: "user_notes",
        type: "textarea",
        aiAssist: true,
      },
      {
        key: "file_path",
        label: "file_path",
        type: "file",
        accept: PDF_ACCEPT,
        placeholder: "Click or drag file to upload (Accepted: .pdf)",
        aiAssist: true,
      },
    ],
  },
  concept: {
    description: "Theoretical concept or framework.",
    badgeColor: "blue",
    fields: [
      {
        key: "description",
        label: "description",
        type: "textarea",
        aiAssist: true,
      },
      {
        key: "definition",
        label: "definition",
        type: "textarea",
        aiAssist: true,
      },
    ],
  },
  method: {
    description: "Methodology and approach for the research.",
    badgeColor: "green",
    fields: [
      {
        key: "description",
        label: "description",
        type: "textarea",
        aiAssist: true,
      },
      {
        key: "pseudo_code",
        label: "pseudo_code",
        type: "textarea",
        placeholder: "1",
        aiAssist: true,
      },
    ],
  },
  experiment: {
    description: "Experimental design and execution plan.",
    badgeColor: "green",
    fields: [
      {
        key: "description",
        label: "description",
        type: "textarea",
        aiAssist: true,
      },
      {
        key: "environment",
        label: "environment",
        type: "text",
        aiAssist: true,
      },
    ],
  },
  data: {
    description: "Dataset or data source for analysis.",
    badgeColor: "green",
    fields: [
      {
        key: "description",
        label: "description",
        type: "textarea",
        aiAssist: true,
      },
      {
        key: "file_path",
        label: "file_path",
        type: "file",
        accept: DATA_ACCEPT,
        placeholder: "Click or drag file to upload",
        aiAssist: true,
      },
    ],
  },
  metric: {
    description: "Measurement metric or evaluation criterion.",
    badgeColor: "green",
    fields: [
      { key: "name", label: "name", type: "text", aiAssist: true },
      { key: "formula", label: "formula", type: "text", aiAssist: true },
      { key: "unit", label: "unit", type: "text", aiAssist: true },
    ],
  },
  result: {
    description: "Experimental or analytical result.",
    badgeColor: "orange",
    fields: [
      {
        key: "description",
        label: "description",
        type: "textarea",
        aiAssist: true,
      },
      { key: "value", label: "value", type: "text", aiAssist: true },
    ],
  },
  finding: {
    description: "Key finding or conclusion from results.",
    badgeColor: "orange",
    fields: [
      {
        key: "description",
        label: "description",
        type: "textarea",
        aiAssist: true,
      },
      {
        key: "significance",
        label: "significance",
        type: "textarea",
        aiAssist: true,
      },
    ],
  },
  figure: {
    description: "Figure with caption and optional script source.",
    badgeColor: "orange",
    fields: [
      {
        key: "caption",
        label: "caption",
        type: "textarea",
        required: true,
        aiAssist: true,
      },
      {
        key: "figure_path",
        label: "figure_path",
        type: "file",
        accept: IMAGE_ACCEPT,
        aiAssist: true,
      },
      {
        key: "script_source",
        label: "script_source",
        type: "text",
        aiAssist: true,
      },
    ],
  },
  table: {
    description: "Table with caption and data source.",
    badgeColor: "orange",
    fields: [
      {
        key: "caption",
        label: "caption",
        type: "textarea",
        required: true,
        aiAssist: true,
      },
      {
        key: "data_path",
        label: "data_path",
        type: "file",
        accept: DATA_ACCEPT,
        aiAssist: true,
      },
      {
        key: "description",
        label: "description",
        type: "textarea",
        aiAssist: true,
      },
    ],
  },
  paper_section: {
    description: "Paper section outline and content plan.",
    badgeColor: "purple",
    fields: [
      {
        key: "section_name",
        label: "section_name",
        type: "text",
        aiAssist: true,
      },
      {
        key: "outline",
        label: "outline",
        type: "textarea",
        aiAssist: true,
      },
    ],
  },
};

export function getNodeFieldSchema(type: NodeType): NodeTypeMeta {
  return NODE_FIELD_SCHEMAS[type];
}

export function getNodeDescription(type: NodeType): string {
  return NODE_FIELD_SCHEMAS[type].description;
}

export function getDefaultNodeDataFromSchema(
  type: NodeType
): Record<string, unknown> {
  const schema = NODE_FIELD_SCHEMAS[type];
  const data: Record<string, unknown> = { status: "none" };
  for (const field of schema.fields) {
    data[field.key] = field.type === "number" ? 0 : "";
  }
  return data;
}

export function getTypeBadgeColor(type: NodeType): string {
  return NODE_FIELD_SCHEMAS[type].badgeColor;
}

export const TYPE_BADGE_STYLES: Record<string, string> = {
  purple: "bg-purple-100 text-purple-700",
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-emerald-100 text-emerald-700",
  orange: "bg-orange-100 text-orange-700",
};

export const NODE_ICONS: Record<NodeType, string> = {
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
