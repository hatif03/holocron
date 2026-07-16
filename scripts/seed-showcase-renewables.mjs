#!/usr/bin/env node
/**
 * Seed renewable energy showcase work with pre-seeded Supermemory recalls for demo.
 *
 * Demo flow:
 * 1. npm run seed:showcase:renewables
 * 2. Open work → Memory tab shows pre-seeded hits
 * 3. Generate paper → Process Log + Memory trace show profile/search/store timeline
 * 4. Generate again → Introduction/Methods recall prior section drafts
 *
 * Usage: node scripts/seed-showcase-renewables.mjs [--force]
 */
import postgres from "postgres";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  STORAGE_PATH,
  ASSETS_DIR,
  ingestGraphMemory,
  syncWorkReferences,
  downloadOwidCsv,
  sampleRenewablesPanel,
  writeRenewablesBarPng,
  writeFossilShareHistogramPng,
  seedRecallMemories,
  waitForSearchable,
} from "./seed-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(ASSETS_DIR, "renewables");
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";
const LOCAL_USER = "00000000-0000-0000-0000-000000000001";
const force = process.argv.includes("--force");

const TITLE =
  "Renewable Electricity Share and Fossil Fuel Dependence: A Global Energy Transition Analysis (2000–2023)";

const NODES = [
  {
    key: "start_1",
    type: "start",
    label: "Paper Start",
    x: 40,
    y: 200,
    data: {
      status: "complete",
      paper_title: TITLE,
      keywords: "renewable energy, fossil fuels, energy transition, OWID",
      target_venue: "Nature Energy",
      deadline: "2026-12-01",
    },
  },
  {
    key: "idea_1",
    type: "idea",
    label: "Energy Transition",
    x: 260,
    y: 80,
    data: {
      status: "complete",
      body: "Countries diverge in renewable electricity adoption while fossil fuel dependence persists in transport and industry.",
      source_note: "Our World in Data — energy mix indicators 2000–2023.",
    },
  },
  {
    key: "question_1",
    type: "question",
    label: "Research Question",
    x: 260,
    y: 220,
    data: {
      status: "complete",
      body: "How does renewable electricity share covary with fossil fuel dependence across countries since 2000?",
      context: "Cross-country panel using OWID harmonized energy indicators.",
    },
  },
  {
    key: "hypothesis_1",
    type: "hypothesis",
    label: "Hypothesis",
    x: 260,
    y: 360,
    data: {
      status: "complete",
      body: "Higher renewable electricity share associates with lower fossil primary energy share in the sampled panel.",
      rationale: "Electrification and grid decarbonization pathways.",
    },
  },
  {
    key: "literature_1",
    type: "literature",
    label: "OWID Energy Data",
    x: 260,
    y: 500,
    data: {
      status: "complete",
      user_notes: "OWID renewable electricity and fossil fuel share datasets.",
      bibtex:
        "@misc{owidenergy, title={Energy}, author={Our World in Data}, year={2024}, howpublished={\\url{https://ourworldindata.org/energy}}}",
      file_path: "",
    },
  },
  {
    key: "concept_1",
    type: "concept",
    label: "Energy Transition",
    x: 500,
    y: 120,
    data: {
      status: "complete",
      definition:
        "Shift from fossil-dominated primary energy toward low-carbon electricity and end-use electrification.",
      related_terms: "renewables, fossil share, grid decarbonization",
    },
  },
  {
    key: "method_1",
    type: "method",
    label: "Panel Correlation",
    x: 500,
    y: 280,
    data: {
      status: "complete",
      description:
        "Merge OWID renewable share and fossil share panels; compute Pearson correlation and regional means.",
      pseudo_code: `import pandas as pd\nfrom scipy.stats import pearsonr\n\ndf = pd.read_csv("renewables_fossil_panel.csv")\ndf = df.dropna(subset=["renewable_share", "fossil_share"])\nr, p = pearsonr(df["renewable_share"], df["fossil_share"])\nprint(f"r={r:.3f}, p={p:.4f}")`,
      environment: "Python 3.12, pandas, scipy, matplotlib",
    },
  },
  {
    key: "data_1",
    type: "data",
    label: "Energy Panel CSV",
    x: 500,
    y: 440,
    data: {
      status: "complete",
      description: "10-country panel: renewable electricity share and fossil primary energy share.",
      file_path: "",
    },
  },
  {
    key: "experiment_1",
    type: "experiment",
    label: "Transition Study",
    x: 740,
    y: 200,
    data: {
      status: "complete",
      name: "Renewables vs fossil correlation",
      environment: "Holocron agents + local LaTeX",
      user_notes: "Generate bar chart and histogram from panel CSV.",
    },
  },
  {
    key: "metric_1",
    type: "metric",
    label: "Pearson r",
    x: 740,
    y: 360,
    data: {
      status: "complete",
      name: "Pearson correlation",
      formula: "r = \\frac{\\sum_{i}(x_i - \\bar{x})(y_i - \\bar{y})}{\\sqrt{\\sum_{i}(x_i - \\bar{x})^2}\\sqrt{\\sum_{i}(y_i - \\bar{y})^2}}",
      unit: "dimensionless",
      target_value: "-0.55",
    },
  },
  {
    key: "result_1",
    type: "result",
    label: "Panel Results",
    x: 980,
    y: 200,
    data: {
      status: "complete",
      value: "Negative correlation between renewable share and fossil dependence (r ≈ -0.5).",
      significance: "p < 0.01 for pooled 2000–2023 observations.",
    },
  },
  {
    key: "finding_1",
    type: "finding",
    label: "Key Finding",
    x: 980,
    y: 360,
    data: {
      status: "complete",
      body: "Leaders in renewable electricity (e.g. Norway, Brazil) cluster at lower fossil shares; coal-heavy economies lag.",
    },
  },
  {
    key: "figure_1",
    type: "figure",
    label: "Renewables Bar Chart",
    x: 980,
    y: 520,
    data: {
      status: "complete",
      caption: "Renewable electricity share for selected countries (2023, %).",
      figure_path: "",
    },
  },
  {
    key: "figure_2",
    type: "figure",
    label: "Fossil Share Distribution",
    x: 980,
    y: 660,
    data: {
      status: "complete",
      caption: "Distribution of fossil fuel share of primary energy (2023).",
      figure_path: "",
    },
  },
  {
    key: "table_1",
    type: "table",
    label: "Summary Table",
    x: 1220,
    y: 360,
    data: {
      status: "complete",
      caption: "Sample panel: mean renewable and fossil shares by country (2023).",
      columns: "Country, Renewable share, Fossil share",
      rows: "",
      data_path: "",
    },
  },
  {
    key: "end_1",
    type: "end",
    label: "Generate Paper",
    x: 1460,
    y: 360,
    data: {
      status: "complete",
      notes: "Showcase: Supermemory recall demo — pre-seeded drafts and preferences.",
    },
  },
];

