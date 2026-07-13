import type { PaperSearchField, PaperSearchResult, PaperSearchSource } from "@holocron/shared";

const S2_FIELDS =
  "title,authors,year,abstract,openAccessPdf,paperId,externalIds";

export async function searchSemanticScholar(
  query: string,
  field: PaperSearchField = "all"
): Promise<{ data: PaperSearchResult[] }> {
  const key = process.env.SEMANTIC_SCHOLAR_API_KEY;
  const headers: Record<string, string> = {};
  if (key) headers["x-api-key"] = key;

  const searchQuery = field === "title" ? `title:${query}` : query;

  const res = await fetch(
    `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(searchQuery)}&limit=10&fields=${S2_FIELDS}`,
    { headers }
  );
  if (!res.ok) return { data: [] };
  const json = await res.json();

  const data: PaperSearchResult[] = (json.data || []).map(
    (p: {
      paperId: string;
      title: string;
      year?: number;
      authors?: { name: string }[];
      abstract?: string;
      openAccessPdf?: { url: string };
      externalIds?: { DOI?: string; ArXiv?: string };
    }) => ({
      id: p.paperId,
      title: p.title,
      year: p.year ?? null,
      authors: (p.authors || []).map((a) => a.name),
      abstract: p.abstract || "",
      url: p.openAccessPdf?.url || "",
      source: "semantic_scholar" as PaperSearchSource,
      doi: p.externalIds?.DOI || "",
    })
  );
  return { data };
}

export async function searchArxiv(
  query: string,
  field: PaperSearchField = "all"
): Promise<{ data: PaperSearchResult[] }> {
  const searchQuery =
    field === "title" ? `ti:${query}` : `all:${query}`;

  const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(searchQuery)}&start=0&max_results=10`;

  const res = await fetch(url);
  if (!res.ok) return { data: [] };
  const xml = await res.text();

  const entries = xml.split("<entry>").slice(1);
  const data: PaperSearchResult[] = entries.map((entry) => {
    const getTag = (tag: string) => {
      const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return m ? m[1].trim().replace(/\s+/g, " ") : "";
    };
    const id = getTag("id");
    const arxivId = id.split("/abs/").pop()?.split("v")[0] || id;
    const authors = [...entry.matchAll(/<name>([^<]+)<\/name>/g)].map(
      (m) => m[1]
    );
    const published = getTag("published");
    const year = published ? parseInt(published.slice(0, 4), 10) : null;

    return {
      id: arxivId,
      title: getTag("title"),
      authors,
      year,
      abstract: getTag("summary"),
      url: id.startsWith("http") ? id : `https://arxiv.org/abs/${arxivId}`,
      source: "arxiv" as PaperSearchSource,
      doi: "",
    };
  });

  return { data };
}

export async function analyzePaper(text: string, filePath?: string) {
  const AGENTS_URL =
    process.env.AGENTS_SERVICE_URL ||
    process.env.NEXT_PUBLIC_AGENTS_URL ||
    "http://localhost:8000";

  const res = await fetch(`${AGENTS_URL}/agents/paper-parser/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, file_path: filePath }),
  });
  return res.json();
}

export async function startGeneration(body: unknown) {
  const AGENTS_URL =
    process.env.AGENTS_SERVICE_URL ||
    process.env.NEXT_PUBLIC_AGENTS_URL ||
    "http://localhost:8000";

  const res = await fetch(`${AGENTS_URL}/agents/commander/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      detail || `Agents service failed to start generation (${res.status})`
    );
  }
  return res.json();
}

export async function getGenerationStatus(id: string) {
  const AGENTS_URL =
    process.env.AGENTS_SERVICE_URL ||
    process.env.NEXT_PUBLIC_AGENTS_URL ||
    "http://localhost:8000";

  const res = await fetch(`${AGENTS_URL}/agents/commander/status/${id}`);
  return res.json();
}

export function getAgentsUrl() {
  return (
    process.env.AGENTS_SERVICE_URL ||
    process.env.NEXT_PUBLIC_AGENTS_URL ||
    "http://localhost:8000"
  );
}

export async function fetchAgentsHealth() {
  const res = await fetch(`${getAgentsUrl()}/health`, {
    next: { revalidate: 10 },
  });
  if (!res.ok) throw new Error("Agents service unavailable");
  return res.json();
}
