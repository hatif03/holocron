import path from "path";
import { spawnSync } from "child_process";
import chalk from "chalk";

export function checkDocker(): boolean {
  try {
    const result = spawnSync("docker", ["info"], { stdio: "ignore", shell: process.platform === "win32" });
    return result.status === 0;
  } catch {
    return false;
  }
}

export function checkPort(port: number): boolean {
  try {
    if (process.platform === "win32") {
      const result = spawnSync("netstat", ["-ano"], {
        encoding: "utf-8",
        shell: true,
      });
      const output = result.stdout?.toString() || "";
      const inUse = output.split("\n").some((line) => {
        const trimmed = line.trim();
        return trimmed.includes(`:${port}`) && trimmed.includes("LISTENING");
      });
      return !inUse;
    }
    const result = spawnSync("lsof", ["-i", `:${port}`], { stdio: "ignore" });
    return result.status !== 0;
  } catch {
    return true;
  }
}

export function runDockerCompose(
  composeFile: string,
  args: string[],
  envFile?: string,
  dataDir?: string,
  imageTag?: string,
  migrationsDir?: string
): number {
  const cmd = ["compose", "-f", composeFile, ...args];
  const env = { ...process.env } as Record<string, string>;
  if (envFile) {
    env.HOLOCRON_ENV_FILE = path.isAbsolute(envFile) ? envFile : path.resolve(envFile);
  }
  if (dataDir) {
    env.HOLOCRON_DATA = path.isAbsolute(dataDir) ? dataDir : path.resolve(dataDir);
  }
  if (imageTag) {
    env.HOLOCRON_IMAGE_TAG = imageTag;
  }
  if (migrationsDir) {
    env.HOLOCRON_MIGRATIONS_DIR = path.isAbsolute(migrationsDir)
      ? migrationsDir
      : path.resolve(migrationsDir);
  }
  const result = spawnSync("docker", cmd, {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });
  return result.status ?? 1;
}

export function printSuccess(msg: string) {
  console.log(chalk.green("✓"), msg);
}

export function printError(msg: string) {
  console.log(chalk.red("✗"), msg);
}

export function printInfo(msg: string) {
  console.log(chalk.blue("→"), msg);
}
