#!/usr/bin/env node
/**
 * Re-draft empty sections for an existing generation via agents API.
 * Usage: node scripts/repair-generation-sections.mjs <genId> [sectionNames...]
 */
import postgres from "postgres";
import fs from "fs";
import path from "path";
import { STORAGE_PATH } from "./seed-utils.mjs";

const AGENTS = process.env.AGENTS_SERVICE_URL || "http://localhost:8000";
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

const sql = postgres(DATABASE_URL);
const genId = process.argv[2];
const sectionArgs = process.argv.slice(3);

if (!genId) {
  console.error("Usage: node scripts/repair-generation-sections.mjs <genId> [sections...]");
  process.exit(1);
}

const [gen] = await sql`SELECT * FROM paper_generations WHERE id = ${genId}::uuid`;
if (!gen) {
  console.error("Generation not found");
  process.exit(1);
}

const workId = gen.work_id;
const nodes = await sql`
  SELECT id, node_key, type, label, data FROM graph_nodes WHERE work_id = ${workId}::uuid
`;
const edges = await sql`
  SELECT source_node_key, target_node_key FROM graph_edges WHERE work_id = ${workId}::uuid
`;

const graph = {
  nodes: nodes.map((n) => ({
    id: n.node_key,
    type: n.type,
    label: n.label,
    data: typeof n.data === "string" ? JSON.parse(n.data) : n.data,
  })),
  edges: edges.map((e) => ({ source: e.source_node_key, target: e.target_node_key })),
};

const outputDir = gen.output_dir || path.join(STORAGE_PATH, "generations", genId);
const sectionsDir = path.join(outputDir, "sections");

let targets = sectionArgs;
if (!targets.length) {
  targets = fs.existsSync(sectionsDir)
    ? fs
        .readdirSync(sectionsDir)
        .filter((f) => f.endsWith(".tex"))
        .filter((f) => fs.statSync(path.join(sectionsDir, f)).size < 50)
        .map((f) => f.replace(".tex", "").replace(/_/g, " "))
    : [];
}

if (!targets.length) {
  console.log("No empty sections to repair.");
  process.exit(0);
}

console.log(`Repairing sections: ${targets.join(", ")}`);

for (const sectionName of targets) {
  const res = await fetch(`${AGENTS}/agents/writer/draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      section_name: sectionName,
      context: { graph, title: gen.title, repair: true },
      style_guide: "Nature",
      target_words: sectionName.toLowerCase().includes("related") ? 600 : 900,
      paragraphs: 4,
      graph_snippets: [],
      bib_keys: [],
    }),
  });
  if (!res.ok) {
    console.error(`Writer failed for ${sectionName}: ${res.status}`);
    continue;
  }
  const draft = await res.json();
  const safe = sectionName.replace(/ /g, "_");
  const outPath = path.join(sectionsDir, `${safe}.tex`);
  fs.mkdirSync(sectionsDir, { recursive: true });
  fs.writeFileSync(outPath, draft.content || "");
  console.log(`Wrote ${outPath} (${draft.word_count || 0} words)`);

  await sql`
    INSERT INTO generation_events (generation_id, agent, event_type, message, metadata)
    VALUES (
      ${genId}::uuid, 'Writer', 'completed',
      ${`Repaired ${sectionName} (${draft.word_count || 0} words)`},
      ${sql.json({ section: sectionName, repaired: true })}
    )
  `;
}

await sql.end();
console.log("Repair complete. Recompile PDF manually or re-run gen:live.");
