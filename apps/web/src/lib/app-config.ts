import fs from "fs";
import path from "path";
import { getStoragePath } from "@/lib/storage-path";

export interface AppConfig {
  semanticScholarApiKey?: string;
  supermemoryApiKey?: string;
  onboardingComplete?: boolean;
  onboardingCompletedAt?: string;
}

export function getAppConfigPath(): string {
  return path.join(getStoragePath(), "app_config.json");
}

export function readAppConfig(): AppConfig {
  const p = getAppConfigPath();
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as AppConfig;
  } catch {
    return {};
  }
}

export function writeAppConfig(config: AppConfig): void {
  const p = getAppConfigPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(config, null, 2), "utf8");
}

export function maskKey(key: string): string {
  if (!key) return "";
  return "*".repeat(Math.max(0, key.length - 4)) + key.slice(-4);
}

function dirSizeBytes(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) total += dirSizeBytes(full);
    else total += fs.statSync(full).size;
  }
  return total;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function getStorageBreakdown() {
  const root = getStoragePath();
  return {
    storagePath: root,
    works: dirSizeBytes(path.join(root, "works")),
    generations: dirSizeBytes(path.join(root, "generations")),
    uploads: dirSizeBytes(path.join(root, "uploads")),
    total: dirSizeBytes(root),
  };
}
