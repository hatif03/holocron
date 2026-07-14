#!/usr/bin/env node
/**
 * Ad-hoc seed references from arXiv or Google Scholar (via agents).
 * Usage: node scripts/seed-from-search.mjs --query="RAG scientific" --source=arxiv [--limit=5]
 */
import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

const AGENTS_URL = process.env.AGENTS_SERVICE_URL || "http://localhost:8000";
const LOCAL_USER = "00000000-0000-0000-0000-000000000001";

function arg(name, fallback = "") {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
}

async function searchArxiv(query, limit) {
  const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(`all:${query}`)}&start=0&max_results=${limit}`;
  const res = await fetch(url);
  const xml = await res.text();
  return xml
    .split("<entry>")
    .slice(1)
    .map((entry) => {
      const getTag = (tag) => {
        const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
        return m ? m[1].trim().replace(/\s+/g, " ") : "";
      };
      const id = getTag("id");
      const arxivId = id.split("/abs/").pop()?.split("v")[0] || id;
      const authors = [...entry.matchAll(/<name>([^<]+)<\/name>/g)].map((m) => m[1]);
      return {
        title: getTag("title"),
        authors: authors.join(", "),
        year: parseInt(getTag("published").slice(0, 4), 10) || null,
        url: `https://arxiv.org/abs/${arxivId}`,
        source: "arxiv",
        bibtex: `@article{${arxivId.replace(/\./g, "_")}, title={${getTag("title")}}, year={${getTag("published").slice(0, 4)}}`,
      };
    });
}

async function searchScholar(query, limit) {
  const res = await fetch(
    `${AGENTS_URL}/agents/search/google-scholar?q=${encodeURIComponent(query)}&limit=${limit}`
  );
  const json = await res.json();
  return (json.data || []).map((p) => ({
    title: p.title,
    authors: (p.authors || []).join(", "),
    year: p.year,
    url: p.url,
    source: "google_scholar",
    bibtex: "",
  }));
}

async function main() {
  const query = arg("query");
  const source = arg("source", "arxiv");
  const limit = parseInt(arg("limit", "5"), 10);

  if (!query) {
    console.error("Usage: --query=... [--source=arxiv|google_scholar] [--limit=5]");
    process.exit(1);
  }

  const papers =
    source === "google_scholar"
      ? await searchScholar(query, limit)
      : await searchArxiv(query, limit);

  const sql = postgres(DATABASE_URL);
  for (const ref of papers) {
    await sql`
      INSERT INTO references_lib (user_id, title, authors, year, url, source, bibtex)
      VALUES (
        ${LOCAL_USER}::uuid,
        ${ref.title},
        ${ref.authors},
        ${ref.year},
        ${ref.url},
        ${ref.source},
        ${ref.bibtex}
      )
    `;
  }
  console.log(`Inserted ${papers.length} references from ${source}.`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
