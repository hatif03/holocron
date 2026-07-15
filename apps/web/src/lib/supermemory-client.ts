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
import type { MemoryHit, MemoryProfile } from "./memory-types";

export type { MemoryHit, MemoryProfile };

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

export async function searchMemoriesRich(
  workId: string,
  query: string,
  limit = 5
): Promise<MemoryHit[]> {
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
    if (!(await checkResponse(resp, "searchMemoriesRich"))) return [];
    const data = (await resp.json()) as {
      results?: Array<{
        memory?: string;
        chunk?: string;
        score?: number;
        customId?: string;
        metadata?: Record<string, string | number | boolean>;
      }>;
    };
    return (data.results ?? [])
      .map((r) => ({
        text: r.memory ?? r.chunk ?? "",
        score: r.score,
        customId: r.customId,
        metadata: r.metadata,
        type: String(r.metadata?.type ?? ""),
      }))
      .filter((r) => r.text);
  } catch (e) {
    logDev("searchMemoriesRich unreachable", e);
    return [];
  }
}

export async function searchMemories(
  workId: string,
  query: string,
  limit = 5
): Promise<string[]> {
  const hits = await searchMemoriesRich(workId, query, limit);
  return hits.map((h) => h.text);
}

export async function profileForWorkRich(
  workId: string,
  query?: string
): Promise<{ profile: MemoryProfile; hits: MemoryHit[] }> {
  if (!isSupermemoryEnabled()) {
    return { profile: { static: [], dynamic: [] }, hits: [] };
  }
  try {
    const resp = await fetch(`${BASE_URL}/v4/profile`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        containerTag: workTag(workId),
        ...(query ? { q: query } : {}),
      }),
    });
    if (!(await checkResponse(resp, "profileForWorkRich"))) {
      return { profile: { static: [], dynamic: [] }, hits: [] };
    }
    const data = (await resp.json()) as {
      profile?: { static?: string[]; dynamic?: string[] };
      searchResults?: {
        results?: Array<{
          memory?: string;
          chunk?: string;
          score?: number;
          customId?: string;
          metadata?: Record<string, string | number | boolean>;
        }>;
      };
    };
    const profile = {
      static: data.profile?.static ?? [],
      dynamic: data.profile?.dynamic ?? [],
    };
    const hits = (data.searchResults?.results ?? [])
      .map((r) => ({
        text: r.memory ?? r.chunk ?? "",
        score: r.score,
        customId: r.customId,
        metadata: r.metadata,
        type: String(r.metadata?.type ?? ""),
      }))
      .filter((h) => h.text);
    return { profile, hits };
  } catch (e) {
    logDev("profileForWorkRich unreachable", e);
    return { profile: { static: [], dynamic: [] }, hits: [] };
  }
}

export async function profileForWork(
  workId: string,
  query?: string
): Promise<string> {
  const { profile, hits } = await profileForWorkRich(workId, query);
  const parts: string[] = [];
  if (profile.static.length) {
    parts.push("Static profile:\n" + profile.static.join("\n"));
  }
  if (profile.dynamic.length) {
    parts.push("Dynamic profile:\n" + profile.dynamic.join("\n"));
  }
  if (hits.length) {
    parts.push("Relevant memories:\n" + hits.map((h) => h.text).join("\n"));
  }
  return parts.join("\n\n");
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

const TEXT_EXCERPT_MAX = 8000;

function readTextExcerpt(filePath: string): string {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return raw.length > TEXT_EXCERPT_MAX
      ? raw.slice(0, TEXT_EXCERPT_MAX) + "\n…[truncated]"
      : raw;
  } catch {
    return "";
  }
}

export async function ingestWorkFile(
  filePath: string,
  workId: string,
  mimeOrExt?: string
): Promise<void> {
  if (!isSupermemoryEnabled() || !fs.existsSync(filePath)) return;

  const ext = (mimeOrExt || filePath.split(/[/\\]/).pop() || "")
    .toLowerCase()
    .replace(/^.*\./, ".");
  const normalizedExt = ext.startsWith(".") ? ext : `.${ext}`;

  if (normalizedExt === ".pdf") {
    await ingestReferencePdf(filePath, workId);
    return;
  }

  const textExts = new Set([
    ".csv",
    ".tsv",
    ".txt",
    ".json",
    ".md",
  ]);
  if (textExts.has(normalizedExt)) {
    const excerpt = readTextExcerpt(filePath);
    const name = filePath.split(/[/\\]/).pop() ?? "data";
    if (excerpt.trim()) {
      await storeMemory({
        content: `Uploaded data file (${name}):\n${excerpt}`,
        containerTag: workTag(workId),
        metadata: { type: "data_file", filename: name },
      });
    }
    return;
  }

  // Images and spreadsheets: path stored on disk only; no Supermemory file ingest
}
