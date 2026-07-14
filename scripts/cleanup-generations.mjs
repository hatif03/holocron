#!/usr/bin/env node
/** Remove failed, stub, and duplicate paper generations. Keeps best run per title. */
import postgres from "postgres";
import fs from "fs";
import path from "path";
import { STORAGE_PATH } from "./seed-utils.mjs";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

const MIN_WORDS = 800;
const MIN_EVENTS = 15;
const MIN_PDF_BYTES = 5000;

const keepArg = process.argv.find((a) => a.startsWith("--keep="));
const keepIds = new Set(
  keepArg ? keepArg.replace("--keep=", "").split(",").map((s) => s.trim()) : []
);

const sql = postgres(DATABASE_URL);

const gens = await sql`
  SELECT id, title, word_count, pdf_path, output_dir
  FROM paper_generations
  ORDER BY created_at ASC
`;

function pdfSize(g) {
  const p = g.pdf_path || path.join(STORAGE_PATH, "generations", g.id, "main.pdf");
  if (!p || !fs.existsSync(p)) return 0;
  return fs.statSync(p).size;
}

async function eventCount(id) {
  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count FROM generation_events WHERE generation_id = ${id}::uuid
  `;
  return count;
}

async function removeGen(g, reason) {
  await sql`DELETE FROM generation_events WHERE generation_id = ${g.id}::uuid`;
  await sql`DELETE FROM paper_generations WHERE id = ${g.id}::uuid`;
  for (const d of [g.output_dir, path.join(STORAGE_PATH, "generations", g.id)]) {
    if (d && fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
  }
  console.log(`Removed: ${g.title} (${g.id}) — ${reason}`);
}

const enriched = [];
for (const g of gens) {
  enriched.push({ ...g, events: await eventCount(g.id), pdfBytes: pdfSize(g) });
}

function qualityOk(g) {
  return g.word_count >= MIN_WORDS && g.events > MIN_EVENTS && g.pdfBytes >= MIN_PDF_BYTES;
}

function score(g) {
  return g.word_count * 1000 + g.pdfBytes + g.events;
}

const byTitle = new Map();
for (const g of enriched) {
  const key = String(g.title || "").toLowerCase().trim() || "(untitled)";
  const prev = byTitle.get(key);
  if (!prev || score(g) > score(prev)) byTitle.set(key, g);
}

const keepSet = new Set(keepIds);
for (const g of byTitle.values()) {
  if (qualityOk(g) || keepIds.has(g.id)) keepSet.add(g.id);
}

let removed = 0;
for (const g of enriched) {
  if (keepSet.has(g.id)) {
    console.log(`Keeping: ${g.title} (${g.id}, ${g.word_count} words)`);
    continue;
  }
  let reason = "duplicate or low quality";
  if (g.word_count < MIN_WORDS) reason = `word_count ${g.word_count} < ${MIN_WORDS}`;
  else if (g.events <= MIN_EVENTS) reason = `events ${g.events} <= ${MIN_EVENTS}`;
  else if (g.pdfBytes < MIN_PDF_BYTES) reason = `PDF too small (${g.pdfBytes}B)`;
  else if (byTitle.get(String(g.title || "").toLowerCase().trim())?.id !== g.id) {
    reason = "duplicate title (kept better run)";
  }
  await removeGen(g, reason);
  removed++;
}

console.log(`Done. Removed ${removed}, kept ${keepSet.size}.`);
await sql.end();
