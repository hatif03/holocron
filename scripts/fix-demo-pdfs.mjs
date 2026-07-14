#!/usr/bin/env node
/**
 * Replace invalid demo PDF placeholders with minimal valid PDFs.
 * Usage: node scripts/fix-demo-pdfs.mjs
 */
import fs from "fs";
import path from "path";
import postgres from "postgres";
import { writeMinimalPdf, STORAGE_PATH } from "./seed-utils.mjs";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

const gensDir = path.join(STORAGE_PATH, "generations");
if (!fs.existsSync(gensDir)) {
  console.log("No generations directory found.");
  process.exit(0);
}

const sql = postgres(DATABASE_URL);
const rows = await sql`
  SELECT id, title, pdf_path FROM paper_generations
`;
const titleById = new Map(rows.map((r) => [String(r.id), String(r.title || "Holocron Paper")]));
await sql.end();

let fixed = 0;
for (const genId of fs.readdirSync(gensDir)) {
  const pdfPath = path.join(gensDir, genId, "main.pdf");
  if (!fs.existsSync(pdfPath)) continue;

  const stat = fs.statSync(pdfPath);
  const head = fs.readFileSync(pdfPath, "utf8").slice(0, 64);
  const invalid =
    stat.size < 200 ||
    head.includes("demo placeholder") ||
    !head.startsWith("%PDF-");

  if (!invalid) {
    console.log(`OK: ${genId} (${stat.size} bytes)`);
    continue;
  }

  const title = titleById.get(genId) || "Holocron Demo Paper";
  writeMinimalPdf(pdfPath, title);
  console.log(`Fixed: ${genId} -> ${title}`);
  fixed++;
}

console.log(`Done. Repaired ${fixed} PDF(s).`);
