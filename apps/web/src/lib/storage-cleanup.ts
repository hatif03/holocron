import fs from "fs";
import path from "path";
import { getStoragePath } from "@/lib/storage-path";

const TOMBSTONE_FILE = ".deleted-generations.json";

function tombstonePath(): string {
  return path.join(getStoragePath(), ".meta", TOMBSTONE_FILE);
}

export function readDeletedGenerationIds(): Set<string> {
  const p = tombstonePath();
  if (!fs.existsSync(p)) return new Set();
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf8")) as { ids?: string[] };
    return new Set(data.ids || []);
  } catch {
    return new Set();
  }
}

export function tombstoneGeneration(genId: string): void {
  const ids = readDeletedGenerationIds();
  ids.add(genId);
  const dir = path.dirname(tombstonePath());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    tombstonePath(),
    JSON.stringify({ ids: [...ids], updatedAt: new Date().toISOString() }, null, 2),
    "utf8"
  );
}

function rmDirSafe(dir: string): void {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

export function deleteGenerationArtifacts(genId: string): boolean {
  const root = getStoragePath();
  const genDir = path.join(root, "generations", genId);
  if (fs.existsSync(genDir)) {
    rmDirSafe(genDir);
    tombstoneGeneration(genId);
    return true;
  }
  tombstoneGeneration(genId);
  return false;
}

export function deleteWorkArtifacts(workId: string, generationIds: string[] = []): void {
  const root = getStoragePath();
  rmDirSafe(path.join(root, "works", workId));
  for (const genId of generationIds) {
    deleteGenerationArtifacts(genId);
  }
}
