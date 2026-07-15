#!/usr/bin/env node
/**
 * Stop all Holocron Docker stacks (release CLI + repo dev compose).
 */
import { execSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const devCompose = path.join(repoRoot, "docker", "docker-compose.yml");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...opts });
  return r.status ?? 1;
}

function tryExec(cmd) {
  try {
    execSync(cmd, { stdio: "inherit", shell: true });
    return true;
  } catch {
    return false;
  }
}

console.log("\nStopping all Holocron stacks...\n");

tryExec("holocron stop");

if (fs.existsSync(devCompose)) {
  console.log("→ docker compose down (dev stack)");
  run("docker", ["compose", "-f", devCompose, "down"]);
}

console.log("\nPort check:");
for (const port of [3000, 8000, 5432, 6767]) {
  try {
    if (process.platform === "win32") {
      const out = execSync("netstat -ano", { encoding: "utf-8", shell: true });
      const inUse = out.split("\n").some((l) => l.includes(`:${port}`) && l.includes("LISTENING"));
      console.log(`  ${port}: ${inUse ? "in use" : "free"}`);
    } else {
      const r = spawnSync("lsof", ["-i", `:${port}`], { stdio: "ignore" });
      console.log(`  ${port}: ${r.status === 0 ? "in use" : "free"}`);
    }
  } catch {
    console.log(`  ${port}: unknown`);
  }
}

console.log("\nDone.\n");
