#!/usr/bin/env node
/**
 * Backfill literature node reference_id and work_references from references_lib order.
 * Usage: node scripts/backfill-work-references.mjs
 */
import postgres from "postgres";
import { syncWorkReferences, assertWorkRefCount } from "./seed-utils.mjs";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

const LOCAL_USER = "00000000-0000-0000-0000-000000000001";

/** Known refIndex per work title + node_key from seed definitions */
const REF_INDEX_MAP = {
  "AI tools expand impact but contract focus": {
    literature_1: 0,
    literature_2: 1,
  },
  "Retrieval-Augmented Generation for Scientific Literature": {
    literature_1: 0,
    literature_2: 1,
  },
  "Evaluating Multi-Agent Paper Writing Pipelines": {
    literature_1: 2,
    literature_2: 3,
  },
};

async function main() {
  const sql = postgres(DATABASE_URL);

  const refs = await sql`
    SELECT id, title, bibtex, url FROM references_lib
    WHERE user_id = ${LOCAL_USER}::uuid
    ORDER BY created_at ASC
  `;

  if (!refs.length) {
    console.error("No references in library. Run: npm run seed:refs -- --force");
    await sql.end();
    process.exit(1);
  }

  const works = await sql`
    SELECT id, title FROM research_works WHERE user_id = ${LOCAL_USER}::uuid
  `;

  let ok = true;
  for (const work of works) {
    const mapping = REF_INDEX_MAP[work.title] || {};
    const nodes = await sql`
      SELECT node_key, type, data FROM graph_nodes
      WHERE work_id = ${work.id}::uuid AND type = 'literature'
    `;

    for (const node of nodes) {
      const refIndex = mapping[node.node_key];
      if (refIndex == null) continue;
      const ref = refs[refIndex];
      if (!ref) {
        console.warn(`Skip ${work.title}/${node.node_key}: refIndex ${refIndex} missing`);
        continue;
      }
      const data = { ...node.data, reference_id: ref.id, bibtex: ref.bibtex || node.data?.bibtex };
      await sql`
        UPDATE graph_nodes SET data = ${sql.json(data)}
        WHERE work_id = ${work.id}::uuid AND node_key = ${node.node_key}
      `;
      console.log(`Linked ${work.title} → ${node.node_key} → ${ref.title.slice(0, 50)}`);
    }

    const allNodes = await sql`
      SELECT data FROM graph_nodes WHERE work_id = ${work.id}::uuid
    `;
    await syncWorkReferences(
      sql,
      work.id,
      allNodes.map((r) => ({ data: r.data }))
    );
    const minRefs = work.title.includes("template") || work.title.includes("AI tools") ? 1 : 1;
    if (!(await assertWorkRefCount(sql, work.id, work.title, minRefs))) ok = false;
  }

  await sql.end();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
