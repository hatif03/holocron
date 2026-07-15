import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { getEnvPath } from "./paths.js";

const API_KEY_PATTERN = /sm_[a-zA-Z0-9_]+/;

const FILTER_PROMPT =
  "This is Holocron, a research paper generation app. " +
  "containerTag is work_{workId} or user_{userId}. " +
  "We store research context, literature references, agent planner/writer/reviewer " +
  "outputs, and user preferences for academic writing.";

export function envHasSupermemoryKey(envPath: string): boolean {
  if (!fs.existsSync(envPath)) return false;
  const content = fs.readFileSync(envPath, "utf-8");
  const match = content.match(/^SUPERMEMORY_API_KEY=(.+)$/m);
  return Boolean(match?.[1]?.trim());
}

export function appendSupermemoryKeyToEnv(envPath: string, apiKey: string): void {
  let lines: string[] = [];
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

export function captureSupermemoryApiKeyFromLogs(containerFilter = "supermemory"): string | null {
  try {
    const containerName = findSupermemoryContainer(containerFilter);
    if (!containerName) return null;

    const logs = execSync(`docker logs ${containerName}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      shell: process.platform === "win32",
    });
    const match = logs.match(API_KEY_PATTERN);
    return match?.[0] ?? null;
  } catch {
    return null;
  }
}

function findSupermemoryContainer(containerFilter = "supermemory"): string | null {
  try {
    const out = execSync(
      `docker ps --filter "name=${containerFilter}" --format "{{.Names}}"`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"], shell: process.platform === "win32" }
    ).trim();
    return out.split("\n").map((l) => l.trim()).find(Boolean) ?? null;
  } catch {
    return null;
  }
}

function hasUnlockError(containerName: string): boolean {
  try {
    const logs = execSync(`docker logs ${containerName} 2>&1`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      shell: process.platform === "win32",
    });
    return logs.includes("Could not unlock local storage");
  } catch {
    return false;
  }
}

function isRestarting(containerName: string): boolean {
  try {
    return (
      execSync(`docker inspect ${containerName} --format "{{.State.Status}}"`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        shell: process.platform === "win32",
      }).trim() === "restarting"
    );
  } catch {
    return false;
  }
}

async function waitForContainerHealthy(containerName: string, timeoutMs = 120_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (hasUnlockError(containerName) || isRestarting(containerName)) return false;
    try {
      const health = execSync(`docker inspect ${containerName} --format "{{.State.Health.Status}}"`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        shell: process.platform === "win32",
      }).trim();
      if (health === "healthy") return true;
      if (health === "unhealthy" && Date.now() - start > 30_000) return false;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  return false;
}

function removeSupermemoryData(
  composeFile: string,
  dataDir: string,
  runDockerCompose: (
    composeFile: string,
    args: string[],
    envFile?: string,
    dataDir?: string,
    imageTag?: string,
    migrationsDir?: string
  ) => number,
  envPath: string,
  imageTag: string,
  migrationsDir: string
): void {
  runDockerCompose(composeFile, ["stop", "supermemory"], envPath, dataDir, imageTag, migrationsDir);
  runDockerCompose(composeFile, ["rm", "-f", "supermemory"], envPath, dataDir, imageTag, migrationsDir);

  const bindMount = path.join(dataDir, "supermemory");
  if (fs.existsSync(bindMount)) {
    fs.rmSync(bindMount, { recursive: true, force: true });
  }

  try {
    const volumes = execSync('docker volume ls -q --filter name=supermemory_data', {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      shell: process.platform === "win32",
    }).trim();
    for (const vol of volumes.split("\n").map((v) => v.trim()).filter(Boolean)) {
      try {
        execSync(`docker volume rm ${vol}`, {
          stdio: "ignore",
          shell: process.platform === "win32",
        });
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

export async function ensureSupermemoryHealthyForCli(
  composeFile: string,
  envPath: string,
  dataDir: string,
  imageTag: string,
  migrationsDir: string,
  runDockerCompose: (
    composeFile: string,
    args: string[],
    envFile?: string,
    dataDir?: string,
    imageTag?: string,
    migrationsDir?: string
  ) => number,
  opts: { build?: boolean } = {}
): Promise<boolean> {
  const build = opts.build ?? false;
  const upArgs = ["up", "-d"];
  if (build) upArgs.push("--build");
  upArgs.push("supermemory");

  for (let attempt = 1; attempt <= 3; attempt++) {
    runDockerCompose(composeFile, upArgs, envPath, dataDir, imageTag, migrationsDir);
    await new Promise((r) => setTimeout(r, 15_000));

    const containerName = findSupermemoryContainer();
    if (!containerName) continue;

    if (hasUnlockError(containerName) || isRestarting(containerName)) {
      removeSupermemoryData(
        composeFile,
        dataDir,
        runDockerCompose,
        envPath,
        imageTag,
        migrationsDir
      );
      continue;
    }

    if (await waitForContainerHealthy(containerName, 120_000)) return true;

    removeSupermemoryData(
      composeFile,
      dataDir,
      runDockerCompose,
      envPath,
      imageTag,
      migrationsDir
    );
  }

  return false;
}

export async function checkSupermemoryOnline(
  baseUrl = "http://localhost:6767",
  apiKey?: string
): Promise<boolean> {
  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  for (const suffix of ["/health", "/v4/openapi"]) {
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}${suffix}`, {
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

export async function configureSupermemorySettings(
  apiKey: string,
  baseUrl = "http://localhost:6767"
): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v3/settings`, {
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

export async function waitForSupermemoryKey(
  envPath: string,
  timeoutMs = 120_000
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const key = captureSupermemoryApiKeyFromLogs();
    if (key) {
      appendSupermemoryKeyToEnv(envPath, key);
      return true;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return false;
}

export async function bootstrapSupermemoryForCli(
  envPath: string,
  composeFile: string,
  dataDir: string,
  imageTag: string,
  migrationsDir: string,
  runDockerCompose: (
    composeFile: string,
    args: string[],
    envFile?: string,
    dataDir?: string,
    imageTag?: string,
    migrationsDir?: string
  ) => number
): Promise<boolean> {
  const online = await checkSupermemoryOnline();
  if (!online) {
    await new Promise((r) => setTimeout(r, 5000));
  }

  if (!envHasSupermemoryKey(envPath)) {
    const captured = await waitForSupermemoryKey(envPath);
    if (!captured) return false;
  }

  const content = fs.readFileSync(envPath, "utf-8");
  const key = content.match(/^SUPERMEMORY_API_KEY=(.+)$/m)?.[1]?.trim();
  if (!key) return false;

  await configureSupermemorySettings(key);
  runDockerCompose(
    composeFile,
    ["restart", "agents", "web"],
    envPath,
    dataDir,
    imageTag,
    migrationsDir
  );
  await new Promise((r) => setTimeout(r, 5000));
  return true;
}
