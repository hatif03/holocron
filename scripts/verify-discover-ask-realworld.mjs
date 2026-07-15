#!/usr/bin/env node
/**
 * Real-world Discover + Ask verification using OWID showcase + Semantic Scholar.
 * Prereq: npm run start:local && npm run seed:showcase
 * Manual UI: Research graph → Discover tab → Ask tab
 */
import postgres from "postgres";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const WEB = process.env.WEB_URL || "http://localhost:3000";
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

const SHOWCASE_TITLE =
  "Global CO₂ Emissions and Life Expectancy: A Cross-Country Analysis (1990–2023)";
const KEYWORDS = "CO2 emissions, life expectancy, climate health, OWID";

async function json(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    signal: AbortSignal.timeout(opts.timeout ?? 120_000),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) throw new Error(`${url} → ${res.status}: ${text.slice(0, 400)}`);
  return data;
}

async function ensureShowcase(sql) {
  let [work] = await sql`
    SELECT id FROM research_works WHERE title = ${SHOWCASE_TITLE} LIMIT 1
  `;
  if (!work) {
    console.log("Seeding OWID showcase...");
    execSync("node scripts/seed-showcase-owid.mjs", { cwd: repoRoot, stdio: "inherit" });
    [work] = await sql`
      SELECT id FROM research_works WHERE title = ${SHOWCASE_TITLE} LIMIT 1
    `;
  }
  if (!work) throw new Error("Showcase work not found after seed");
  return work.id;
}

async function ensureKeywords(sql, workId) {
  const [node] = await sql`
    SELECT data FROM graph_nodes
    WHERE work_id = ${workId}::uuid AND type = 'start' LIMIT 1
  `;
  const data = node?.data || {};
  if (data.keywords) return;
  const updated = { ...data, keywords: KEYWORDS };
  await sql`
    UPDATE graph_nodes SET data = ${JSON.stringify(updated)}::jsonb
    WHERE work_id = ${workId}::uuid AND type = 'start'
  `;
  console.log("Added keywords to start node");
}

async function main() {
  console.log("=== Discover + Ask real-world verification ===\n");
  const sql = postgres(DATABASE_URL);

  const workId = await ensureShowcase(sql);
  console.log(`Showcase work: ${workId}`);
  await ensureKeywords(sql, workId);
  await sql.end();

  const discover = await json(`${WEB}/api/works/${workId}/discover`, { method: "POST" });
  const papers = discover.papers || [];
  console.log(`Discover: ${papers.length} papers ranked`);
  if (papers.length === 0) {
    console.error("FAIL: No papers from Semantic Scholar");
    process.exit(1);
  }
  if (!discover.memoryTrace) {
    console.error("FAIL: discover response missing memoryTrace");
    process.exit(1);
  }
  const badScore = papers.find((p) => typeof p.similarityScore !== "number");
  if (badScore) {
    console.error("FAIL: paper missing similarityScore");
    process.exit(1);
  }
  console.log(`  Top paper: ${papers[0].title?.slice(0, 60)}… (${Math.round(papers[0].similarityScore * 100)}%)`);

  const ask = await json(`${WEB}/api/works/${workId}/ask`, {
    method: "POST",
    body: JSON.stringify({
      message:
        "What is the relationship between CO2 emissions and life expectancy in our dataset?",
    }),
    timeout: 180_000,
  });
  if (!ask.answer?.trim()) {
    console.error("FAIL: empty ask answer");
    process.exit(1);
  }
  if (!ask.memoryTrace?.read) {
    console.error("FAIL: ask response missing memoryTrace.read");
    process.exit(1);
  }
  console.log(`Ask: recalled ${ask.recalled} memories, answer ${ask.answer.length} chars`);

  const activity = await json(`${WEB}/api/works/${workId}/memory/activity`);
  const types = activity.types || {};
  const hasDiscoverOrAsk =
    (types.discovered_paper ?? 0) > 0 || (types.ask ?? 0) > 0;
  if (!hasDiscoverOrAsk) {
    console.log(`  Activity types: ${JSON.stringify(types)} (indexing may lag)`);
  } else {
    console.log(`  Activity: discovered_paper=${types.discovered_paper ?? 0} ask=${types.ask ?? 0}`);
  }

  console.log("\nPASS: Discover + Ask real-world verification");
  console.log(`Work: ${WEB}/research-graph/${workId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
