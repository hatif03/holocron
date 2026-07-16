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

function searchHitCount(recalls) {
  const searchEvents = (recalls.recalls || []).filter((r) => r.action === "search");
  return searchEvents.filter((r) => (r.recalledCount || 0) > 0 || r.hits?.length).length;
}

async function scoreGeneration(gen) {
  const detail = await json(`${WEB}/api/generations/${gen.id}`);
  const recalls = await json(`${WEB}/api/generations/${gen.id}/memory/recalls`);
  const hits = searchHitCount(recalls);
  const words = detail.generation?.word_count || gen.word_count || 0;
  const events = recalls.count || 0;
  return {
    gen,
    detail,
    recalls,
    hits,
    score: hits * 1_000_000 + words + events,
  };
}

async function main() {
  const gens = await json(`${WEB}/api/generations`);
  if (!Array.isArray(gens)) throw new Error("Expected generations array");

  let ok = true;
  for (const fragment of WORK_TITLES) {
    const candidates = gens.filter((g) =>
      String(g.title || g.work_title || "").includes(fragment)
    );
    if (!candidates.length) {
      console.error(`FAIL: no generation for "${fragment}"`);
      ok = false;
      continue;
    }

    const scored = await Promise.all(candidates.map((g) => scoreGeneration(g)));
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    const { gen, detail, recalls, hits } = best;

    const genId = gen.id;
    const status = gen.status;

    console.log(`\n=== ${fragment} ===`);
    console.log(`  genId: ${genId}`);
    console.log(`  status: ${status}`);
    console.log(`  words: ${detail.generation?.word_count || 0}`);
    console.log(`  memory events: ${recalls.count || 0}`);
    console.log(`  search recalls with hits: ${hits}`);
    console.log(`  URL: ${WEB}/paper-generation/${genId}`);

    if (!status?.startsWith("completed")) {
      console.error("  FAIL: not completed");
      ok = false;
    }
    if ((recalls.count || 0) < 5) {
      console.error("  FAIL: expected >= 5 memory events");
      ok = false;
    }
    if (hits < 1) {
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
