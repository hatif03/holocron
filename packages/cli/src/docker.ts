import { execSync, spawnSync } from "child_process";
import chalk from "chalk";

export function checkDocker(): boolean {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function checkPort(port: number): boolean {
  try {
    if (process.platform === "win32") {
      const result = execSync(`netstat -ano | findstr :${port}`, {
        encoding: "utf-8",
      });
      return result.trim().length === 0;
    }
    execSync(`lsof -i :${port}`, { stdio: "ignore" });
    return false;
  } catch {
    return true;
  }
}

export function runDockerCompose(
  composeFile: string,
  args: string[],
  envFile?: string
): number {
  const cmd = ["compose", "-f", composeFile, ...args];
  const env = { ...process.env };
  if (envFile) {
    env.HOLOCRON_ENV_FILE = envFile;
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
