#!/usr/bin/env node
/**
 * Seed demo paper generations with events for UI testing.
 * Usage: node scripts/seed-generations.mjs [--force]
 */
import postgres from "postgres";
import fs from "fs";
import path from "path";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

const STORAGE = process.env.STORAGE_PATH || "./storage";
const LOCAL_USER = "00000000-0000-0000-0000-000000000001";
const force = process.argv.includes("--force");

async function seed() {
  const sql = postgres(DATABASE_URL);

  const [work] = await sql`
    SELECT id FROM research_works WHERE is_template = true LIMIT 1
  `;
  if (!work) {
    console.log("No template work found. Run seed-template.mjs first.");
    await sql.end();
    return;
  }

  if (force) {
    await sql`DELETE FROM paper_generations WHERE work_id = ${work.id}::uuid`;
  }

  const existing = await sql`
    SELECT COUNT(*)::int AS c FROM paper_generations WHERE work_id = ${work.id}::uuid
  `;
  if (!force && existing[0].c > 0) {
    console.log("Generations already seeded. Use --force to re-seed.");
    await sql.end();
    return;
  }

  const completedId = crypto.randomUUID();
  const runningId = crypto.randomUUID();

  await sql`
    INSERT INTO paper_generations (id, work_id, status, config, title, source, word_count, review_count, current_step, pdf_path)
    VALUES (
      ${completedId}::uuid, ${work.id}::uuid, 'completed',
      ${JSON.stringify({ styleGuide: "Nature", targetPages: 10 })}::jsonb,
      'Artificial intelligence tools expand scientists impact but contract science focus',
      'graph', 7483, 1, 'Completed',
      ${path.join(STORAGE, "generations", completedId, "main.pdf")}
    )
  `;

  await sql`
    INSERT INTO paper_generations (id, work_id, status, config, title, source, current_step)
    VALUES (
      ${runningId}::uuid, ${work.id}::uuid, 'running',
      ${JSON.stringify({ styleGuide: "Nature" })}::jsonb,
      'AI tools expand impact but contract focus',
      'graph', 'Planning: Creating paper plan'
    )
  `;

  const events = [
    { agent: "Planner", event_type: "writing", message: "Creating paper plan", metadata: { phase: "planning" } },
    { agent: "Planner", event_type: "search", message: "Querying semantic_scholar: impact of artificial intelligence on scientific discovery", metadata: { phase: "reference_discovery", search_query: "impact of artificial intelligence on scientific discovery diversity", source: "semantic_scholar" } },
    { agent: "Planner", event_type: "found", message: "Found 12 papers", metadata: { phase: "reference_discovery", count: 12 } },
    { agent: "Planner", event_type: "llm", message: "PlannerAgent generated response", metadata: { phase: "planning", duration_ms: 18900 } },
    { agent: "Planner", event_type: "completed", message: "Plan created with 5 sections", metadata: { phase: "planning", duration_ms: 21000 } },
    { agent: "Writer", event_type: "writing", message: "Drafting Introduction", metadata: { phase: "introduction" } },
    { agent: "Writer", event_type: "agent", message: "WriterAgent: Generating Introduction section", metadata: { phase: "introduction" } },
    { agent: "Writer", event_type: "llm", message: "WriterAgent generated response", metadata: { phase: "introduction", duration_ms: 10200 } },
    { agent: "Writer", event_type: "completed", message: "Generated Introduction (916 words)", metadata: { phase: "introduction", word_count: 916 } },
    { agent: "Reviewer", event_type: "completed", message: "Review passed for Introduction", metadata: { phase: "review" } },
  ];

  for (const ev of events) {
    await sql`
      INSERT INTO generation_events (generation_id, agent, event_type, message, metadata)
      VALUES (${completedId}::uuid, ${ev.agent}, ${ev.event_type}, ${ev.message}, ${JSON.stringify(ev.metadata)}::jsonb)
    `;
  }

  const outDir = path.join(STORAGE, "generations", completedId);
  const sectionsDir = path.join(outDir, "sections");
  fs.mkdirSync(sectionsDir, { recursive: true });

  fs.writeFileSync(
    path.join(sectionsDir, "Abstract.tex"),
    "\\begin{abstract}\nAI tools expand individual scientist impact but contract collective research diversity.\n\\end{abstract}\n"
  );
  fs.writeFileSync(
    path.join(sectionsDir, "Introduction.tex"),
    "\\section{Introduction}\nArtificial intelligence is transforming scientific research at unprecedented scale.\n"
  );
  fs.writeFileSync(
    path.join(outDir, "main.tex"),
    "\\documentclass{article}\n\\begin{document}\n\\input{sections/Abstract.tex}\n\\input{sections/Introduction.tex}\n\\end{document}\n"
  );
  fs.writeFileSync(
    path.join(outDir, "references.bib"),
    "@article{example2024, title={Example Reference}, year={2024}}\n"
  );
  fs.writeFileSync(path.join(outDir, "main.pdf"), "%PDF-1.4 demo placeholder");

  console.log("Seeded generations:", completedId, runningId);
  await sql.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
