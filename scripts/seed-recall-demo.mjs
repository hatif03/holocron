#!/usr/bin/env node
/** Seed Supermemory recall documents for both showcase works. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";
import { seedRecallMemories, waitForSearchable } from "./seed-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
  }
}

const LOCAL_USER = "00000000-0000-0000-0000-000000000001";
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

const RENEWABLES_MEMORIES = (workId) => [
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
    customId: `user_${LOCAL_USER}_pref`,
    containerTag: `user_${LOCAL_USER}`,
    content: `User preference: Concise Methods section, Nature-style figure captions, emphasize policy implications in Discussion.`,
    metadata: { type: "user_preference" },
  },
];

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });
  const works = await sql`
    SELECT id, title FROM research_works
    WHERE title ILIKE '%CO₂ Emissions and Life Expectancy%'
       OR title ILIKE '%Renewable Electricity Share%'
  `;
  for (const work of works) {
    const isRenewables = work.title.includes("Renewable");
    const memories = isRenewables
      ? RENEWABLES_MEMORIES(work.id)
      : [
          {
            customId: `work_${work.id}_methods_note`,
            content: `Prior Methods note: Panel correlation using OWID CO₂ per capita and life expectancy; use lstlisting for Python analysis code.`,
            metadata: { type: "writer", section: "Methods" },
          },
          {
            customId: `work_${work.id}_intro_draft`,
            content: `Introduction draft: Cross-country CO₂ and life expectancy association after 1990 with decade-fixed effects.`,
            metadata: { type: "writer", section: "Introduction" },
          },
        ];
    const n = await seedRecallMemories(work.id, LOCAL_USER, memories);
    console.log(`Seeded ${n} memories for ${work.title.slice(0, 60)}…`);
    if (n > 0) {
      const hits = await waitForSearchable(work.id, "Introduction draft", { timeoutMs: 45_000 });
      console.log(`  Searchable hits after seed: ${hits.length}`);
    }
  }
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
