#!/usr/bin/env node
/**
 * Seed demo template work: "AI tools expand impact but contract focus"
 * ~14 nodes with typed fields and figure nodes
 *
 * Usage: node scripts/seed-template.mjs [--force]
 */
import postgres from "postgres";
import {
  copyAssetToWork,
  syncWorkReferences,
  ingestGraphMemory,
  resolveRefForNode,
  linkLiteraturePdf,
  assertWorkRefCount,
} from "./seed-utils.mjs";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

const LOCAL_USER = "00000000-0000-0000-0000-000000000001";
const force = process.argv.includes("--force");

const nodes = [
  {
    key: "start_1",
    type: "start",
    label: "Paper Start",
    x: 50,
    y: 200,
    data: {
      status: "complete",
      paper_title: "AI tools expand impact but contract focus",
      target_venue: "Nature",
      deadline: "2026-06-01",
    },
  },
  {
    key: "idea_1",
    type: "idea",
    label: "AI Dual Effect Hypothesis",
    x: 300,
    y: 80,
    data: {
      status: "complete",
      body: "AI tools expand individual scientist impact but contract collective research diversity",
      source_note: "Inspired by Nature AI-Science study",
    },
  },
  {
    key: "hypothesis_1",
    type: "hypothesis",
    label: "Focus Contraction Hypothesis",
    x: 300,
    y: 220,
    data: {
      status: "draft",
      body: "AI-assisted research narrows the knowledge space over time",
      rationale: "Tool-assisted literature search reduces serendipitous discovery",
    },
  },
  {
    key: "literature_1",
    type: "literature",
    label: "Prior Bibliometric Studies",
    x: 300,
    y: 380,
    data: {
      status: "complete",
      bibtex: "",
      user_notes: "Key prior work on research diversity and AI-assisted science.",
      file_path: "",
    },
    refIndex: 0,
  },
  {
    key: "literature_2",
    type: "literature",
    label: "AI-Assisted Science Survey",
    x: 300,
    y: 520,
    data: {
      status: "complete",
      bibtex: "",
      user_notes: "Survey of AI adoption patterns in scientific workflows.",
      file_path: "",
    },
    refIndex: 1,
  },
  {
    key: "method_1",
    type: "method",
    label: "Large-scale Bibliometric Analysis",
    x: 550,
    y: 120,
    data: {
      status: "complete",
      description: "OpenAlex dataset analysis across 50M papers",
      pseudo_code: "1. Fetch OpenAlex metadata\n2. Compute topic diversity metrics\n3. Compare pre/post AI adoption",
    },
  },
  {
    key: "data_1",
    type: "data",
    label: "OpenAlex Dataset",
    x: 550,
    y: 280,
    data: {
      status: "complete",
      description: "Bibliometric metadata 2010-2025",
      file_path: "",
    },
  },
  {
    key: "experiment_1",
    type: "experiment",
    label: "Impact vs. Diversity Analysis",
    x: 550,
    y: 440,
    data: {
      status: "draft",
      description: "Measure individual impact growth vs topic diversity contraction",
      environment: "Python 3.11, pandas, networkx",
    },
  },
  {
    key: "result_1",
    type: "result",
    label: "Impact Growth Results",
    x: 800,
    y: 100,
    data: {
      status: "complete",
      description: "Individual citation impact increased with AI tool adoption",
      value: "30% increase",
    },
  },
  {
    key: "finding_1",
    type: "finding",
    label: "Diversity Contraction Finding",
    x: 800,
    y: 260,
    data: {
      status: "complete",
      description: "Research topic diversity decreased in AI-adopting fields",
      significance: "Suggests trade-off between productivity and exploration",
    },
  },
  {
    key: "figure_1",
    type: "figure",
    label: "AI Adoption Growth",
    x: 800,
    y: 400,
    data: {
      status: "draft",
      caption: "Growth in AI tool adoption across scientific disciplines (2018–2025)",
      figure_path: "",
      script_source: "plot_adoption.py",
    },
  },
  {
    key: "figure_2",
    type: "figure",
    label: "Individual Impact & Career",
    x: 950,
    y: 100,
    data: {
      status: "draft",
      caption: "Individual citation impact before and after AI tool adoption",
      figure_path: "",
      script_source: "plot_impact.py",
    },
  },
  {
    key: "figure_3",
    type: "figure",
    label: "Knowledge Space Contraction",
    x: 950,
    y: 260,
    data: {
      status: "draft",
      caption: "Topic diversity metrics showing knowledge space contraction",
      figure_path: "",
      script_source: "plot_diversity.py",
    },
  },
  {
    key: "figure_4",
    type: "figure",
    label: "Engagement & Overlap",
    x: 950,
    y: 420,
    data: {
      status: "draft",
      caption: "Research engagement overlap in AI-assisted vs traditional workflows",
      figure_path: "",
      script_source: "plot_overlap.py",
    },
  },
  {
    key: "end_1",
    type: "end",
    label: "Paper End",
    x: 1150,
    y: 250,
    data: {
      status: "none",
      notes: "Generate paper from this graph",
    },
  },
];

