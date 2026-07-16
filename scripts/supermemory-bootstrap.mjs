#!/usr/bin/env node
/**
 * Bootstrap Supermemory Local: capture API key, patch env, restart services, configure settings.
 */
import { execSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const FILTER_PROMPT =
  "This is Holocron, a research paper generation app. " +
  "containerTag is work_{workId} or user_{userId}. " +
  "We store research context, literature references, agent planner/writer/reviewer " +
  "outputs, and user preferences for academic writing.";

const API_KEY_PATTERN = /sm_[a-zA-Z0-9_]+/;

function sh(cmd) {
  return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"], shell: true }).trim();
}

function findSupermemoryContainer() {
  try {
    const out = sh('docker ps --filter "name=supermemory" --format "{{.Names}}"');
    const name = out.split("\n").map((l) => l.trim()).find(Boolean);
    if (name) return name;
  } catch {
    /* fall through */
  }
  try {
    return sh('docker ps --filter "publish=6767" --format "{{.Names}}"').split("\n")[0]?.trim() || null;
  } catch {
    return null;
  }
}

function appendKeyToEnv(envPath, apiKey) {
  const dir = path.dirname(envPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let lines = [];
  if (fs.existsSync(envPath)) {
    lines = fs.readFileSync(envPath, "utf-8").split("\n").filter((line) => {
      return (
        !line.startsWith("SUPERMEMORY_API_URL=") &&
        !line.startsWith("SUPERMEMORY_API_KEY=")
      );
    });
  }
  lines.push("SUPERMEMORY_API_URL=http://localhost:6767");
  lines.push(`SUPERMEMORY_API_KEY=${apiKey}`);
  fs.writeFileSync(envPath, lines.filter(Boolean).join("\n") + "\n");
}

async function waitForKey(containerName, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const logs = sh(`docker logs ${containerName}`);
      const match = logs.match(API_KEY_PATTERN);
      if (match?.[0]) return match[0];
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return null;
}

async function checkSupermemoryOnline(baseUrl, apiKey) {
  const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  for (const pathSuffix of ["/health", "/v4/openapi"]) {
    try {
      const res = await fetch(`${baseUrl}${pathSuffix}`, {
        headers,
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok || res.status < 500) return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

async function validateApiKey(baseUrl, apiKey) {
  if (!apiKey) return false;
  try {
    const res = await fetch(`${baseUrl}/v3/settings`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    return res.status !== 401 && res.status !== 403;
  } catch {
    return false;
  }
}

async function configureSettings(baseUrl, apiKey) {
  try {
    const res = await fetch(`${baseUrl}/v3/settings`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ shouldLLMFilter: true, filterPrompt: FILTER_PROMPT }),
      signal: AbortSignal.timeout(15000),
    });
    return res.ok || res.status < 300;
  } catch {
    return false;
  }
}

function restartComposeServices(composeFile, services) {
  if (!fs.existsSync(composeFile)) return;
  spawnSync("docker", ["compose", "-f", composeFile, "restart", ...services], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

function removeSupermemoryVolume(composeFile) {
  spawnSync("docker", ["compose", "-f", composeFile, "stop", "supermemory"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  spawnSync("docker", ["compose", "-f", composeFile, "rm", "-f", "supermemory"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  try {
    const volumes = sh('docker volume ls -q --filter name=supermemory_data');
    for (const vol of volumes.split("\n").map((v) => v.trim()).filter(Boolean)) {
      try {
        sh(`docker volume rm ${vol}`);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

function hasUnlockError(containerName) {
  try {
    const logs = sh(`docker logs ${containerName} 2>&1`);
    return logs.includes("Could not unlock local storage");
  } catch {
    return false;
  }
}

function isRestarting(containerName) {
  try {
    return sh(`docker inspect ${containerName} --format "{{.State.Status}}"`) === "restarting";
  } catch {
    return false;
  }
}

async function waitForContainerHealthy(containerName, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (hasUnlockError(containerName) || isRestarting(containerName)) return false;
    try {
      const health = sh(`docker inspect ${containerName} --format "{{.State.Health.Status}}"`);
      if (health === "healthy") return true;
      if (health === "unhealthy" && Date.now() - start > 30_000) return false;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  return false;
}

function resetSupermemoryVolumeIfNeeded(composeFile) {
  try {
    const status = sh(
      'docker ps -a --filter "name=supermemory" --format "{{.Names}} {{.Status}}"'
    );
    const containerName = status.split("\n")[0]?.split(" ")[0]?.trim();
    const needsReset =
      status.toLowerCase().includes("restarting") ||
      (containerName && hasUnlockError(containerName));
    if (!needsReset) return false;

    console.warn("Supermemory volume key mismatch detected — resetting supermemory data volume...");
    removeSupermemoryVolume(composeFile);
    spawnSync("docker", ["compose", "-f", composeFile, "up", "-d", "supermemory"], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Start supermemory alone and recover from encrypted-volume key mismatches before the full stack.
 * @param {string} composeFile
 * @param {{ build?: boolean }} opts
 */
export async function ensureSupermemoryHealthy(composeFile, opts = {}) {
  const build = opts.build ?? false;
  const upArgs = ["compose", "-f", composeFile, "up", "-d"];
  if (build) upArgs.push("--build");
  upArgs.push("supermemory");

  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`Starting Supermemory (attempt ${attempt}/3)...`);
    spawnSync("docker", upArgs, {
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    await new Promise((r) => setTimeout(r, 15_000));

    const containerName = findSupermemoryContainer();
    if (!containerName) {
      console.warn("Supermemory container not found after start");
      continue;
    }

    if (hasUnlockError(containerName) || isRestarting(containerName)) {
      console.warn("Supermemory storage unlock failed — resetting data volume...");
      removeSupermemoryVolume(composeFile);
      continue;
    }

    const healthy = await waitForContainerHealthy(containerName, 120_000);
    if (healthy) {
      console.log("Supermemory is healthy");
      return true;
    }

    console.warn("Supermemory did not become healthy — resetting data volume...");
    removeSupermemoryVolume(composeFile);
  }

  return false;
}

/**
 * @param {{ envPath?: string, composeFile?: string, restartServices?: string[] }} opts
 */
export async function bootstrapSupermemory(opts = {}) {
  const envPath = opts.envPath || path.join(repoRoot, ".env");
  const composeFile = opts.composeFile || path.join(repoRoot, "docker", "docker-compose.yml");
  const restartServices = opts.restartServices || ["agents", "web"];

  console.log("Bootstrapping Supermemory...");

  resetSupermemoryVolumeIfNeeded(composeFile);
  await new Promise((r) => setTimeout(r, 5000));

  let containerName = findSupermemoryContainer();
  if (!containerName) {
    console.warn("Supermemory container not found — skipping bootstrap");
    return false;
  }

  const existing = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf-8").match(/^SUPERMEMORY_API_KEY=(.+)$/m)?.[1]?.trim()
    : "";

  let apiKey = existing && existing.length > 0 ? existing : null;
  if (!apiKey) {
    console.log(`Waiting for API key in ${containerName} logs...`);
    apiKey = await waitForKey(containerName);
    if (!apiKey) {
      console.warn("Supermemory API key not found in logs");
      return false;
    }
    appendKeyToEnv(envPath, apiKey);
    console.log(`Wrote SUPERMEMORY_API_KEY to ${envPath}`);
  } else {
    console.log("Supermemory API key already in env");
  }

  const baseUrl = "http://localhost:6767";
  if (!(await validateApiKey(baseUrl, apiKey))) {
    console.warn("Stored Supermemory API key rejected — refreshing from container logs...");
    const fresh = await waitForKey(containerName);
    if (fresh) {
      apiKey = fresh;
      appendKeyToEnv(envPath, apiKey);
      console.log(`Refreshed SUPERMEMORY_API_KEY in ${envPath}`);
    }
  }

  const online = await checkSupermemoryOnline(baseUrl, apiKey);
  if (!online) {
    console.warn("Supermemory API not responding yet");
    return false;
  }

  if (await configureSettings(baseUrl, apiKey)) {
    console.log("Supermemory settings configured");
  } else {
    console.warn("Supermemory settings PATCH failed (non-fatal)");
  }

  console.log(`Restarting ${restartServices.join(", ")} to load Supermemory key...`);
  restartComposeServices(composeFile, restartServices);

  await new Promise((r) => setTimeout(r, 5000));
  return true;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  bootstrapSupermemory().then((ok) => process.exit(ok ? 0 : 1));
}
