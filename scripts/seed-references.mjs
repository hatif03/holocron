#!/usr/bin/env node
/**
 * Seed references from arXiv API (real papers, no Semantic Scholar key required).
 * Usage: node scripts/seed-references.mjs [--force]
 */
import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

const LOCAL_USER = "00000000-0000-0000-0000-000000000001";
const force = process.argv.includes("--force");

const QUERIES = [
  "retrieval augmented generation scientific literature",
  "multi-agent large language model",
  "AI tools scientific research productivity",
  "bibliometric analysis research diversity",
];

function parseArxivEntry(entry) {
  const getTag = (tag) => {
    const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
    return m ? m[1].trim().replace(/\s+/g, " ") : "";
  };
  const id = getTag("id");
  const arxivId = id.split("/abs/").pop()?.split("v")[0] || id;
  const authors = [...entry.matchAll(/<name>([^<]+)<\/name>/g)].map((m) => m[1]);
  const published = getTag("published");
  const year = published ? parseInt(published.slice(0, 4), 10) : null;
  const title = getTag("title");
  const abstract = getTag("summary");
  const url = id.startsWith("http") ? id : `https://arxiv.org/abs/${arxivId}`;
  const firstAuthor = authors[0]?.split(" ").pop() || "unknown";
  const bibtex = `@article{${arxivId.replace(/\./g, "_")},
  title={${title}},
  author={${authors.join(" and ")}},
  year={${year || ""}},
  eprint={${arxivId}},
  archivePrefix={arXiv},
  primaryClass={cs.AI},
  url={${url}}
}`;
  return {
    title,
    authors: authors.join(", "),
    year,
    url,
    arxiv_id: arxivId,
    source: "arxiv",
    bibtex,
    analysis: {
      summary: abstract.slice(0, 400) + (abstract.length > 400 ? "..." : ""),
      research_questions: [
        `What are the main contributions of "${title.slice(0, 60)}..."?`,
      ],
      methods: abstract.includes("propose")
        ? "Proposed methodology described in abstract."
        : "See full paper for methodology.",
      findings: abstract.slice(0, 200),
    },
  };
}

async function fetchArxiv(query, max = 3) {
  const searchQuery = `all:${query}`;
  const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(searchQuery)}&start=0&max_results=${max}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const xml = await res.text();
  return xml
    .split("<entry>")
    .slice(1)
    .map(parseArxivEntry)
    .filter((p) => p.title);
}

async function seed() {
  const sql = postgres(DATABASE_URL);

  if (force) {
    await sql`DELETE FROM references_lib WHERE user_id = ${LOCAL_USER}::uuid`;
    console.log("Cleared existing references.");
  } else {
    const [{ count }] = await sql`
      SELECT COUNT(*)::int as count FROM references_lib WHERE user_id = ${LOCAL_USER}::uuid
    `;
    if (count > 0) {
      console.log(`Already have ${count} references. Use --force to replace.`);
      await sql.end();
      return;
    }
  }

  const seen = new Set();
  const papers = [];

  for (const q of QUERIES) {
    const batch = await fetchArxiv(q, 3);
    for (const p of batch) {
      if (!seen.has(p.arxiv_id)) {
        seen.add(p.arxiv_id);
        papers.push(p);
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`Fetched ${papers.length} unique arXiv papers.`);

  for (const ref of papers) {
    await sql`
      INSERT INTO references_lib (
        user_id, title, authors, year, url, source, bibtex, analysis
      ) VALUES (
        ${LOCAL_USER}::uuid,
        ${ref.title},
        ${ref.authors},
        ${ref.year},
        ${ref.url},
        ${ref.source},
        ${ref.bibtex},
        ${JSON.stringify(ref.analysis)}::jsonb
      )
    `;
  }

  console.log(`Seeded ${papers.length} references.`);
  await sql.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
