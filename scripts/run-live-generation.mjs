#!/usr/bin/env node
/**
 * Run a live paper generation via agents API (Multi-Agent work by default).
 * Usage: node scripts/run-live-generation.mjs [workId]
 */
import postgres from "postgres";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { STORAGE_PATH } from "./seed-utils.mjs";

const AGENTS = process.env.AGENTS_SERVICE_URL || "http://localhost:8000";
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

const sql = postgres(DATABASE_URL);

const works = await sql`
  SELECT id, title FROM research_works
  WHERE title = 'Evaluating Multi-Agent Paper Writing Pipelines'
  LIMIT 1
`;
const workId = process.argv[2] || works[0]?.id;
if (!workId) {
  console.error("Multi-Agent work not found. Run seed:all first.");
  process.exit(1);
}

const [work] = await sql`SELECT title FROM research_works WHERE id = ${workId}::uuid`;
const nodes = await sql`
  SELECT id, node_key, type, label, data FROM graph_nodes WHERE work_id = ${workId}::uuid
`;
const edges = await sql`
  SELECT source_node_key, target_node_key FROM graph_edges WHERE work_id = ${workId}::uuid
`;

const graph = {
  nodes: nodes.map((n) => ({
    id: n.node_key,
    type: n.type,
    label: n.label,
    data: typeof n.data === "string" ? JSON.parse(n.data) : n.data,
  })),
  edges: edges.map((e) => ({ source: e.source_node_key, target: e.target_node_key })),
};

const genId = randomUUID();
const config = {
  styleGuide: "Nature",
  targetPages: 10,
  enablePlanning: true,
  enableReviewLoop: true,
  maxReviewIterations: 3,
  compilePdf: true,
  pauseForFeedback: false,
};

console.log(`Starting live generation for: ${work.title}`);
console.log(`Generation ID: ${genId}`);

await sql`
  INSERT INTO paper_generations (id, work_id, status, config, title, source, current_step)
  VALUES (
    ${genId}::uuid, ${workId}::uuid, 'running',
    ${JSON.stringify(config)}::jsonb,
    ${work.title}, 'graph', 'Planning: Creating paper plan'
  )
`;

const startRes = await fetch(`${AGENTS}/agents/commander/generate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    generation_id: genId,
    work_id: workId,
    graph,
    config,
    title: work.title,
  }),
});

if (!startRes.ok) {
  console.error("Start failed:", await startRes.text());
  process.exit(1);
}

const start = Date.now();
const maxWait = 900_000;

while (Date.now() - start < maxWait) {
  const statusRes = await fetch(`${AGENTS}/agents/commander/status/${genId}`);
  const status = await statusRes.json();
  const events = status.events || [];
  const last = events[events.length - 1];
  process.stdout.write(
    `\r  [${events.length} events] ${last?.agent || ""}: ${(last?.message || status.status || "").slice(0, 60)}          `
  );

  if (status.status === "completed" || status.status === "completed_with_warnings" || status.status === "failed" || status.status === "waiting_for_feedback") {
    console.log("\n");
    const result = status.result || {};
    const outDir = result.output_dir
      ? result.output_dir.replace("/data/storage", STORAGE_PATH)
      : path.join(STORAGE_PATH, "generations", genId);
    const pdfPath = result.pdf_path
      ? result.pdf_path.replace("/data/storage", STORAGE_PATH)
      : path.join(outDir, "main.pdf");
    const pdfPathHost = pdfPath || path.join(outDir, "main.pdf");
    let pdfSize = 0;
    if (pdfPathHost && fs.existsSync(pdfPathHost)) {
      pdfSize = fs.statSync(pdfPathHost).size;
    }

    for (const ev of events) {
      await sql`
        INSERT INTO generation_events (generation_id, agent, event_type, message, metadata)
        VALUES (
          ${genId}::uuid, ${ev.agent}, ${ev.event_type}, ${ev.message},
          ${JSON.stringify(ev.metadata || {})}::jsonb
        )
      `;
    }

    const reviewCount = events.filter(
      (e) => e.agent === "Reviewer" && e.event_type === "completed"
    ).length;

    await sql`
      UPDATE paper_generations SET
        status = ${status.status},
        output_dir = ${outDir.replace(/\\/g, "/")},
        pdf_path = ${pdfSize > 0 ? pdfPathHost.replace(/\\/g, "/") : null},
        word_count = ${result.word_count || 0},
        review_count = ${reviewCount},
        current_step = ${events.at(-1)?.message || status.status},
        updated_at = NOW()
      WHERE id = ${genId}::uuid
    `;

    console.log(`Status: ${status.status}`);
    console.log(`Events: ${events.length}`);
    console.log(`Words: ${result.word_count || 0}`);
    console.log(`PDF: ${pdfPath || "none"} (${pdfSize} bytes)`);

    const bibPath = path.join(outDir, "references.bib");
    if (fs.existsSync(bibPath)) {
      const bib = fs.readFileSync(bibPath, "utf8");
      console.log(`references.bib: ${bib.length} chars, placeholder=${bib.includes("placeholder2024")}`);
    }

    const ok =
      events.length >= 15 &&
      (result.word_count || 0) > 2500 &&
      pdfSize > 5000 &&
      (status.status === "completed" || status.status === "completed_with_warnings");

    console.log(ok ? "\n✓ Live generation passed" : "\n✗ Live generation did not meet criteria");
    await sql.end();
    process.exit(ok ? 0 : 1);
  }

  await new Promise((r) => setTimeout(r, 5000));
}

console.error("Timeout");
await sql.end();
process.exit(1);
