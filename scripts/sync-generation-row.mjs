#!/usr/bin/env node
/** Sync word_count and PDF path from disk for a generation row. */
import postgres from "postgres";
import fs from "fs";
import path from "path";
import { STORAGE_PATH } from "./seed-utils.mjs";

const genId = process.argv[2];
if (!genId) {
  console.error("Usage: node scripts/sync-generation-row.mjs <genId>");
  process.exit(1);
}

const sql = postgres(
  process.env.DATABASE_URL ||
    "postgresql://holocron:holocron@localhost:5432/holocron"
);

const dir = path.join(STORAGE_PATH, "generations", genId);
let words = 0;
const sectionsDir = path.join(dir, "sections");
if (fs.existsSync(sectionsDir)) {
  for (const f of fs.readdirSync(sectionsDir)) {
    if (f.endsWith(".tex")) {
      words += fs
        .readFileSync(path.join(sectionsDir, f), "utf8")
        .split(/\s+/)
        .filter(Boolean).length;
    }
  }
}

const pdf = path.join(dir, "main.pdf");
const pdfPath = fs.existsSync(pdf) ? pdf.replace(/\\/g, "/") : null;

await sql`
  UPDATE paper_generations SET
    word_count = ${words},
    status = ${pdfPath ? "completed" : "completed_with_warnings"},
    pdf_path = ${pdfPath},
    output_dir = ${dir.replace(/\\/g, "/")},
    current_step = 'Paper generation complete',
    updated_at = NOW()
  WHERE id = ${genId}::uuid
`;

console.log(`Synced ${genId}: ${words} words, pdf=${!!pdfPath}`);
await sql.end();
