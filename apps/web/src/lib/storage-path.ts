import fs from "fs";
import path from "path";

/**
 * Resolve STORAGE_PATH for local dev (apps/web cwd) and Docker (/data/storage).
 * Tries monorepo root storage/ when ./storage is missing.
 */
export function getStoragePath(): string {
  const envPath = process.env.STORAGE_PATH || "./storage";

  if (path.isAbsolute(envPath)) {
    return envPath;
  }

  const candidates = [
    path.resolve(process.cwd(), envPath),
    path.resolve(process.cwd(), "../../storage"),
    path.resolve(process.cwd(), "../storage"),
    path.resolve(process.cwd(), "storage"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.resolve(process.cwd(), envPath);
}
