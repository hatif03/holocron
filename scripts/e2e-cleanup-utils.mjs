/**
 * Shared helpers for E2E cleanup and Supermemory verification.
 */

const WEB = process.env.WEB_URL || "http://localhost:3000";
const SUPERMEMORY_URL = (process.env.SUPERMEMORY_API_URL || "http://localhost:6767").replace(
  /\/$/,
  ""
);
const SUPERMEMORY_KEY = process.env.SUPERMEMORY_API_KEY || "";

async function json(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    signal: AbortSignal.timeout(opts.timeout ?? 30_000),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) throw new Error(`${url} → ${res.status}: ${text.slice(0, 300)}`);
  return data;
}

export async function searchSupermemoryHits(workId) {
  if (!SUPERMEMORY_KEY.trim()) {
    const data = await json(
      `${WEB}/api/works/${workId}/memory/search?q=${encodeURIComponent("graph planner discover")}&limit=10`
    ).catch(() => ({ hits: [], results: [] }));
    return (data.hits || []).length || (data.results || []).length || 0;
  }
  const res = await fetch(`${SUPERMEMORY_URL}/v4/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPERMEMORY_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: "graph planner discover",
      containerTag: `work_${workId}`,
      searchMode: "hybrid",
      limit: 10,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return -1;
  const data = await res.json();
  return (data.results || []).length;
}

export async function deleteWorkViaApi(workId) {
  return json(`${WEB}/api/works/${workId}`, { method: "DELETE" });
}
