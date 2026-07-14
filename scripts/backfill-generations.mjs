#!/usr/bin/env node
/** Backfill paper_generations from storage/generations/ folders. */
import postgres from "postgres";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE = process.env.STORAGE_PATH || path.join(__dirname, "..", "storage");
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

function extractTitle(genDir) {
  const mainTex = path.join(genDir, "main.tex");
  if (!fs.existsSync(mainTex)) return "Research Paper";
  const m = fs.readFileSync(mainTex, "utf8").match(/\\title\{([^}]+)\}/);
  return m?.[1]?.trim() || "Research Paper";
}

function countWords(genDir) {
  const sectionsDir = path.join(genDir, "sections");
  if (!fs.existsSync(sectionsDir)) return 0;
  let total = 0;
  for (const file of fs.readdirSync(sectionsDir)) {
    if (!file.endsWith(".tex")) continue;
    total += fs.readFileSync(path.join(sectionsDir, file), "utf8").split(/\s+/).filter(Boolean).length;
  }
  return total;
}

const sql = postgres(DATABASE_URL);
const genRoot = path.join(STORAGE, "generations");
if (!fs.existsSync(genRoot)) {
  console.log("No generations folder.");
  await sql.end();
  process.exit(0);
}

const works = await sql`SELECT id, title, is_template FROM research_works ORDER BY created_at ASC`;
const workByTitle = new Map(works.map((w) => [String(w.title).toLowerCase(), w.id]));
let imported = 0;

for (const name of fs.readdirSync(genRoot)) {
  const genDir = path.join(genRoot, name);
  if (!fs.statSync(genDir).isDirectory()) continue;
  if (!/^[0-9a-f-]{36}$/i.test(name)) continue;

  const exists = await sql`SELECT id FROM paper_generations WHERE id = ${name}::uuid`;
  if (exists.length) continue;

  const title = extractTitle(genDir);
  const workId =
    workByTitle.get(title.toLowerCase()) ??
    works.find((w) => !w.is_template)?.id ??
    works[0]?.id;

  const pdfPath = path.join(genDir, "main.pdf");
  const hasPdf = fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 500;
  const wordCount = countWords(genDir);
  const mtime = fs.statSync(genDir).mtime;

  await sql`
    INSERT INTO paper_generations (
      id, work_id, status, config, title, source,
      word_count, current_step, pdf_path, output_dir, created_at, updated_at
    )
    VALUES (
      ${name}::uuid, ${workId}::uuid,
      ${hasPdf ? "completed" : "completed_with_warnings"},
      ${JSON.stringify({ styleGuide: "Nature" })}::jsonb,
      ${title}, 'graph', ${wordCount},
      ${hasPdf ? "Paper generation complete" : "Imported from storage"},
      ${hasPdf ? pdfPath.replace(/\\/g, "/") : null},
      ${genDir.replace(/\\/g, "/")},
      ${mtime}, ${mtime}
    )
  `;
  console.log(`Imported: ${title} (${name}) — ${wordCount} words`);
  imported++;
}

console.log(`Done. ${imported} generation(s) registered in dashboard DB.`);
await sql.end();
