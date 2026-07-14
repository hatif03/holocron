#!/usr/bin/env node
/** Run full seed pipeline in correct order. Usage: node scripts/seed-all.mjs [--force] */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const force = process.argv.includes("--force");
const extra = force ? ["--force"] : [];

const steps = [
  "seed-references.mjs",
  "seed-template.mjs",
  "seed-works.mjs",
];

for (const script of steps) {
  console.log(`\n--- ${script} ---`);
  const r = spawnSync("node", [path.join(__dirname, script), ...extra], {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("\nSeed pipeline complete (generations opt-in: npm run seed:gens)");
