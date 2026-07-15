/**
 * Client-side memory activity ring buffer + server helpers for API memoryTrace fields.
 */

import { workTag } from "@holocron/shared";

export type MemoryTraceAction = "read" | "write";

export interface MemoryTraceEntry {
  action: MemoryTraceAction;
  source: string;
  containerTag: string;
  customId?: string;
  query?: string;
  at: string;
  count?: number;
}

const MAX_ENTRIES = 50;
const buffer: MemoryTraceEntry[] = [];
const listeners = new Set<() => void>();

export function pushMemoryTrace(entry: Omit<MemoryTraceEntry, "at"> & { at?: string }): void {
  const full: MemoryTraceEntry = { ...entry, at: entry.at ?? new Date().toISOString() };
  buffer.unshift(full);
  if (buffer.length > MAX_ENTRIES) buffer.length = MAX_ENTRIES;
  listeners.forEach((fn) => fn());
}

export function getMemoryTraces(): MemoryTraceEntry[] {
  return [...buffer];
}

export function subscribeMemoryTraces(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function memoryTraceSummary(entries = buffer): {
  writeCount: number;
  readCount: number;
  lastAt: string | null;
} {
  const writeCount = entries.filter((e) => e.action === "write").length;
  const readCount = entries.filter((e) => e.action === "read").length;
  const lastAt = entries[0]?.at ?? null;
  return { writeCount, readCount, lastAt };
}

export function buildWriteTrace(
  workId: string,
  source: string,
  opts?: { customId?: string; count?: number }
): MemoryTraceEntry {
  return {
    action: "write",
    source,
    containerTag: workTag(workId),
    customId: opts?.customId,
    count: opts?.count,
    at: new Date().toISOString(),
  };
}

export function buildReadTrace(
  workId: string,
  source: string,
  opts?: { query?: string; count?: number }
): MemoryTraceEntry {
  return {
    action: "read",
    source,
    containerTag: workTag(workId),
    query: opts?.query,
    count: opts?.count,
    at: new Date().toISOString(),
  };
}
