#!/usr/bin/env node
/**
 * Verify showcase paper generations: PDF, recalls, demo URLs.
 */
const WEB = process.env.WEB_URL || "http://localhost:3000";

const WORK_TITLES = [
  "Global CO₂ Emissions and Life Expectancy",
  "Renewable Electricity Share and Fossil Fuel Dependence",
];

async function json(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  const data = await res.json();
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return data;
}

async function main() {
  const gens = await json(`${WEB}/api/generations`);
  if (!Array.isArray(gens)) throw new Error("Expected generations array");

  let ok = true;
  for (const fragment of WORK_TITLES) {
    const match = gens
      .filter((g) => String(g.title || g.work_title || "").includes(fragment))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    if (!match) {
      console.error(`FAIL: no generation for "${fragment}"`);
      ok = false;
      continue;
    }

    const genId = match.id;
    const status = match.status;
    const detail = await json(`${WEB}/api/generations/${genId}`);
    const recalls = await json(`${WEB}/api/generations/${genId}/memory/recalls`);
    const searchEvents = (recalls.recalls || []).filter((r) => r.action === "search");
    const withHits = searchEvents.filter((r) => (r.recalledCount || 0) > 0 || r.hits?.length);

    console.log(`\n=== ${fragment} ===`);
    console.log(`  genId: ${genId}`);
    console.log(`  status: ${status}`);
    console.log(`  words: ${detail.generation?.word_count || 0}`);
    console.log(`  memory events: ${recalls.count || 0}`);
    console.log(`  search recalls with hits: ${withHits.length}`);
    console.log(`  URL: ${WEB}/paper-generation/${genId}`);

    if (!status?.startsWith("completed")) {
      console.error("  FAIL: not completed");
      ok = false;
    }
    if ((recalls.count || 0) < 5) {
      console.error("  FAIL: expected >= 5 memory events");
      ok = false;
    }
    if (withHits.length < 1) {
      console.error("  FAIL: no search events with recalled hits (re-seed with seed-recall-demo.mjs)");
      ok = false;
    }
  }

  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
