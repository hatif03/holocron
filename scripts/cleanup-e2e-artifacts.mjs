#!/usr/bin/env node
/**
 * Remove E2E test works, generations, and verify Supermemory container is empty.
 * Usage: node scripts/cleanup-e2e-artifacts.mjs [--work-id=<uuid>] [--dry-run]
 */
import postgres from "postgres";
import fs from "fs";
import path from "path";
import { STORAGE_PATH } from "./seed-utils.mjs";
import { deleteWorkViaApi, searchSupermemoryHits } from "./e2e-cleanup-utils.mjs";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

const dryRun = process.argv.includes("--dry-run");
const workIdArg = process.argv.find((a) => a.startsWith("--work-id="));
const targetWorkId = workIdArg ? workIdArg.replace("--work-id=", "").trim() : null;

async function removeGeneration(sql, gen) {
  await sql`DELETE FROM generation_events WHERE generation_id = ${gen.id}::uuid`;
  await sql`DELETE FROM paper_generations WHERE id = ${gen.id}::uuid`;
  for (const d of [
    gen.output_dir,
    path.join(STORAGE_PATH, "generations", gen.id),
  ]) {
    if (d && fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
  }
}

async function main() {
  console.log("=== E2E artifact cleanup ===\n");
  const sql = postgres(DATABASE_URL);

  let works;
  if (targetWorkId) {
    works = await sql`
      SELECT id, title FROM research_works WHERE id = ${targetWorkId}::uuid
    `;
  } else {
    works = await sql`
      SELECT id, title FROM research_works
      WHERE title ILIKE '%E2E%' OR title = 'Supermemory E2E Test'
      ORDER BY created_at DESC
    `;
  }

  if (works.length === 0) {
    console.log("No E2E test works found.");
    await sql.end();
    return;
  }

  let gensRemoved = 0;
  let worksRemoved = 0;
  let smFailures = 0;

  for (const work of works) {
    console.log(`Work: ${work.title} (${work.id})`);

    const gens = await sql`
      SELECT id, output_dir FROM paper_generations WHERE work_id = ${work.id}::uuid
    `;
    for (const gen of gens) {
      if (dryRun) {
        console.log(`  [dry-run] would remove generation ${gen.id}`);
      } else {
        await removeGeneration(sql, gen);
        console.log(`  Removed generation ${gen.id}`);
      }
      gensRemoved += 1;
    }

    const workDir = path.join(STORAGE_PATH, "works", work.id);
    if (!dryRun && fs.existsSync(workDir)) {
      fs.rmSync(workDir, { recursive: true, force: true });
    }

    if (dryRun) {
      console.log(`  [dry-run] would DELETE work ${work.id}`);
      continue;
    }

    const del = await deleteWorkViaApi(work.id);
    console.log(
      `  Deleted work (supermemory.deleted=${del.supermemory?.deleted ?? "?"})`
    );
    worksRemoved += 1;

    await new Promise((r) => setTimeout(r, 1500));
    const hits = await searchSupermemoryHits(work.id);
    if (hits > 0) {
      console.error(`  FAIL: Supermemory still has ${hits} hits for work_${work.id}`);
      smFailures += 1;
    } else if (hits === 0) {
      console.log(`  OK: Supermemory empty for work_${work.id}`);
    } else {
      console.log(`  WARN: Could not verify Supermemory (skipped)`);
    }
  }

  await sql.end();

  console.log(`\nSummary: ${worksRemoved} works, ${gensRemoved} generations removed`);
  if (smFailures > 0) {
    console.error(`FAIL: ${smFailures} work(s) still have Supermemory data`);
    process.exit(1);
  }
  console.log("PASS: E2E cleanup complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
