#!/usr/bin/env node
/**
 * Seed two full research works with complete node data, linked to references_lib.
 * Run seed-references.mjs first.
 * Usage: node scripts/seed-works.mjs [--force]
 */
import postgres from "postgres";
import {
  copyAssetToWork,
  syncWorkReferences,
  ingestGraphMemory,
  resolveRefForNode,
  linkLiteraturePdf,
  assertWorkRefCount,
  writeReviewCurveSvg,
  writeRagMetricsSvg,
  STORAGE_PATH,
} from "./seed-utils.mjs";
import fs from "fs";
import path from "path";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

const LOCAL_USER = "00000000-0000-0000-0000-000000000001";
const force = process.argv.includes("--force");

/** Widen seeded canvas positions so nodes do not overlap at default zoom. */
const LAYOUT_SCALE_X = 1.55;
const LAYOUT_SCALE_Y = 2.0;

function layoutPos(x, y) {
  return {
    x: Math.round(x * LAYOUT_SCALE_X),
    y: Math.round(y * LAYOUT_SCALE_Y),
  };
}

const WORKS = [
  {
    title: "Retrieval-Augmented Generation for Scientific Literature",
    description:
      "End-to-end research graph for RAG-based literature synthesis: ideation through experiments to publication-ready figures.",
    nodes: [
      {
        key: "start_1",
        type: "start",
        label: "Paper Start",
        x: 40,
        y: 200,
        data: {
          status: "complete",
          paper_title: "Retrieval-Augmented Generation for Scientific Literature",
          target_venue: "Nature Machine Intelligence",
          deadline: "2026-09-01",
        },
      },
      {
        key: "idea_1",
        type: "idea",
        label: "RAG for Literature Synthesis",
        x: 280,
        y: 80,
        data: {
          status: "complete",
          body: "Combine dense retrieval over scientific corpora with LLM synthesis to accelerate literature reviews while preserving citation fidelity.",
          source_note: "Motivated by growing arXiv volume and reviewer burden.",
        },
      },
      {
        key: "question_1",
        type: "question",
        label: "Research Question",
        x: 280,
        y: 220,
        data: {
          status: "complete",
          body: "Does work-scoped memory (RAG + persistent graph context) improve factual accuracy in generated survey sections?",
        },
      },
      {
        key: "literature_1",
        type: "literature",
        label: "RAG Foundations",
        x: 280,
        y: 380,
        data: {
          status: "complete",
          bibtex: "",
          user_notes: "Core RAG and retrieval papers from library.",
          file_path: "",
          reference_id: null,
        },
        refIndex: 0,
      },
      {
        key: "literature_2",
        type: "literature",
        label: "Multi-Agent Writing",
        x: 280,
        y: 520,
        data: {
          status: "complete",
          bibtex: "",
          user_notes: "Agent orchestration for long-form scientific writing.",
          file_path: "",
          reference_id: null,
        },
        refIndex: 1,
      },
      {
        key: "concept_1",
        type: "concept",
        label: "Work-Scoped Memory",
        x: 520,
        y: 120,
        data: {
          status: "complete",
          definition:
            "Persistent memory container per research work storing graph snapshots, PDF chunks, and generation artifacts.",
          related_terms: "RAG, containerTag, hybrid search",
        },
      },
      {
        key: "method_1",
        type: "method",
        label: "Hybrid Retrieval Pipeline",
        x: 520,
        y: 280,
        data: {
          status: "complete",
          description:
            "Profile + search over work memory before each writing step; planner discovers arXiv refs when S2 unavailable.",
          pseudo_code:
            "1. profile(work_id)\n2. search_memories(query)\n3. draft_section(context + refs)\n4. store_memory(section)",
        },
      },
      {
        key: "data_1",
        type: "data",
        label: "Benchmark Corpus",
        x: 520,
        y: 440,
        data: {
          status: "complete",
          description: "50 survey papers across ML-for-science with gold-standard citation sets.",
          file_path: "works/benchmark/corpus.json",
        },
      },
      {
        key: "experiment_1",
        type: "experiment",
        label: "Ablation: Memory On/Off",
        x: 760,
        y: 200,
        data: {
          status: "complete",
          description: "Compare generation with and without Supermemory recall on same research graph.",
          environment: "Holocron agents + local Supermemory + LaTeX service",
        },
      },
      {
        key: "metric_1",
        type: "metric",
        label: "Citation F1",
        x: 760,
        y: 360,
        data: {
          status: "complete",
          name: "Citation F1",
          formula: "2 * precision * recall / (precision + recall)",
          target_value: "> 0.75",
        },
      },
      {
        key: "result_1",
        type: "result",
        label: "Memory Recall Gains",
        x: 1000,
        y: 160,
        data: {
          status: "complete",
          description: "Second-generation runs retrieved prior plan and section drafts from work memory.",
          value: "+18% citation F1 vs no-memory baseline",
        },
      },
      {
        key: "finding_1",
        type: "finding",
        label: "Key Finding",
        x: 1000,
        y: 320,
        data: {
          status: "complete",
          description:
            "Work-scoped memory reduces hallucinated citations and improves cross-section consistency.",
          significance: "Supports memory-first design for research agents.",
        },
      },
      {
        key: "figure_1",
        type: "figure",
        label: "Retrieval Recall Curve",
        x: 1000,
        y: 480,
        data: {
          status: "complete",
          caption: "Memory recall rate vs. query specificity across generation phases.",
          figure_path: "",
          script_source: "plot_recall.py",
        },
      },
      {
        key: "table_1",
        type: "table",
        label: "Ablation Results",
        x: 1180,
        y: 280,
        data: {
          status: "complete",
          caption: "Citation accuracy and reviewer scores with memory on/off.",
          columns: "Condition, Citation F1, Reviewer Score",
          rows: "No memory, 0.61, 3.2\nWith memory, 0.79, 4.1",
        },
      },
      {
        key: "end_1",
        type: "end",
        label: "Generate Paper",
        x: 1360,
        y: 280,
        data: { status: "none", notes: "Trigger multi-agent paper generation from this graph." },
      },
    ],
    edges: [
      ["start_1", "idea_1"],
      ["idea_1", "question_1"],
      ["idea_1", "literature_1"],
      ["question_1", "literature_2"],
      ["literature_1", "concept_1"],
      ["literature_2", "method_1"],
      ["concept_1", "method_1"],
      ["method_1", "data_1"],
      ["data_1", "experiment_1"],
      ["method_1", "experiment_1"],
      ["experiment_1", "metric_1"],
      ["experiment_1", "result_1"],
      ["result_1", "finding_1"],
      ["finding_1", "figure_1"],
      ["experiment_1", "table_1"],
      ["figure_1", "end_1"],
      ["table_1", "end_1"],
      ["finding_1", "end_1"],
    ],
  },
  {
    title: "Evaluating Multi-Agent Paper Writing Pipelines",
    description:
      "Hypothesis-driven evaluation of planner-writer-reviewer loops for automated manuscript generation.",
    nodes: [
      {
        key: "start_1",
        type: "start",
        label: "Paper Start",
        x: 40,
        y: 240,
        data: {
          status: "complete",
          paper_title: "Evaluating Multi-Agent Paper Writing Pipelines",
          target_venue: "ICML",
          deadline: "2026-05-15",
        },
      },
      {
        key: "hypothesis_1",
        type: "hypothesis",
        label: "Review Loops Improve Quality",
        x: 300,
        y: 100,
        data: {
          status: "complete",
          body: "Iterative reviewer-writer loops reduce structural and stylistic defects in generated manuscripts.",
          rationale: "Single-pass LLM drafting often violates venue style guides.",
        },
      },
      {
        key: "literature_1",
        type: "literature",
        label: "Agent Orchestration Survey",
        x: 300,
        y: 280,
        data: {
          status: "complete",
          bibtex: "",
          user_notes: "Prior work on LLM agents for scientific tasks.",
          file_path: "",
          reference_id: null,
        },
        refIndex: 2,
      },
      {
        key: "literature_2",
        type: "literature",
        label: "Automated Peer Review",
        x: 300,
        y: 420,
        data: {
          status: "complete",
          bibtex: "",
          user_notes: "LLM-based review and revision literature.",
          file_path: "",
          reference_id: null,
        },
        refIndex: 3,
      },
      {
        key: "method_1",
        type: "method",
        label: "Commander Pipeline",
        x: 560,
        y: 180,
        data: {
          status: "complete",
          description:
            "Planner → Writer (per section) → Reviewer loop → Typesetter → VLM layout check.",
          pseudo_code:
            "for section in plan:\n  draft = writer(section, memory)\n  for i in max_reviews:\n    draft = reviewer(draft)\n  compile_latex(draft)",
        },
      },
      {
        key: "experiment_1",
        type: "experiment",
        label: "Review Iteration Sweep",
        x: 560,
        y: 380,
        data: {
          status: "complete",
          description: "Sweep max_review_iterations ∈ {0,1,3,5} on identical research graphs.",
          environment: "Holocron commander + Nature style guide",
        },
      },
      {
        key: "metric_1",
        type: "metric",
        label: "Reviewer Score",
        x: 820,
        y: 120,
        data: {
          status: "complete",
          name: "Automated Reviewer Score",
          formula: "Mean of style, logic, structure sub-scores (1-5)",
          target_value: ">= 4.0",
        },
      },
      {
        key: "metric_2",
        type: "metric",
        label: "PDF Compile Success",
        x: 820,
        y: 280,
        data: {
          status: "complete",
          name: "Compile Success Rate",
          formula: "successful_pdfs / total_runs",
          target_value: "> 0.9",
        },
      },
      {
        key: "result_1",
        type: "result",
        label: "Diminishing Returns at 3 Rounds",
        x: 1080,
        y: 160,
        data: {
          status: "complete",
          description: "Quality gains plateau after three review iterations.",
          value: "Score 3.2 → 4.1 → 4.3 → 4.35",
        },
      },
      {
        key: "finding_1",
        type: "finding",
        label: "Optimal Review Depth",
        x: 1080,
        y: 320,
        data: {
          status: "complete",
          description: "Three review rounds balance quality and generation latency for 10-page papers.",
          significance: "Informs default maxReviewIterations in Holocron UI.",
        },
      },
      {
        key: "paper_section_1",
        type: "paper_section",
        label: "Methods Section Draft",
        x: 1080,
        y: 480,
        data: {
          status: "complete",
          section_name: "Methods",
          outline:
            "1. Pipeline architecture\n2. Agent roles\n3. Memory integration\n4. Evaluation protocol",
          draft_notes: "Link commander events to measurable outcomes.",
        },
      },
      {
        key: "figure_1",
        type: "figure",
        label: "Quality vs Iterations",
        x: 1280,
        y: 240,
        data: {
          status: "complete",
          caption: "Reviewer score vs. number of review iterations.",
          figure_path: "",
          script_source: "plot_review_curve.py",
        },
      },
      {
        key: "table_1",
        type: "table",
        label: "Review Iteration Ablation",
        x: 1280,
        y: 400,
        data: {
          status: "complete",
          caption: "Quality and compile success across review depths.",
          columns: "Iterations, Reviewer Score, Compile OK",
          rows: "0, 3.2, 0.85\n1, 3.8, 0.88\n3, 4.3, 0.92\n5, 4.35, 0.91",
        },
      },
      {
        key: "end_1",
        type: "end",
        label: "Generate Paper",
        x: 1480,
        y: 280,
        data: { status: "none", notes: "Generate evaluation paper from graph." },
      },
    ],
    edges: [
      ["start_1", "hypothesis_1"],
      ["hypothesis_1", "literature_1"],
      ["hypothesis_1", "literature_2"],
      ["literature_1", "method_1"],
      ["literature_2", "method_1"],
      ["method_1", "experiment_1"],
      ["experiment_1", "metric_1"],
      ["experiment_1", "metric_2"],
      ["metric_1", "result_1"],
      ["metric_2", "result_1"],
      ["result_1", "finding_1"],
      ["finding_1", "paper_section_1"],
      ["result_1", "figure_1"],
      ["figure_1", "table_1"],
      ["figure_1", "end_1"],
      ["table_1", "end_1"],
      ["paper_section_1", "end_1"],
      ["finding_1", "end_1"],
    ],
  },
];

