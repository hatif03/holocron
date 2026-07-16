#!/usr/bin/env node
/**
 * Start paper generation for a showcase work by title substring.
 * Usage: node scripts/generate-showcase-paper.mjs "Renewable Electricity"
 */
import postgres from "postgres";

const WEB = process.env.WEB_URL || "http://localhost:3000";
const titleMatch = process.argv[2] || "";
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

async function json(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    signal: AbortSignal.timeout(opts.timeout ?? 120_000),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${url} → ${res.status}: ${text.slice(0, 400)}`);
  return data;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });
  const works = await sql`
    SELECT id, title FROM research_works
    WHERE title ILIKE ${"%" + titleMatch + "%"}
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  if (!works.length) {
    console.error(`No work matching "${titleMatch}"`);
    process.exit(1);
  }
  const work = works[0];
  const nodes = await sql`
    SELECT node_key AS id, type, label, data FROM graph_nodes WHERE work_id = ${work.id}::uuid
  `;
  const edges = await sql`
    SELECT source_node_key AS source, target_node_key AS target
    FROM graph_edges WHERE work_id = ${work.id}::uuid
  `;
  await sql.end();

  const graph = {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
      data: typeof n.data === "string" ? JSON.parse(n.data) : n.data,
    })),
    edges,
  };

  console.log(`Starting generation for: ${work.title}`);
  const started = await json(`${WEB}/api/generations`, {
    method: "POST",
    body: JSON.stringify({
      workId: work.id,
      graph,
      title: work.title,
      config: {
        styleGuide: "Nature",
        targetPages: 10,
        enablePlanning: true,
        enableReviewLoop: true,
        maxReviewIterations: 2,
        compilePdf: true,
      },
    }),
  });
  const genId = started.id;
  console.log(`Generation ID: ${genId}`);

  const deadline = Date.now() + 45 * 60_000;
  while (Date.now() < deadline) {
    const detail = await json(`${WEB}/api/generations/${genId}`);
    const status = String(detail.generation?.status || "");
    const step = detail.generation?.current_step || status;
    process.stdout.write(`\r${status}: ${String(step).slice(0, 80).padEnd(80)}`);
    if (["completed", "completed_with_warnings", "failed", "cancelled"].includes(status)) {
      console.log("\nDone:", status);
      console.log(`Detail: ${WEB}/paper-generation/${genId}`);
      process.exit(status.startsWith("completed") ? 0 : 1);
    }
    await sleep(5000);
  }
  console.error("\nTimed out waiting for generation");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
