#!/usr/bin/env node
/** Remove demo seeded paper generations (8-event fakes). */
import postgres from "postgres";
import fs from "fs";
import path from "path";
import { STORAGE_PATH } from "./seed-utils.mjs";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

const sql = postgres(DATABASE_URL);

const gens = await sql`
  SELECT id, title, output_dir FROM paper_generations ORDER BY created_at ASC
`;

let removed = 0;
for (const g of gens) {
  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count FROM generation_events WHERE generation_id = ${g.id}::uuid
  `;
  if (count <= 10) {
    await sql`DELETE FROM generation_events WHERE generation_id = ${g.id}::uuid`;
    await sql`DELETE FROM paper_generations WHERE id = ${g.id}::uuid`;
    if (g.output_dir && fs.existsSync(g.output_dir)) {
      fs.rmSync(g.output_dir, { recursive: true, force: true });
    } else if (fs.existsSync(path.join(STORAGE_PATH, "generations", g.id))) {
      fs.rmSync(path.join(STORAGE_PATH, "generations", g.id), { recursive: true, force: true });
    }
    console.log(`Removed demo generation: ${g.title} (${g.id}, ${count} events)`);
    removed++;
  }
}

console.log(`Done. Removed ${removed} demo generation(s).`);
await sql.end();
