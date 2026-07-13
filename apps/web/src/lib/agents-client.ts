const AGENTS_URL =
  process.env.AGENTS_SERVICE_URL ||
  process.env.NEXT_PUBLIC_AGENTS_URL ||
  "http://localhost:8000";

export function getAgentsUrl() {
  return AGENTS_URL;
}

export async function fetchAgentsHealth() {
  const res = await fetch(`${AGENTS_URL}/health`, {
    next: { revalidate: 10 },
  });
  if (!res.ok) throw new Error("Agents service unavailable");
  return res.json();
}

export async function startGeneration(body: unknown) {
  const res = await fetch(`${AGENTS_URL}/agents/commander/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function getGenerationStatus(id: string) {
  const res = await fetch(`${AGENTS_URL}/agents/commander/status/${id}`);
  return res.json();
}

export async function searchSemanticScholar(query: string) {
  const key = process.env.SEMANTIC_SCHOLAR_API_KEY;
  const headers: Record<string, string> = {};
  if (key) headers["x-api-key"] = key;

  const res = await fetch(
    `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=10&fields=title,authors,year,abstract,openAccessPdf,paperId`,
    { headers }
  );
  if (!res.ok) return { data: [] };
  return res.json();
}

export async function analyzePaper(text: string, filePath?: string) {
  const res = await fetch(`${AGENTS_URL}/agents/paper-parser/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, file_path: filePath }),
  });
  return res.json();
}
