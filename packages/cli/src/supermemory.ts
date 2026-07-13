import fs from "fs";
import { execSync } from "child_process";
import { getEnvPath } from "./paths.js";

const API_KEY_PATTERN = /sm_[a-zA-Z0-9_]+/;

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
    const out = execSync(
      `docker ps --filter "name=${containerFilter}" --format "{{.Names}}"`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    const containerName = out.split("\n")[0];
    if (!containerName) return null;

    const logs = execSync(`docker logs ${containerName}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const match = logs.match(API_KEY_PATTERN);
    return match?.[0] ?? null;
  } catch {
    return null;
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
