#!/usr/bin/env node
/** Remove specific generation IDs (DB + storage). */
import postgres from "postgres";
import fs from "fs";
import path from "path";
import { STORAGE_PATH } from "./seed-utils.mjs";

const ids = process.argv.slice(2);
if (!ids.length) {
  console.error("Usage: node scripts/remove-generations.mjs <genId> [...]");
  process.exit(1);
}

const sql = postgres(
  process.env.DATABASE_URL ||
    "postgresql://holocron:holocron@localhost:5432/holocron"
);

for (const id of ids) {
  const [g] = await sql`
    SELECT id, title, output_dir FROM paper_generations WHERE id = ${id}::uuid
  `;
  if (!g) {
    console.log(`Skip missing ${id}`);
    continue;
  }
  await sql`DELETE FROM generation_events WHERE generation_id = ${id}::uuid`;
  await sql`DELETE FROM paper_generations WHERE id = ${id}::uuid`;
  for (const d of [g.output_dir, path.join(STORAGE_PATH, "generations", id)]) {
    if (d && fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
  }
  console.log(`Removed: ${g.title} (${id})`);
}

await sql.end();
