/**
 * Supermemory Local client for Next.js API routes (see docs/SUPERMEMORY.md).
 */

import fs from "fs";

const BASE_URL = process.env.SUPERMEMORY_API_URL ?? "http://localhost:6767";
const API_KEY = process.env.SUPERMEMORY_API_KEY ?? "";

export const LOCAL_USER_ID = "00000000-0000-0000-0000-000000000001";

export function isSupermemoryEnabled(): boolean {
  return Boolean(API_KEY.trim());
}

async function authHeaders(): Promise<HeadersInit> {
  return {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function storeMemory(opts: {
  content: string;
  containerTag: string;
  customId?: string;
  metadata?: Record<string, string | number | boolean>;
}): Promise<void> {
  if (!isSupermemoryEnabled() || !opts.content.trim()) return;
  try {
    await fetch(`${BASE_URL}/v3/documents`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        content: opts.content,
        containerTag: opts.containerTag,
        ...(opts.customId ? { customId: opts.customId } : {}),
        ...(opts.metadata ? { metadata: opts.metadata } : {}),
      }),
    });
  } catch {
    // Graceful degradation — never block Holocron CRUD
  }
}

export async function storeUserPreference(userId: string, content: string): Promise<void> {
  // Supermemory: add — persist user style/provider prefs (docs/SUPERMEMORY.md)
  await storeMemory({
    content,
    containerTag: `user_${userId}`,
    metadata: { type: "preference" },
  });
}

export async function ingestReferencePdf(
  filePath: string,
  workId: string,
  referenceId?: string
): Promise<void> {
  if (!isSupermemoryEnabled()) return;
  try {
    if (!fs.existsSync(filePath)) return;

    const buffer = fs.readFileSync(filePath);
    const filename = filePath.split(/[/\\]/).pop() ?? "document.pdf";
    const formData = new FormData();
    formData.append("file", new Blob([buffer]), filename);
    formData.append("containerTag", `work_${workId}`);
    if (referenceId) {
      formData.append(
        "metadata",
        JSON.stringify({ type: "reference", referenceId, workId })
      );
    }

    await fetch(`${BASE_URL}/v3/documents/file`, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}` },
      body: formData,
    });
  } catch {
    // Graceful degradation
  }
}
