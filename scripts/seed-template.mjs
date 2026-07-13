#!/usr/bin/env node
/**
 * Seed demo template work: "AI tools expand impact but contract focus"
 * 10 nodes, 13 edges
 */
import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

const LOCAL_USER = "00000000-0000-0000-0000-000000000001";

const nodes = [
  { key: "start_1", type: "start", label: "Paper Start", x: 50, y: 200, data: { paper_title: "AI tools expand impact but contract focus", target_venue: "Nature", deadline: "2026-06-01" } },
  { key: "idea_1", type: "idea", label: "AI Dual Effect Hypothesis", x: 300, y: 100, data: { content: "AI tools expand individual scientist impact but contract collective research diversity" } },
  { key: "hypothesis_1", type: "hypothesis", label: "Focus Contraction Hypothesis", x: 300, y: 250, data: { content: "AI-assisted research narrows the knowledge space over time" } },
  { key: "literature_1", type: "literature", label: "Prior Bibliometric Studies", x: 300, y: 400, data: { bibtex: "", user_notes: "Key prior work on research diversity", file_path: "" } },
  { key: "method_1", type: "method", label: "Large-scale Bibliometric Analysis", x: 550, y: 150, data: { content: "OpenAlex dataset analysis across 50M papers" } },
  { key: "data_1", type: "data", label: "OpenAlex Dataset", x: 550, y: 300, data: { content: "Bibliometric metadata 2010-2025" } },
  { key: "experiment_1", type: "experiment", label: "Impact vs. Diversity Analysis", x: 550, y: 450, data: { content: "Measure individual impact growth vs topic diversity contraction" } },
  { key: "result_1", type: "result", label: "Impact Growth Results", x: 800, y: 150, data: { content: "30% increase in individual citation impact with AI tools" } },
  { key: "finding_1", type: "finding", label: "Diversity Contraction Finding", x: 800, y: 300, data: { content: "Research topic diversity decreased 15% in AI-adopting fields" } },
  { key: "end_1", type: "end", label: "Paper End", x: 1050, y: 250, data: { notes: "Generate paper from this graph" } },
];

const edges = [
  ["start_1", "idea_1"],
  ["idea_1", "hypothesis_1"],
  ["idea_1", "literature_1"],
  ["hypothesis_1", "method_1"],
  ["literature_1", "method_1"],
  ["method_1", "data_1"],
  ["data_1", "experiment_1"],
  ["method_1", "experiment_1"],
  ["experiment_1", "result_1"],
  ["experiment_1", "finding_1"],
  ["result_1", "end_1"],
  ["finding_1", "end_1"],
  ["hypothesis_1", "finding_1"],
];

async function seed() {
  const sql = postgres(DATABASE_URL);

  const existing = await sql`
    SELECT id FROM research_works WHERE title = 'AI tools expand impact but contract focus' LIMIT 1
  `;
  if (existing.length) {
    console.log("Template already seeded:", existing[0].id);
    await sql.end();
    return;
  }

  const [work] = await sql`
    INSERT INTO research_works (user_id, title, description, is_template)
    VALUES (
      ${LOCAL_USER}::uuid,
      'AI tools expand impact but contract focus',
      'Template canvas based on Nature AI-Science study. Demonstrates research graph workflow.',
      true
    )
    RETURNING id
  `;

  const workId = work.id;

  for (const n of nodes) {
    await sql`
      INSERT INTO graph_nodes (work_id, node_key, type, label, position_x, position_y, data)
      VALUES (
        ${workId}::uuid, ${n.key}, ${n.type}, ${n.label}, ${n.x}, ${n.y},
        ${JSON.stringify(n.data)}::jsonb
      )
    `;
  }

  for (let i = 0; i < edges.length; i++) {
    const [source, target] = edges[i];
    await sql`
      INSERT INTO graph_edges (work_id, edge_key, source_node_key, target_node_key)
      VALUES (${workId}::uuid, ${`e${i + 1}`}, ${source}, ${target})
    `;
  }

  console.log("Seeded template work:", workId);
  await sql.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
