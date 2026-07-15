#!/usr/bin/env node
/**
 * Seed OWID climate-health showcase work demonstrating all Holocron capabilities.
 * Usage: node scripts/seed-showcase-owid.mjs [--force]
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
  sampleOwidPanel,
  writeOwidEmissionsBarSvg,
  writeOwidLifeExpHistogramSvg,
} from "./seed-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OWID_DIR = path.join(ASSETS_DIR, "owid");
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";
const LOCAL_USER = "00000000-0000-0000-0000-000000000001";
const force = process.argv.includes("--force");

const TITLE =
  "Global CO₂ Emissions and Life Expectancy: A Cross-Country Analysis (1990–2023)";

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
      target_venue: "Nature Climate Change",
      deadline: "2026-12-01",
    },
  },
  {
    key: "idea_1",
    type: "idea",
    label: "Climate-Health Link",
    x: 260,
    y: 80,
    data: {
      status: "complete",
      body: "Rising per-capita CO₂ emissions may correlate with divergent population health trajectories across countries when socioeconomic confounders are accounted for.",
      source_note: "Our World in Data — cross-country panel 1990–2023.",
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
      body: "How strongly is per-capita CO₂ associated with national life expectancy after 1990, and does the relationship differ across income groups?",
      context: "Observational cross-country study using OWID harmonized indicators.",
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
      body: "Countries with higher recent CO₂ per capita exhibit lower life expectancy when controlling for decade-fixed effects in a pooled panel.",
      rationale: "Industrialization and air-quality pathways.",
    },
  },
  {
    key: "literature_1",
    type: "literature",
    label: "OWID Methodology",
    x: 260,
    y: 500,
    data: {
      status: "complete",
      user_notes: "Our World in Data CO₂ and life expectancy datasets with documented provenance.",
      bibtex:
        "@misc{owidco2, title={CO2 and Greenhouse Gas Emissions}, author={Our World in Data}, year={2024}, howpublished={\\url{https://ourworldindata.org/co2-and-greenhouse-gas-emissions}}}",
      file_path: "",
    },
  },
  {
    key: "concept_1",
    type: "concept",
    label: "Environmental Epidemiology",
    x: 500,
    y: 120,
    data: {
      status: "complete",
      definition:
        "Study of how environmental exposures—including greenhouse gas intensive development—relate to population health outcomes at scale.",
      related_terms: "life expectancy, air pollution, development",
    },
  },
  {
    key: "method_1",
    type: "method",
    label: "Panel Analysis",
    x: 500,
    y: 280,
    data: {
      status: "complete",
      description:
        "Merge OWID CO₂ per capita and life expectancy panels; compute Pearson correlation and decade-stratified means.",
      pseudo_code: `import pandas as pd\nimport numpy as np\nfrom scipy.stats import pearsonr\n\ndf = pd.read_csv("owid_climate_health_panel.csv")\ndf = df.dropna(subset=["co2_per_capita", "life_expectancy"])\nr, p = pearsonr(df["co2_per_capita"], df["life_expectancy"])\nprint(f"r={r:.3f}, p={p:.4f}")`,
      environment: "Python 3.12, pandas, scipy, matplotlib",
    },
  },
  {
    key: "data_1",
    type: "data",
    label: "OWID Panel CSV",
    x: 500,
    y: 440,
    data: {
      status: "complete",
      description: "Sampled 10-country panel: CO₂ per capita and life expectancy, 1990–2023.",
      file_path: "",
    },
  },
  {
    key: "experiment_1",
    type: "experiment",
    label: "Correlation Study",
    x: 740,
    y: 200,
    data: {
      status: "complete",
      name: "Cross-country correlation",
      environment: "Holocron agents + local LaTeX",
      user_notes: "Upload CSV, generate bar chart and histogram in paper pipeline.",
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
      target_value: "-0.35",
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
      value: "Negative correlation between CO₂ per capita and life expectancy across the sampled panel (r ≈ -0.4).",
      significance: "p < 0.01 for pooled 1990–2023 observations.",
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
      body: "High-emitting economies in the sample do not uniformly exhibit higher life expectancy; health outcomes cluster by region and income group.",
    },
  },
  {
    key: "figure_1",
    type: "figure",
    label: "Emissions Bar Chart",
    x: 980,
    y: 520,
    data: {
      status: "complete",
      caption: "Per-capita CO₂ emissions for selected countries (2023, tonnes).",
      figure_path: "",
      script_source: "# matplotlib bar chart generated at paper compile time from data_1 CSV",
    },
  },
  {
    key: "figure_2",
    type: "figure",
    label: "Life Exp Distribution",
    x: 980,
    y: 660,
    data: {
      status: "complete",
      caption: "Frequency distribution of national life expectancy (2023).",
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
      caption: "Sample panel: mean CO₂ and life expectancy by country (2023).",
      columns: "Country, CO2 per capita, Life expectancy",
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
      notes: "Showcase work: CSV upload, chart figures, tables, equations, code in generated paper.",
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

async function ensureOwidAssets() {
  fs.mkdirSync(OWID_DIR, { recursive: true });
  const co2Path = path.join(OWID_DIR, "co2-emissions-per-capita.csv");
  const lifePath = path.join(OWID_DIR, "life-expectancy.csv");
  const panelPath = path.join(OWID_DIR, "owid_climate_health_panel.csv");

  if (!fs.existsSync(co2Path)) {
    console.log("Downloading OWID CO₂ emissions CSV…");
    await downloadOwidCsv("co-emissions-per-capita", co2Path);
  }
  if (!fs.existsSync(lifePath)) {
    console.log("Downloading OWID life expectancy CSV…");
    await downloadOwidCsv("life-expectancy", lifePath);
  }

  const co2Text = fs.readFileSync(co2Path, "utf8");
  const lifeText = fs.readFileSync(lifePath, "utf8");
  const panel = sampleOwidPanel(co2Text, lifeText);
  fs.writeFileSync(panelPath, panel, "utf8");

  writeOwidEmissionsBarSvg(path.join(OWID_DIR, "owid_emissions_bar.svg"));
  writeOwidLifeExpHistogramSvg(path.join(OWID_DIR, "owid_life_exp_histogram.svg"));

  return {
    panelPath,
    panelName: "owid_climate_health_panel.csv",
    barChart: "owid_emissions_bar.svg",
    histChart: "owid_life_exp_histogram.svg",
  };
}

function copyToWork(workId, srcFile, destName) {
  const src = path.isAbsolute(srcFile) ? srcFile : path.join(OWID_DIR, srcFile);
  const destDir = path.join(STORAGE_PATH, "works", workId);
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, destName);
  fs.copyFileSync(src, dest);
  const rel = `works/${workId}/${destName}`;
  return { path: rel, url: `/api/works/files?path=${encodeURIComponent(rel)}` };
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

  const assets = await ensureOwidAssets();

  const [work] = await sql`
    INSERT INTO research_works (title, description, user_id, is_template)
    VALUES (
      ${TITLE},
      ${"Holocron capability showcase: OWID data uploads, charts, tables, equations, and code in paper generation."},
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

  await sql.end();
  console.log(`Seeded OWID showcase: ${TITLE}`);
  console.log(`Work ID: ${workId}`);
  console.log(`Open: http://localhost:3000/research-graph/${workId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
