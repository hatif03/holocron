#!/usr/bin/env node
/**
 * Backfill generation_events from disk artifacts for completed generations.
 * Usage: node scripts/backfill-generation-events.mjs [genId]
 */
import postgres from "postgres";
import fs from "fs";
import path from "path";
import { STORAGE_PATH } from "./seed-utils.mjs";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

const sql = postgres(DATABASE_URL);
const genId = process.argv[2];

let gens;
if (genId) {
  gens = await sql`SELECT * FROM paper_generations WHERE id = ${genId}::uuid`;
} else {
  gens = await sql`
    SELECT g.* FROM paper_generations g
    LEFT JOIN (
      SELECT generation_id, COUNT(*)::int AS cnt FROM generation_events GROUP BY generation_id
    ) e ON e.generation_id = g.id
    WHERE COALESCE(e.cnt, 0) = 0
      AND g.status IN ('completed', 'completed_with_warnings')
    ORDER BY g.created_at DESC
    LIMIT 10
  `;
}

if (!gens.length) {
  console.log("No generations need backfill.");
  process.exit(0);
}

for (const gen of gens) {
  const id = gen.id;
  const outputDir =
    gen.output_dir || path.join(STORAGE_PATH, "generations", id);
  if (!fs.existsSync(outputDir)) {
    console.warn(`Skip ${id}: output dir missing`);
    continue;
  }

  const existing = await sql`
    SELECT COUNT(*)::int AS cnt FROM generation_events WHERE generation_id = ${id}::uuid
  `;
  if (existing[0].cnt > 0 && genId) {
    console.log(`${id}: already has ${existing[0].cnt} events`);
    continue;
  }

  const events = [];
  const t0 = new Date(gen.created_at).getTime();

  events.push({
    agent: "Commander",
    event_type: "agent",
    message: "CommanderAgent: Starting paper generation pipeline (backfilled)",
    metadata: { phase: "planning", workflow_stage: "start", backfilled: true },
    offset_ms: 0,
  });

  events.push({
    agent: "Planner",
    event_type: "completed",
    message: "Plan created (backfilled from artifacts)",
    metadata: { phase: "planning", backfilled: true },
    offset_ms: 5000,
  });

  const sectionsDir = path.join(outputDir, "sections");
  if (fs.existsSync(sectionsDir)) {
    const sectionFiles = fs
      .readdirSync(sectionsDir)
      .filter((f) => f.endsWith(".tex"))
      .sort();
    sectionFiles.forEach((file, i) => {
      const full = path.join(sectionsDir, file);
      const stat = fs.statSync(full);
      const content = fs.readFileSync(full, "utf-8");
      const words = content.split(/\s+/).filter(Boolean).length;
      const name = file.replace(".tex", "").replace(/_/g, " ");
      events.push({
        agent: "Writer",
        event_type: "writing",
        message: `Drafting ${name} (backfilled)`,
        metadata: { phase: "body_sections", section: name, backfilled: true },
        offset_ms: 10000 + i * 8000,
      });
      events.push({
        agent: "Writer",
        event_type: "completed",
        message: `Generated ${name} (${words} words)`,
        metadata: {
          phase: "body_sections",
          section: name,
          word_count: words,
          file_mtime: stat.mtime.toISOString(),
          backfilled: true,
        },
        offset_ms: 12000 + i * 8000,
      });
      if (words > 50) {
        events.push({
          agent: "Reviewer",
          event_type: "completed",
          message: `Approved ${name}`,
          metadata: { phase: "review", section: name, backfilled: true },
          offset_ms: 14000 + i * 8000,
        });
      }
    });
  }

  const pdfPath = gen.pdf_path || path.join(outputDir, "main.pdf");
  if (fs.existsSync(pdfPath)) {
    events.push({
      agent: "Typesetter",
      event_type: "completed",
      message: "PDF compiled successfully (backfilled)",
      metadata: { phase: "typesetting", backfilled: true },
      offset_ms: 120000,
    });
  }

  events.push({
    agent: "Commander",
    event_type: "completed",
    message: `Paper generation complete (${gen.word_count || 0} words total, backfilled)`,
    metadata: { workflow_stage: "complete", word_count: gen.word_count, backfilled: true },
    offset_ms: 130000,
  });

  await sql`DELETE FROM generation_events WHERE generation_id = ${id}::uuid`;

  for (const ev of events) {
    const createdAt = new Date(t0 + ev.offset_ms).toISOString();
    await sql`
      INSERT INTO generation_events (generation_id, agent, event_type, message, metadata, created_at)
      VALUES (
        ${id}::uuid,
        ${ev.agent},
        ${ev.event_type},
        ${ev.message},
        ${sql.json(ev.metadata)},
        ${createdAt}::timestamptz
      )
    `;
  }

  await sql`
    UPDATE paper_generations SET
      current_step = ${events[events.length - 1].message},
      review_count = ${events.filter((e) => e.agent === "Reviewer").length},
      updated_at = NOW()
    WHERE id = ${id}::uuid
  `;

  console.log(`Backfilled ${events.length} events for ${id}`);
}

await sql.end();