const edges = [
  ["start_1", "idea_1"],
  ["idea_1", "hypothesis_1"],
  ["idea_1", "literature_1"],
  ["idea_1", "literature_2"],
  ["literature_1", "method_1"],
  ["literature_2", "method_1"],
  ["hypothesis_1", "method_1"],
  ["literature_1", "method_1"],
  ["method_1", "data_1"],
  ["data_1", "experiment_1"],
  ["method_1", "experiment_1"],
  ["experiment_1", "result_1"],
  ["experiment_1", "finding_1"],
  ["result_1", "figure_1"],
  ["result_1", "figure_2"],
  ["finding_1", "figure_3"],
  ["experiment_1", "figure_4"],
  ["figure_1", "end_1"],
  ["figure_2", "end_1"],
  ["figure_3", "end_1"],
  ["figure_4", "end_1"],
  ["hypothesis_1", "finding_1"],
];

async function seed() {
  const sql = postgres(DATABASE_URL);

  const refs = await sql`
    SELECT id, title, bibtex, url FROM references_lib
    WHERE user_id = ${LOCAL_USER}::uuid
    ORDER BY created_at ASC
    LIMIT 12
  `;

  const existing = await sql`
    SELECT id FROM research_works WHERE title = 'AI tools expand impact but contract focus' LIMIT 1
  `;

  if (existing.length && !force) {
    console.log("Template already seeded:", existing[0].id);
    console.log("Use --force to re-seed with updated data.");
    await sql.end();
    return;
  }

  let workId;

  if (existing.length && force) {
    workId = existing[0].id;
    await sql`DELETE FROM graph_edges WHERE work_id = ${workId}::uuid`;
    await sql`DELETE FROM graph_nodes WHERE work_id = ${workId}::uuid`;
    console.log("Re-seeding existing template:", workId);
  } else {
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
    workId = work.id;
  }

  const assetMap = {
    data_1: "openalex_sample.csv",
    figure_1: "tpl_fig1.svg",
    figure_2: "tpl_fig2.svg",
    figure_3: "tpl_fig3.svg",
    figure_4: "tpl_fig4.svg",
  };

  const workTitle = "AI tools expand impact but contract focus";
  const seededNodes = [];
  for (const n of nodes) {
    const { data, ref } = resolveRefForNode(n, refs, workTitle);
    const asset = assetMap[n.key];
    if (asset) {
      const uploaded = copyAssetToWork(workId, asset);
      if (uploaded) {
        if (n.type === "figure") {
          data.figure_path = uploaded.path;
          data.figure_path_url = uploaded.url;
        } else if (n.type === "data") {
          data.file_path = uploaded.path;
          data.file_path_url = uploaded.url;
        }
      }
    }
    seededNodes.push({ ...n, data });
    await sql`
      INSERT INTO graph_nodes (work_id, node_key, type, label, position_x, position_y, data)
      VALUES (
        ${workId}::uuid, ${n.key}, ${n.type}, ${n.label}, ${n.x}, ${n.y},
        ${sql.json(data)}
      )
    `;
    if (n.type === "literature" && ref) {
      await linkLiteraturePdf(sql, workId, n.key, ref);
    }
  }

  for (let i = 0; i < edges.length; i++) {
    const [source, target] = edges[i];
    await sql`
      INSERT INTO graph_edges (work_id, edge_key, source_node_key, target_node_key)
      VALUES (${workId}::uuid, ${`e${i + 1}`}, ${source}, ${target})
    `;
  }

  await syncWorkReferences(sql, workId, seededNodes);
  await assertWorkRefCount(sql, workId, workTitle, 1);
  await ingestGraphMemory(workId, workTitle, nodes.length, edges.length);

  console.log("Seeded template work:", workId, `(${nodes.length} nodes, ${edges.length} edges)`);
  await sql.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
