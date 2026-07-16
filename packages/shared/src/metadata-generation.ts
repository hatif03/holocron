import { z } from "zod";
import { generatePaperConfigSchema } from "./node-types.js";
import { splitBibtexEntries, extractBibKey } from "./bib-utils-shared.js";

export const metadataPaperDraftSchema = z.object({
  title: z.string().default(""),
  idea: z.string().min(1, "Idea / Hypothesis is required"),
  method: z.string().min(1, "Method is required"),
  data: z.string().min(1, "Data is required"),
  experiments: z.string().min(1, "Experiments is required"),
  bibtex: z.string().default(""),
});
export type MetadataPaperDraft = z.infer<typeof metadataPaperDraftSchema>;

export const metadataWizardSteps = [
  "Metadata",
  "References & Files",
  "Options",
  "Confirm",
] as const;
export type MetadataWizardStep = (typeof metadataWizardSteps)[number];

export const metadataGenerationRequestSchema = z.object({
  mode: z.literal("metadata"),
  metadata: metadataPaperDraftSchema,
  config: generatePaperConfigSchema,
  bibtex: z.string().optional(),
});
export type MetadataGenerationRequest = z.infer<
  typeof metadataGenerationRequestSchema
>;

export function buildGraphFromMetadata(
  metadata: MetadataPaperDraft
): { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] } {
  const nodes: Record<string, unknown>[] = [
    {
      id: "start_1",
      type: "start",
      label: "Paper Start",
      data: { paper_title: metadata.title || metadata.idea.slice(0, 80), status: "complete" },
    },
    {
      id: "idea_1",
      type: "idea",
      label: "Research Idea",
      data: { body: metadata.idea, status: "complete" },
    },
    {
      id: "method_1",
      type: "method",
      label: "Method",
      data: { description: metadata.method, status: "complete" },
    },
    {
      id: "data_1",
      type: "data",
      label: "Data",
      data: { description: metadata.data, status: "complete" },
    },
    {
      id: "experiment_1",
      type: "experiment",
      label: "Experiments",
      data: { description: metadata.experiments, status: "complete" },
    },
  ];

  const edges: Record<string, unknown>[] = [
    { source: "start_1", target: "idea_1" },
    { source: "idea_1", target: "method_1" },
    { source: "method_1", target: "data_1" },
    { source: "data_1", target: "experiment_1" },
  ];

  let prevId = "experiment_1";
  const bibEntries = splitBibtexEntries(metadata.bibtex || "");
  bibEntries.forEach((entry, i) => {
    const id = `lit_${i + 1}`;
    const key = extractBibKey(entry);
    nodes.push({
      id,
      type: "literature",
      label: key,
      data: { bibtex: entry, status: "complete" },
    });
    edges.push({ source: prevId, target: id });
    prevId = id;
  });

  nodes.push({
    id: "end_1",
    type: "end",
    label: "Paper End",
    data: { notes: "", status: "none" },
  });
  edges.push({ source: prevId, target: "end_1" });

  return { nodes, edges };
}
