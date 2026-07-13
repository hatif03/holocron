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
import { getEnvPath, getComposePath, getRepoRoot } from "../paths.js";
import { setupCommand } from "./setup.js";
import { envHasSupermemoryKey, waitForSupermemoryKey } from "../supermemory.js";

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

export async function startCommand() {
  console.log(chalk.bold("\nStarting Holocron...\n"));
  console.log(chalk.dim("Prerequisite: Docker Desktop only.\n"));

  if (!checkDocker()) {
    printError("Docker is required. Install Docker Desktop, then run `holocron doctor`.");
    process.exit(1);
  }

  const envPath = getEnvPath();
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

  const spinner = ora("Starting services...").start();

  const code = runDockerCompose(composeFile, ["up", "-d", "--build"], envPath);

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
    } else {
      spinner.warn("Supermemory key not found — check docker logs for sm_* key");
    }
  }

  printSuccess("Docker is running");
  printSuccess("Agents online");
  printSuccess(`Web ready at ${WEB_URL}`);

  openBrowser(WEB_URL);
  printInfo("Opened browser");

  console.log(chalk.bold.green(`\nHolocron is running at ${WEB_URL}`));
  console.log(chalk.dim("Run `holocron stop` to tear down.\n"));
}
