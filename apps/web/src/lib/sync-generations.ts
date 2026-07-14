import fs from "fs";
import path from "path";
import type postgres from "postgres";
import { getStoragePath } from "@/lib/storage-path";

type Sql = ReturnType<typeof postgres>;

function extractTitle(genDir: string): string {
  const mainTex = path.join(genDir, "main.tex");
  if (!fs.existsSync(mainTex)) return "Research Paper";
  const content = fs.readFileSync(mainTex, "utf8");
  const m = content.match(/\\title\{([^}]+)\}/);
  return m?.[1]?.trim() || "Research Paper";
}

function countWords(genDir: string): number {
  const sectionsDir = path.join(genDir, "sections");
  if (!fs.existsSync(sectionsDir)) return 0;
  let total = 0;
  for (const file of fs.readdirSync(sectionsDir)) {
    if (!file.endsWith(".tex")) continue;
    const text = fs.readFileSync(path.join(sectionsDir, file), "utf8");
    total += text.split(/\s+/).filter(Boolean).length;
  }
  return total;
}

function folderTime(genDir: string): Date {
  const stat = fs.statSync(genDir);
  return stat.mtime;
}

/** Import generation folders under storage/generations/ that are missing from Postgres. */
export async function syncGenerationsFromStorage(db: Sql): Promise<number> {
  const genRoot = path.join(getStoragePath(), "generations");
  if (!fs.existsSync(genRoot)) return 0;

  const works = await db`
    SELECT id, title, is_template FROM research_works ORDER BY created_at ASC
  `;
  const workByTitle = new Map(works.map((w) => [String(w.title).toLowerCase(), w.id]));

  let imported = 0;

  for (const name of fs.readdirSync(genRoot)) {
    const genDir = path.join(genRoot, name);
    if (!fs.statSync(genDir).isDirectory()) continue;

    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(name)) continue;

    const existing = await db`
      SELECT id FROM paper_generations WHERE id = ${name}::uuid LIMIT 1
    `;
    if (existing.length) continue;

    const title = extractTitle(genDir);
    const workId =
      workByTitle.get(title.toLowerCase()) ??
      works.find((w) => !w.is_template)?.id ??
      works[0]?.id ??
      null;

    const pdfPath = path.join(genDir, "main.pdf");
    const pdfSize = fs.existsSync(pdfPath) ? fs.statSync(pdfPath).size : 0;
    const hasPdf = pdfSize > 5000;
    const wordCount = countWords(genDir);
    if (wordCount < 800 || !hasPdf) continue;
    const outputDir = genDir.replace(/\\/g, "/");
    const createdAt = folderTime(genDir);

    await db`
      INSERT INTO paper_generations (
        id, work_id, status, config, title, source,
        word_count, review_count, current_step, pdf_path, output_dir,
        created_at, updated_at
      )
      VALUES (
        ${name}::uuid,
        ${workId}::uuid,
        ${hasPdf ? "completed" : "completed_with_warnings"},
        ${JSON.stringify({ styleGuide: "Nature", targetPages: 8, enablePlanning: true })}::jsonb,
        ${title},
        'graph',
        ${wordCount},
        0,
        ${hasPdf ? "Paper generation complete" : "Generation imported from storage"},
        ${hasPdf ? pdfPath.replace(/\\/g, "/") : null},
        ${outputDir},
        ${createdAt},
        ${createdAt}
      )
    `;

    await db`
      INSERT INTO generation_events (generation_id, agent, event_type, message, metadata)
      VALUES (
        ${name}::uuid,
        'Commander',
        'completed',
        ${`Imported generation from storage (${wordCount} words)`},
        ${JSON.stringify({ workflow_stage: "complete", word_count: wordCount, imported: true })}::jsonb
      )
    `;

    imported++;
  }

  return imported;
}
