#!/usr/bin/env node
/**
 * Seed sample references with analysis data for UI testing.
 * Usage: node scripts/seed-references.mjs [--force]
 */
import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

const LOCAL_USER = "00000000-0000-0000-0000-000000000001";
const force = process.argv.includes("--force");

const references = [
  {
    title: "Ranking scientists by their h-index",
    authors: "S. N. Georgeiev, J. F. Miranda, et al.",
    year: 2015,
    url: "https://example.org/paper1",
    source: "semantic_scholar",
    analysis: {
      summary: "Bibliometric study ranking researchers using h-index variants.",
      research_questions: ["How stable are h-index rankings across fields?"],
      methods: "Corpus analysis of publication metadata.",
      findings: "Rankings vary significantly by discipline.",
    },
  },
  {
    title: "Intersymbolic AI: Interlinking Symbolic AI and Subsymbolic AI",
    authors: "André Platzer",
    year: 2024,
    url: "https://arxiv.org/abs/2406.11563",
    doi: "10.1007/978-3-031-75387-9_11",
    source: "arxiv",
    analysis: {
      summary:
        "Perspective on integrating symbolic and subsymbolic AI approaches for robust intelligent systems.",
      research_questions: [
        "How can symbolic and subsymbolic AI be interlinked effectively?",
      ],
      methods: "Conceptual characterization and literature survey.",
      findings:
        "Hybrid intersymbolic architectures enable complementary strengths of both paradigms.",
    },
  },
  {
    title: "Governance of the AI, by the AI, and for the AI",
    authors: "Andrew W. Torrance, Bill Tomlinson",
    year: 2023,
    url: "https://arxiv.org/abs/2301.00001",
    source: "arxiv",
    analysis: {},
  },
];

async function seed() {
  const sql = postgres(DATABASE_URL);

  if (force) {
    await sql`DELETE FROM references_lib WHERE user_id = ${LOCAL_USER}::uuid`;
    console.log("Cleared existing references.");
  } else {
    const existing = await sql`
      SELECT COUNT(*)::int AS c FROM references_lib WHERE user_id = ${LOCAL_USER}::uuid
    `;
    if (existing[0].c >= references.length) {
      console.log("References already seeded. Use --force to re-seed.");
      await sql.end();
      return;
    }
  }

  for (const ref of references) {
    await sql`
      INSERT INTO references_lib (user_id, title, authors, year, url, doi, source, analysis)
      VALUES (
        ${LOCAL_USER}::uuid, ${ref.title}, ${ref.authors}, ${ref.year},
        ${ref.url || ""}, ${ref.doi || ""}, ${ref.source},
        ${JSON.stringify(ref.analysis)}::jsonb
      )
    `;
  }

  console.log(`Seeded ${references.length} references.`);
  await sql.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