const EDGES = [
  ["start_1", "idea_1"],
  ["idea_1", "question_1"],
  ["question_1", "hypothesis_1"],
  ["hypothesis_1", "literature_1"],
  ["literature_1", "concept_1"],
  ["concept_1", "method_1"],
  ["method_1", "data_1"],
  ["data_1", "experiment_1"],
  ["experiment_1", "metric_1"],
  ["metric_1", "result_1"],
  ["result_1", "finding_1"],
  ["finding_1", "figure_1"],
  ["figure_1", "figure_2"],
  ["figure_2", "table_1"],
  ["table_1", "end_1"],
];

async function ensureAssets() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const renewPath = path.join(DATA_DIR, "renewable-electricity-share.csv");
  const fossilPath = path.join(DATA_DIR, "fossil-fuel-primary-energy.csv");
  const panelPath = path.join(DATA_DIR, "renewables_fossil_panel.csv");

  if (!fs.existsSync(renewPath)) {
    console.log("Downloading OWID renewable electricity share CSV…");
    await downloadOwidCsv("share-electricity-renewables", renewPath);
  }
  if (!fs.existsSync(fossilPath)) {
    console.log("Downloading OWID fossil fuel share CSV…");
    await downloadOwidCsv("fossil-fuels-share-energy", fossilPath);
  }

  const renewText = fs.readFileSync(renewPath, "utf8");
  const fossilText = fs.readFileSync(fossilPath, "utf8");
  const panel = sampleRenewablesPanel(renewText, fossilText);
  fs.writeFileSync(panelPath, panel, "utf8");

  writeRenewablesBarPng(path.join(DATA_DIR, "renewables_bar.png"));
  writeFossilShareHistogramPng(path.join(DATA_DIR, "fossil_share_histogram.png"));

  return {
    panelPath,
    panelName: "renewables_fossil_panel.csv",
    barChart: "renewables_bar.png",
    histChart: "fossil_share_histogram.png",
  };
}

function copyToWork(workId, srcFile, destName) {
  const src = path.isAbsolute(srcFile) ? srcFile : path.join(DATA_DIR, srcFile);
  const destDir = path.join(STORAGE_PATH, "works", workId);
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, destName);
  fs.copyFileSync(src, dest);
  const rel = `works/${workId}/${destName}`;
  return { path: rel, url: `/api/works/files?path=${encodeURIComponent(rel)}` };
}

