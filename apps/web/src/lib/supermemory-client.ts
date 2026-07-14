/**
 * Supermemory Local client for Next.js API routes (see docs/SUPERMEMORY.md).
 */

import fs from "fs";
import {
  LOCAL_USER_ID,
  SUPERMEMORY_FILTER_PROMPT,
  userTag,
  workTag,
} from "@holocron/shared";

export { LOCAL_USER_ID, workTag, userTag };

const BASE_URL = process.env.SUPERMEMORY_API_URL ?? "http://localhost:6767";
const API_KEY = process.env.SUPERMEMORY_API_KEY ?? "";

let settingsConfigured = false;

export function isSupermemoryEnabled(): boolean {
  return Boolean(API_KEY.trim());
}

function authHeaders(contentType = "application/json"): HeadersInit {
  return {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": contentType,
  };
}

function logDev(message: string, detail?: unknown): void {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[supermemory] ${message}`, detail ?? "");
  }
}

async function checkResponse(resp: Response, context: string): Promise<boolean> {
  if (resp.ok) return true;
  logDev(`${context} failed: HTTP ${resp.status}`, await resp.text().catch(() => ""));
  return false;
}

export async function configureSettingsOnce(): Promise<void> {
  if (!isSupermemoryEnabled() || settingsConfigured) return;
  try {
    const resp = await fetch(`${BASE_URL}/v3/settings`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({
        shouldLLMFilter: true,
        filterPrompt: SUPERMEMORY_FILTER_PROMPT,
      }),
    });
    if (await checkResponse(resp, "configureSettingsOnce")) {
      settingsConfigured = true;
    }
  } catch (e) {
    logDev("configureSettingsOnce unreachable", e);
  }
}

export async function storeMemory(opts: {
  content: string;
  containerTag: string;
  customId?: string;
  metadata?: Record<string, string | number | boolean>;
}): Promise<void> {
  if (!isSupermemoryEnabled() || !opts.content.trim()) return;
  await configureSettingsOnce();
  try {
    const resp = await fetch(`${BASE_URL}/v3/documents`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        content: opts.content,
        containerTag: opts.containerTag,
        ...(opts.customId ? { customId: opts.customId } : {}),
        ...(opts.metadata ? { metadata: opts.metadata } : {}),
      }),
    });
    await checkResponse(resp, "storeMemory");
  } catch (e) {
    logDev("storeMemory unreachable", e);
  }
}

export async function storeUserPreference(userId: string, content: string): Promise<void> {
  await storeMemory({
    content,
    containerTag: userTag(userId),
    metadata: { type: "preference" },
  });
}

export async function searchMemories(
  workId: string,
  query: string,
  limit = 5
): Promise<string[]> {
  if (!isSupermemoryEnabled() || !query.trim()) return [];
  try {
    const resp = await fetch(`${BASE_URL}/v4/search`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        q: query,
        containerTag: workTag(workId),
        searchMode: "hybrid",
        limit,
        threshold: 0.6,
      }),
    });
    if (!(await checkResponse(resp, "searchMemories"))) return [];
    const data = (await resp.json()) as {
      results?: Array<{ memory?: string; chunk?: string }>;
    };
    return (data.results ?? [])
      .map((r) => r.memory ?? r.chunk ?? "")
      .filter(Boolean);
  } catch (e) {
    logDev("searchMemories unreachable", e);
    return [];
  }
}

export async function profileForWork(
  workId: string,
  query?: string
): Promise<string> {
  if (!isSupermemoryEnabled()) return "";
  try {
    const resp = await fetch(`${BASE_URL}/v4/profile`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        containerTag: workTag(workId),
        ...(query ? { q: query } : {}),
      }),
    });
    if (!(await checkResponse(resp, "profileForWork"))) return "";
    const data = (await resp.json()) as {
      profile?: { static?: string[]; dynamic?: string[] };
      searchResults?: { results?: Array<{ memory?: string; chunk?: string }> };
    };
    const parts: string[] = [];
    const profile = data.profile;
    if (profile?.static?.length) {
      parts.push("Static profile:\n" + profile.static.join("\n"));
    }
    if (profile?.dynamic?.length) {
      parts.push("Dynamic profile:\n" + profile.dynamic.join("\n"));
    }
    const memories = (data.searchResults?.results ?? [])
      .map((r) => r.memory ?? r.chunk ?? "")
      .filter(Boolean);
    if (memories.length) {
      parts.push("Relevant memories:\n" + memories.join("\n"));
    }
    return parts.join("\n\n");
  } catch (e) {
    logDev("profileForWork unreachable", e);
    return "";
  }
}

export function summarizeReferenceAnalysis(analysis: Record<string, unknown>): string {
  const title = String(analysis.title ?? analysis.paper_title ?? "Untitled");
  const claims = Array.isArray(analysis.key_claims)
    ? analysis.key_claims.slice(0, 5).join("; ")
    : String(analysis.summary ?? "").slice(0, 500);
  const methods = String(analysis.methods ?? analysis.methodology ?? "").slice(0, 300);
  return [`Title: ${title}`, claims ? `Claims: ${claims}` : "", methods ? `Methods: ${methods}` : ""]
    .filter(Boolean)
    .join("\n");
}

export function summarizeGraph(graph: {
  nodes?: Array<{ type?: string; label?: string; data?: Record<string, unknown> }>;
  edges?: Array<{ source?: string; target?: string }>;
}): string {
  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];
  const nodeLines = nodes
    .slice(0, 30)
    .map((n) => `- [${n.type ?? "node"}] ${n.label ?? "unnamed"}`);
  return `Research graph (${nodes.length} nodes, ${edges.length} edges):\n${nodeLines.join("\n")}`;
}

export async function ingestReferencePdf(
  filePath: string,
  workId: string,
  referenceId?: string
): Promise<void> {
  if (!isSupermemoryEnabled()) return;
  await configureSettingsOnce();
  try {
    if (!fs.existsSync(filePath)) return;

    const buffer = fs.readFileSync(filePath);
    const filename = filePath.split(/[/\\]/).pop() ?? "document.pdf";
    const formData = new FormData();
    formData.append("file", new Blob([buffer]), filename);
    formData.append("containerTag", workTag(workId));
    if (referenceId) {
      formData.append("customId", `ref_${referenceId}`);
      formData.append(
        "metadata",
        JSON.stringify({ type: "reference", referenceId, workId })
      );
    }

    const resp = await fetch(`${BASE_URL}/v3/documents/file`, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}` },
      body: formData,
    });
    await checkResponse(resp, "ingestReferencePdf");
  } catch (e) {
    logDev("ingestReferencePdf unreachable", e);
  }
}
