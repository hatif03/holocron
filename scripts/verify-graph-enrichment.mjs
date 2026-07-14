#!/usr/bin/env node
/** Verify seeded research graphs have refs, bibtex, and assets. */
import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

const LOCAL_USER = "00000000-0000-0000-0000-000000000001";

async function main() {
  const sql = postgres(DATABASE_URL);
  const works = await sql`
    SELECT id, title FROM research_works WHERE user_id = ${LOCAL_USER}::uuid
  `;

  let pass = 0;
  let fail = 0;

  for (const work of works) {
    const [{ ref_count }] = await sql`
      SELECT COUNT(*)::int AS ref_count FROM work_references WHERE work_id = ${work.id}::uuid
    `;
    const litNodes = await sql`
      SELECT node_key, data FROM graph_nodes
      WHERE work_id = ${work.id}::uuid AND type = 'literature'
    `;
    const figNodes = await sql`
      SELECT node_key, data FROM graph_nodes
      WHERE work_id = ${work.id}::uuid AND type = 'figure'
    `;

    const issues = [];
    if (ref_count < 1) issues.push("ref_count=0");
    for (const n of litNodes) {
      if (!n.data?.bibtex) issues.push(`${n.node_key}: missing bibtex`);
      if (!n.data?.reference_id) issues.push(`${n.node_key}: missing reference_id`);
    }
    for (const n of figNodes) {
      if (!n.data?.figure_path) issues.push(`${n.node_key}: missing figure_path`);
    }

    if (issues.length) {
      console.log(`FAIL  ${work.title}`);
      issues.forEach((i) => console.log(`      - ${i}`));
      fail++;
    } else {
      console.log(`PASS  ${work.title} (${ref_count} refs, ${litNodes.length} lit, ${figNodes.length} fig)`);
      pass++;
    }
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  await sql.end();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
