import fs from "fs";
import path from "path";
import { exec } from "child_process";
import chalk from "chalk";
import ora from "ora";
import {
  checkDocker,
  printError,
  printSuccess,
  printInfo,
  runDockerCompose,
} from "../docker.js";
import {
  getEnvPath,
  getComposePath,
  getRepoRoot,
  getDataDir,
  getPackageVersion,
  getMigrationsDir,
} from "../paths.js";
import { setupCommand } from "./setup.js";
import { envHasSupermemoryKey, waitForSupermemoryKey } from "../supermemory.js";
import { assertPrerequisitesOrExit } from "./doctor.js";

const WEB_URL = "http://localhost:3000";
const AGENTS_HEALTH = "http://localhost:8000/health";
const WEB_HEALTH = "http://localhost:3000/health";

async function waitForUrl(url: string, label: string, timeoutMs = 180_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return true;
    } catch {
      /* still starting */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  printError(`${label} did not become ready in time (${url})`);
  return false;
}

function openBrowser(url: string) {
  const platform = process.platform;
  if (platform === "win32") {
    exec(`cmd /c start "" "${url}"`);
  } else if (platform === "darwin") {
    exec(`open "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}

function openUrl(url: string) {
  try {
    openBrowser(url);
  } catch {
    printInfo(`Open ${url} in your browser`);
  }
}

export async function startCommand() {
  console.log(chalk.bold("\nStarting Holocron...\n"));

  if (!assertPrerequisitesOrExit()) {
    console.log(chalk.dim("\nRun `holocron install-guide` for setup help.\n"));
    process.exit(1);
  }

  const envPath = getEnvPath();
  const dataDir = getDataDir();
  const imageTag = getPackageVersion();

  if (!fs.existsSync(envPath)) {
    printInfo("No config found — running setup first...");
    await setupCommand();
  }

  let composeFile = getComposePath();
  if (!fs.existsSync(composeFile)) {
    composeFile = path.join(getRepoRoot(), "docker", "docker-compose.yml");
  }

  if (!fs.existsSync(composeFile)) {
    printError("docker-compose file not found.");
    process.exit(1);
  }

  const migrationsDir = getMigrationsDir();
  if (!fs.existsSync(migrationsDir)) {
    printError("Database migrations not bundled in CLI package.");
    process.exit(1);
  }

  const spinner = ora("Pulling Docker images (first run may take several minutes)...").start();

  const pullCode = runDockerCompose(
    composeFile,
    ["pull"],
    envPath,
    dataDir,
    imageTag,
    migrationsDir
  );
  if (pullCode !== 0) {
    spinner.warn("Some images could not be pulled — will try build/up");
  }

  spinner.text = "Starting services...";
  const code = runDockerCompose(
    composeFile,
    ["up", "-d", "--build"],
    envPath,
    dataDir,
    imageTag,
    migrationsDir
  );

  if (code !== 0) {
    spinner.fail("Failed to start services");
    process.exit(1);
  }

  spinner.text = "Waiting for agents...";
  const agentsOk = await waitForUrl(AGENTS_HEALTH, "Agents");
  if (!agentsOk) {
    spinner.fail("Agents service did not start");
    process.exit(1);
  }

  spinner.text = "Waiting for web UI...";
  const webOk = await waitForUrl(WEB_HEALTH, "Web");
  if (!webOk) {
    spinner.fail("Web service did not start");
    process.exit(1);
  }

  spinner.succeed("Services started");

  if (!envHasSupermemoryKey(envPath)) {
    spinner.start("Capturing Supermemory API key...");
    const captured = await waitForSupermemoryKey(envPath);
    if (captured) {
      spinner.succeed("Supermemory API key saved to ~/.holocron/.env");
      spinner.start("Restarting agents to load Supermemory key...");
      runDockerCompose(composeFile, ["restart", "agents"], envPath, dataDir, imageTag, migrationsDir);
      await waitForUrl(AGENTS_HEALTH, "Agents", 60_000);
      spinner.succeed("Agents restarted with Supermemory key");
    } else {
      spinner.warn("Supermemory key not found — check docker logs for sm_* key");
    }
  }

  printSuccess("Docker is running");
  printSuccess("Agents online");
  printSuccess(`Web ready at ${WEB_URL}`);

  openUrl(WEB_URL);
  printInfo("Opened browser");

  console.log(chalk.bold.green(`\nHolocron is running at ${WEB_URL}`));
  console.log(chalk.dim("Run `holocron stop` to tear down.\n"));
}
