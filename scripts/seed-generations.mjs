#!/usr/bin/env node
/**
 * Seed demo paper generations — one completed generation per research work topic.
 * Usage: node scripts/seed-generations.mjs [--force]
 */
import postgres from "postgres";
import fs from "fs";
import path from "path";
import {
  writeMinimalPdf,
  STORAGE_PATH,
} from "./seed-utils.mjs";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

const STORAGE = STORAGE_PATH;
const force = process.argv.includes("--force");

const DEMO_REFS = [
  {
    paperId: "demo1",
    title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
    year: 2020,
    authors: ["Patrick Lewis", "Ethan Perez"],
    abstract: "We combine parametric and non-parametric memories for language generation.",
    source: "semantic_scholar",
  },
  {
    paperId: "demo2",
    title: "Language Models are Few-Shot Learners",
    year: 2020,
    authors: ["Tom B. Brown"],
    abstract: "GPT-3 demonstrates strong few-shot performance across NLP benchmarks.",
    source: "semantic_scholar",
  },
];

function writeGenerationArtifacts(genId, title) {
  const outDir = path.join(STORAGE, "generations", genId);
  const sectionsDir = path.join(outDir, "sections");
  fs.mkdirSync(sectionsDir, { recursive: true });

  const sections = ["Abstract", "Introduction", "Methods", "Results", "Discussion"];
  for (const name of sections) {
    const words = name === "Abstract" ? 180 : 900;
    const body = Array(Math.ceil(words / 15))
      .fill(
        `${title}: evidence from the research graph supports rigorous methodology and reproducible findings. `
      )
      .join("");
    fs.writeFileSync(
      path.join(sectionsDir, `${name}.tex`),
      name === "Abstract"
        ? `\\begin{abstract}\n${body.trim()}\n\\end{abstract}\n`
        : `\\section{${name}}\n${body.trim()}\n`
    );
  }

  fs.writeFileSync(
    path.join(outDir, "main.tex"),
    [
      "\\documentclass{article}",
      "\\begin{document}",
      ...sections.map((s) => `\\input{sections/${s}.tex}`),
      "\\end{document}",
    ].join("\n") + "\n"
  );
  fs.writeFileSync(
    path.join(outDir, "references.bib"),
    "@article{lewis2020rag, title={RAG for Knowledge-Intensive NLP}, year={2020}}\n"
  );
  writeMinimalPdf(path.join(outDir, "main.pdf"), title);
}

async function seed() {
  const sql = postgres(DATABASE_URL);

  const works = await sql`
    SELECT id, title, is_template
    FROM research_works
    ORDER BY is_template DESC, created_at ASC
  `;

  if (!works.length) {
    console.log("No works found. Run seed-works.mjs first.");
    await sql.end();
    return;
  }

  if (force) {
    const ids = works.map((w) => w.id);
    await sql`DELETE FROM paper_generations WHERE work_id = ANY(${ids}::uuid[])`;
  }

  const seeded = [];

  for (const work of works) {
    const existing = await sql`
      SELECT id FROM paper_generations WHERE work_id = ${work.id}::uuid LIMIT 1
    `;
    if (!force && existing.length) {
      console.log(`Skip (exists): ${work.title}`);
      continue;
    }

    const genId = crypto.randomUUID();
    const wordCount = 5200 + Math.floor(Math.random() * 1200);
    const pdfPath = path.join(STORAGE, "generations", genId, "main.pdf");

    await sql`
      INSERT INTO paper_generations (
        id, work_id, status, config, title, source, word_count, review_count, current_step, pdf_path, output_dir
      )
      VALUES (
        ${genId}::uuid,
        ${work.id}::uuid,
        'completed',
        ${JSON.stringify({ styleGuide: "Nature", targetPages: 10, enablePlanning: true })}::jsonb,
        ${work.title},
        'graph',
        ${wordCount},
        5,
        'Completed',
        ${pdfPath},
        ${path.join(STORAGE, "generations", genId)}
      )
    `;

    const events = [
      {
        agent: "Supermemory",
        event_type: "memory",
        message: `Profiled work memory (1240 chars context)`,
        metadata: {
          phase: "planning",
          action: "profile",
          preview: `Prior graph context for "${work.title}"`.slice(0, 500),
          containerTag: `work_${work.id}`,
        },
      },
      {
        agent: "Planner",
        event_type: "writing",
        message: "Creating paper plan",
        metadata: { phase: "planning", workflow_stage: "planning" },
      },
      {
        agent: "Planner",
        event_type: "search",
        message: `Querying semantic_scholar: ${work.title.slice(0, 60)}`,
        metadata: {
          phase: "reference_discovery",
          search_query: work.title,
          source: "semantic_scholar",
        },
      },
      {
        agent: "Planner",
        event_type: "found",
        message: "Found 8 papers",
        metadata: {
          phase: "reference_discovery",
          count: 8,
          discovered_refs: DEMO_REFS,
          source: "semantic_scholar",
        },
      },
      {
        agent: "Planner",
        event_type: "completed",
        message: "Plan created with 5 sections",
        metadata: { phase: "planning", duration_ms: 21000, refs: 8 },
      },
      {
        agent: "Writer",
        event_type: "completed",
        message: "Generated Introduction (916 words)",
        metadata: { phase: "introduction", word_count: 916, section: "Introduction" },
      },
      {
        agent: "Reviewer",
        event_type: "completed",
        message: "Review passed for Introduction",
        metadata: { phase: "review", section: "Introduction" },
      },
      {
        agent: "Commander",
        event_type: "completed",
        message: `Paper generation complete (${wordCount} words total)`,
        metadata: { workflow_stage: "complete", word_count: wordCount },
      },
    ];

    for (const ev of events) {
      await sql`
        INSERT INTO generation_events (generation_id, agent, event_type, message, metadata)
        VALUES (${genId}::uuid, ${ev.agent}, ${ev.event_type}, ${ev.message}, ${JSON.stringify(ev.metadata)}::jsonb)
      `;
    }

    writeGenerationArtifacts(genId, work.title);
    seeded.push({ genId, title: work.title });
    console.log(`Seeded generation: ${work.title} → ${genId}`);
  }

  console.log(`Done. ${seeded.length} generation(s) seeded.`);
  await sql.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
