#!/usr/bin/env node
/** Initialize local storage directory layout. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const storageRoot = path.resolve(
  process.env.STORAGE_PATH || path.join(repoRoot, "storage")
);

if (!storageRoot.startsWith(repoRoot)) {
  console.error("STORAGE_PATH must be inside the repository for local dev.");
  process.exit(1);
}

const dirs = [
  storageRoot,
  path.join(storageRoot, "works"),
  path.join(storageRoot, "generations"),
  path.join(storageRoot, "uploads"),
  path.join(storageRoot, ".meta"),
];

for (const d of dirs) {
  fs.mkdirSync(d, { recursive: true });
}

const manifest = {
  version: 1,
  initializedAt: new Date().toISOString(),
  storagePath: storageRoot,
};

fs.writeFileSync(
  path.join(storageRoot, ".meta", "storage_manifest.json"),
  JSON.stringify(manifest, null, 2)
);

console.log(`Storage initialized at ${storageRoot}`);