async function seedDemoMemories(workId) {
  const memories = [
    {
      customId: `work_${workId}_intro_draft`,
      content: `Introduction draft (prior run): Energy transition analysis linking renewable electricity adoption to declining fossil dependence across OECD and emerging economies since 2000.`,
      metadata: { type: "writer", section: "Introduction" },
    },
    {
      customId: `work_${workId}_vlm_layout`,
      content: `VLM layout note: Use single-column width for bar charts comparing country renewable shares; avoid two-column figure placement for histograms.`,
      metadata: { type: "vlm_review", section: "Results" },
    },
    {
      customId: `work_${workId}_graph_summary`,
      content: `Graph summary: Hypothesis — higher renewable electricity share associates with lower fossil primary energy share. Key metric: Pearson r ≈ -0.55 on 2000–2023 panel.`,
      metadata: { type: "graph_summary" },
    },
    {
      customId: `work_${workId}_paper_1`,
      content: `Discovered paper: IEA World Energy Outlook 2024 — global renewable capacity growth and fossil phase-out scenarios.`,
      metadata: { type: "discovered_paper" },
    },
    {
      customId: `work_${workId}_paper_2`,
      content: `Discovered paper: IPCC AR6 WGIII — mitigation pathways emphasizing electricity sector decarbonization.`,
      metadata: { type: "discovered_paper" },
    },
    {
      customId: `work_${workId}_paper_3`,
      content: `Discovered paper: Bogdanov et al. (2019) — low-cost renewable electricity systems in 145 countries.`,
      metadata: { type: "discovered_paper" },
    },
    {
      customId: `user_${LOCAL_USER}_pref`,
      containerTag: `user_${LOCAL_USER}`,
      content: `User preference: Concise Methods section, Nature-style figure captions, emphasize policy implications in Discussion.`,
      metadata: { type: "user_preference" },
    },
  ];
  const n = await seedRecallMemories(workId, LOCAL_USER, memories);
  console.log(`Seeded ${n} Supermemory recall documents.`);
  if (n > 0) {
    const hits = await waitForSearchable(workId, "Introduction draft", { timeoutMs: 45_000 });
    console.log(`  Searchable hits after seed: ${hits.length}`);
  }
}

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  const [existing] = await sql`
    SELECT id FROM research_works WHERE title = ${TITLE} LIMIT 1
  `;
  if (existing && !force) {
    console.log(`Showcase work already exists (${existing.id}). Use --force to recreate.`);
    await sql.end();
    return;
  }
  if (existing && force) {
    await sql`DELETE FROM research_works WHERE id = ${existing.id}::uuid`;
    console.log("Removed existing showcase work.");
  }

  const assets = await ensureAssets();

  const [work] = await sql`
    INSERT INTO research_works (title, description, user_id, is_template)
    VALUES (
      ${TITLE},
      ${"Supermemory recall demo: renewable energy transition graph with pre-seeded memories."},
      ${LOCAL_USER}::uuid,
      false
    )
    RETURNING id
  `;
  const workId = work.id;

  for (const n of NODES) {
    await sql`
      INSERT INTO graph_nodes (work_id, node_key, type, label, position_x, position_y, data)
      VALUES (
        ${workId}::uuid, ${n.key}, ${n.type}, ${n.label},
        ${n.x}, ${n.y}, ${sql.json(n.data)}
      )
    `;
  }

  for (let i = 0; i < EDGES.length; i++) {
    const [source, target] = EDGES[i];
    await sql`
      INSERT INTO graph_edges (work_id, edge_key, source_node_key, target_node_key)
      VALUES (${workId}::uuid, ${`e${i + 1}`}, ${source}, ${target})
    `;
  }

  const panel = copyToWork(workId, assets.panelPath, assets.panelName);
  const bar = copyToWork(workId, assets.barChart, assets.barChart);
  const hist = copyToWork(workId, assets.histChart, assets.histChart);

  async function patchNode(key, patch) {
    const [row] = await sql`
      SELECT data FROM graph_nodes
      WHERE work_id = ${workId}::uuid AND node_key = ${key}
    `;
    if (!row) return;
    const data = { ...row.data, ...patch, status: "complete" };
    await sql`
      UPDATE graph_nodes SET data = ${sql.json(data)}
      WHERE work_id = ${workId}::uuid AND node_key = ${key}
    `;
  }

  await patchNode("data_1", {
    file_path: panel.path,
    file_path_url: panel.url,
  });
  await patchNode("table_1", {
    data_path: panel.path,
    data_path_url: panel.url,
  });
  await patchNode("figure_1", {
    figure_path: bar.path,
    figure_path_url: bar.url,
  });
  await patchNode("figure_2", {
    figure_path: hist.path,
    figure_path_url: hist.url,
  });

  const finalNodes = await sql`
    SELECT node_key, data FROM graph_nodes WHERE work_id = ${workId}::uuid
  `;
  await syncWorkReferences(
    sql,
    workId,
    finalNodes.map((r) => ({ data: r.data }))
  );
  await ingestGraphMemory(workId, TITLE, NODES.length, EDGES.length);
  await seedDemoMemories(workId);

  await sql.end();
  console.log(`Seeded renewables showcase: ${TITLE}`);
  console.log(`Work ID: ${workId}`);
  console.log(`Open: http://localhost:3000/research-graph/${workId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