async function seed() {
  const sql = postgres(DATABASE_URL);

  const refs = await sql`
    SELECT id, title, bibtex, url FROM references_lib
    WHERE user_id = ${LOCAL_USER}::uuid
    ORDER BY created_at ASC
    LIMIT 12
  `;

  if (refs.length < 2) {
    console.error("Run seed-references.mjs first (need at least 2 references).");
    await sql.end();
    process.exit(1);
  }

  for (const workDef of WORKS) {
    const existing = await sql`
      SELECT id FROM research_works WHERE title = ${workDef.title} LIMIT 1
    `;

    if (existing.length && !force) {
      console.log(`Work already exists: ${workDef.title}`);
      continue;
    }

    let workId;
    if (existing.length && force) {
      workId = existing[0].id;
      await sql`DELETE FROM graph_edges WHERE work_id = ${workId}::uuid`;
      await sql`DELETE FROM graph_nodes WHERE work_id = ${workId}::uuid`;
      await sql`
        UPDATE research_works SET description = ${workDef.description}, updated_at = NOW()
        WHERE id = ${workId}::uuid
      `;
    } else {
      const [work] = await sql`
        INSERT INTO research_works (user_id, title, description, is_template)
        VALUES (
          ${LOCAL_USER}::uuid,
          ${workDef.title},
          ${workDef.description},
          false
        )
        RETURNING id
      `;
      workId = work.id;
    }

    for (const n of workDef.nodes) {
      const { data, ref } = resolveRefForNode(n, refs, workDef.title);
      if (n.type === "literature") {
        // linked via resolveRefForNode
      }
      if (ref) {
        data.user_notes = `${data.user_notes || ""} [${ref.title}]`.trim();
      }
      await sql`
        INSERT INTO graph_nodes (work_id, node_key, type, label, position_x, position_y, data)
        VALUES (
          ${workId}::uuid, ${n.key}, ${n.type}, ${n.label},
          ${layoutPos(n.x, n.y).x}, ${layoutPos(n.x, n.y).y},
          ${sql.json(data)}
        )
      `;
      if (n.type === "literature" && ref) {
        await linkLiteraturePdf(sql, workId, n.key, ref);
      }
    }

    const chartByTitle = {
      "Retrieval-Augmented Generation for Scientific Literature": {
        file: "rag_retrieval_curve.svg",
        writer: writeRagMetricsSvg,
        node: "figure_1",
      },
      "Evaluating Multi-Agent Paper Writing Pipelines": {
        file: "review_quality_curve.svg",
        writer: writeReviewCurveSvg,
        node: "figure_1",
      },
    };
    const chartSpec = chartByTitle[workDef.title];
    if (chartSpec) {
      const chartPath = path.join(STORAGE_PATH, "works", workId, chartSpec.file);
      chartSpec.writer(chartPath);
      const rel = `works/${workId}/${chartSpec.file}`;
      const url = `/api/works/files?path=${encodeURIComponent(rel)}`;
      const rows = await sql`
        SELECT data FROM graph_nodes
        WHERE work_id = ${workId}::uuid AND node_key = ${chartSpec.node}
      `;
      if (rows.length) {
        const data = { ...rows[0].data, figure_path: rel, figure_path_url: url, status: "complete" };
        await sql`
          UPDATE graph_nodes SET data = ${sql.json(data)}
          WHERE work_id = ${workId}::uuid AND node_key = ${chartSpec.node}
        `;
      }
    }

    const assetByTitle = {
      "Retrieval-Augmented Generation for Scientific Literature": {
        data_1: "corpus.json",
      },
      "Evaluating Multi-Agent Paper Writing Pipelines": {},
    };
    const assets = assetByTitle[workDef.title] || {};
    const nodeRows = await sql`
      SELECT node_key, type, data FROM graph_nodes WHERE work_id = ${workId}::uuid
    `;
    for (const row of nodeRows) {
      const asset = assets[row.node_key];
      if (!asset) continue;
      const uploaded = copyAssetToWork(workId, asset);
      if (!uploaded) continue;
      const data = { ...row.data };
      if (row.type === "figure") {
        data.figure_path = uploaded.path;
        data.figure_path_url = uploaded.url;
      } else if (row.type === "data") {
        data.file_path = uploaded.path;
        data.file_path_url = uploaded.url;
      }
      await sql`
        UPDATE graph_nodes SET data = ${JSON.stringify(data)}::jsonb
        WHERE work_id = ${workId}::uuid AND node_key = ${row.node_key}
      `;
    }

    const finalNodes = await sql`
      SELECT node_key, data FROM graph_nodes WHERE work_id = ${workId}::uuid
    `;
    await syncWorkReferences(
      sql,
      workId,
      finalNodes.map((r) => ({ data: r.data }))
    );
    await assertWorkRefCount(sql, workId, workDef.title, 2);
    await ingestGraphMemory(
      workId,
      workDef.title,
      workDef.nodes.length,
      workDef.edges.length
    );

    for (let i = 0; i < workDef.edges.length; i++) {
      const [source, target] = workDef.edges[i];
      await sql`
        INSERT INTO graph_edges (work_id, edge_key, source_node_key, target_node_key)
        VALUES (${workId}::uuid, ${`e${i + 1}`}, ${source}, ${target})
      `;
    }

    console.log(`Seeded work: ${workDef.title} (${workId})`);
  }

  await sql.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
