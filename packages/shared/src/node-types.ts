import { z } from "zod";
import { getDefaultNodeDataFromSchema } from "./node-field-schemas.js";

export const NODE_TYPES = [
  "start",
  "end",
  "idea",
  "question",
  "hypothesis",
  "literature",
  "concept",
  "method",
  "experiment",
  "metric",
  "data",
  "result",
  "finding",
  "figure",
  "table",
  "paper_section",
] as const;

export type NodeType = (typeof NODE_TYPES)[number];

export const NODE_CATEGORIES: Record<
  string,
  { label: string; types: NodeType[] }
> = {
  ideation: {
    label: "Ideation",
    types: ["idea", "question", "hypothesis"],
  },
  knowledge: {
    label: "Knowledge",
    types: ["literature", "concept"],
  },
  execution: {
    label: "Execution",
    types: ["method", "experiment", "metric", "data"],
  },
  evidence: {
    label: "Evidence",
    types: ["result", "finding", "figure", "table"],
  },
  control: {
    label: "Control",
    types: ["start", "end", "paper_section"],
  },
};

export const nodeTypeSchema = z.enum(NODE_TYPES);

export const graphNodeSchema = z.object({
  id: z.string(),
  type: nodeTypeSchema,
  label: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.unknown()).default({}),
});

export const graphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
});

export const researchWorkSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  userId: z.string().uuid(),
  isTemplate: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const generatePaperConfigSchema = z.object({
  styleGuide: z.enum(["Nature", "IEEE", "ICML"]).default("Nature"),
  targetPages: z.number().min(1).max(50).default(10),
  enablePlanning: z.boolean().default(true),
  enableReviewLoop: z.boolean().default(true),
  maxReviewIterations: z.number().min(1).max(5).default(3),
  pauseForFeedback: z.boolean().default(false),
  compilePdf: z.boolean().default(true),
});

export type GeneratePaperConfig = z.infer<typeof generatePaperConfigSchema>;
export type GraphNode = z.infer<typeof graphNodeSchema>;
export type GraphEdge = z.infer<typeof graphEdgeSchema>;
export type ResearchWork = z.infer<typeof researchWorkSchema>;

export const AGENTS = [
  {
    id: "paper-parser",
    name: "Paper Parser",
    description: "Research paper understanding and parsing agent.",
    endpoints: 1,
  },
  {
    id: "template-parser",
    name: "Template Parser",
    description:
      "Parses LaTeX template packages to extract format rules and structure.",
    endpoints: 1,
  },
  {
    id: "commander",
    name: "Commander",
    description:
      "Orchestrates paper writing by assembling context and compiling prompts for content generation.",
    endpoints: 2,
  },
  {
    id: "writer",
    name: "Writer",
    description:
      "Generates LaTeX content with iterative review for academic quality.",
    endpoints: 2,
  },
  {
    id: "typesetter",
    name: "Typesetter",
    description:
      "Handles resource fetching, template injection, and LaTeX compilation with self-healing.",
    endpoints: 1,
  },
  {
    id: "metadata",
    name: "Metadata",
    description:
      "MetaData-based paper generation (Simple Mode) - generates complete papers from 5 natural language fields + BibTeX references.",
    endpoints: 4,
  },
  {
    id: "reviewer",
    name: "Reviewer",
    description:
      "Reviews paper content and provides feedback for logical consistency and style.",
    endpoints: 2,
  },
  {
    id: "planner",
    name: "Planner",
    description:
      "Creates detailed paragraph-level paper plans and discovers references via Semantic Scholar.",
    endpoints: 2,
  },
  {
    id: "vlm-review",
    name: "Vlm Review",
    description:
      "VLM-based PDF review agent for page overflow, underfill, and layout detection",
    endpoints: 3,
  },
] as const;

export function getDefaultNodeData(type: NodeType): Record<string, unknown> {
  return getDefaultNodeDataFromSchema(type);
}

export function getNodeTypeLabel(type: NodeType): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
