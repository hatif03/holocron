#!/usr/bin/env node
/**
 * One-command local start: Docker stack + storage init + optional seed.
 * Usage: npm run start:local
 */
import { execSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const composeFile = path.join(repoRoot, "docker", "docker-compose.yml");
const envFile = path.join(repoRoot, ".env");
const envExample = path.join(repoRoot, ".env.example");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: repoRoot, ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function checkDocker() {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    console.error("Docker is not running. Start Docker Desktop first.");
    return false;
  }
}

async function waitForUrl(url, label, timeoutMs = 180_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.error(`${label} did not become ready (${url})`);
  return false;
}

async function dbEmpty() {
  try {
    const postgres = (await import("postgres")).default;
    const url =
      process.env.DATABASE_URL ||
      "postgresql://holocron:holocron@localhost:5432/holocron";
    const sql = postgres(url);
    const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM research_works`;
    await sql.end();
    return count === 0;
  } catch {
    return false;
  }
}

function openBrowser(url) {
  const platform = process.platform;
  try {
    if (platform === "win32") execSync(`start "" "${url}"`, { stdio: "ignore", shell: true });
    else if (platform === "darwin") execSync(`open "${url}"`);
    else execSync(`xdg-open "${url}"`);
  } catch {
    console.log(`Open ${url} in your browser.`);
  }
}

async function main() {
  console.log("\nHolocron local start\n");

  if (!checkDocker()) process.exit(1);

  if (!fs.existsSync(envFile) && fs.existsSync(envExample)) {
    fs.copyFileSync(envExample, envFile);
    console.log("Created .env from .env.example");
  }

  run("node", ["scripts/storage-init.mjs"]);

  run("docker", ["compose", "-f", composeFile, "up", "-d", "--build"]);

  console.log("\nWaiting for services...");
  const ok =
    (await waitForUrl("http://localhost:3000/health", "Web")) &&
    (await waitForUrl("http://localhost:8000/health", "Agents"));

  if (!ok) process.exit(1);

  if (await dbEmpty()) {
    console.log("\nEmpty database — seeding demo data...");
    run("npm", ["run", "seed:all", "--", "--force"]);
  }

  console.log("\nHolocron is ready at http://localhost:3000?onboarding=1\n");
  openBrowser("http://localhost:3000?onboarding=1");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
