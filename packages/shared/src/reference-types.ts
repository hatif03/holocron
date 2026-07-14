import { z } from "zod";

export const paperSearchSourceSchema = z.enum([
  "semantic_scholar",
  "arxiv",
  "google_scholar",
  "manual",
]);
export type PaperSearchSource = z.infer<typeof paperSearchSourceSchema>;

export const paperSearchFieldSchema = z.enum(["title", "all"]);
export type PaperSearchField = z.infer<typeof paperSearchFieldSchema>;

export const referenceAnalysisSchema = z.object({
  summary: z.string().optional(),
  research_questions: z.array(z.string()).optional(),
  methods: z.string().optional(),
  findings: z.string().optional(),
});
export type ReferenceAnalysis = z.infer<typeof referenceAnalysisSchema>;

export const referenceDraftSchema = z.object({
  title: z.string().min(1),
  authors: z.string().default(""),
  year: z.number().nullable().optional(),
  doi: z.string().optional(),
  url: z.string().optional(),
  notes: z.string().optional(),
  bibtex: z.string().optional(),
  s2_paper_id: z.string().optional(),
  arxiv_id: z.string().optional(),
  source: paperSearchSourceSchema.default("manual"),
  pdf_storage_path: z.string().optional(),
  analysis: referenceAnalysisSchema.optional(),
});
export type ReferenceDraft = z.infer<typeof referenceDraftSchema>;

export const paperSearchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  year: z.number().nullable().optional(),
  abstract: z.string().optional(),
  url: z.string().optional(),
  source: paperSearchSourceSchema,
  doi: z.string().optional(),
});
export type PaperSearchResult = z.infer<typeof paperSearchResultSchema>;

export const EVENT_TYPE_COLORS: Record<string, string> = {
  llm: "bg-indigo-100 text-indigo-700",
  search: "bg-orange-100 text-orange-700",
  memory: "bg-violet-100 text-violet-700",
  found: "bg-amber-100 text-amber-800",
  writing: "bg-blue-100 text-blue-700",
  agent: "bg-purple-100 text-purple-700",
  completed: "bg-emerald-100 text-emerald-700",
};

export const GENERATION_PHASES = [
  "planning",
  "reference_discovery",
  "introduction",
  "body_sections",
  "typesetting",
  "review",
] as const;
export type GenerationPhase = (typeof GENERATION_PHASES)[number];
