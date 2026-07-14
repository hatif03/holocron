#!/usr/bin/env node
/** Remove seeded demo generations (opt-in fakes). Keeps real agent runs. */
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
    } else {
      const alt = path.join(STORAGE_PATH, "generations", g.id);
      if (fs.existsSync(alt)) fs.rmSync(alt, { recursive: true, force: true });
    }
    console.log(`Removed seeded generation: ${g.title} (${g.id}, ${count} events)`);
    removed++;
  } else {
    console.log(`Keeping real generation: ${g.title} (${count} events)`);
  }
}

console.log(`Done. Removed ${removed} seeded generation(s).`);
await sql.end();
