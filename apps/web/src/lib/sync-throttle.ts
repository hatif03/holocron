let lastSyncAt = 0;
const SYNC_INTERVAL_MS = 60_000;

export function shouldSyncGenerationsFromStorage(): boolean {
  const now = Date.now();
  if (now - lastSyncAt < SYNC_INTERVAL_MS) return false;
  lastSyncAt = now;
  return true;
}

export function markSyncGenerationsDone(): void {
  lastSyncAt = Date.now();
}
