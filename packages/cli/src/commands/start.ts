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
import { setupCommand, setupNonInteractive } from "./setup.js";
import {
  envHasSupermemoryKey,
  bootstrapSupermemoryForCli,
  checkSupermemoryOnline,
  ensureSupermemoryHealthyForCli,
} from "../supermemory.js";
import { assertPrerequisitesOrExit } from "./doctor.js";
import { seedCommand } from "./seed.js";

const WEB_URL = "http://localhost:3000";
const AGENTS_HEALTH = "http://localhost:8000/health";
const WEB_HEALTH = "http://localhost:3000/health";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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

async function agentsSupermemoryOk(): Promise<boolean> {
  try {
    const res = await fetch(AGENTS_HEALTH, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return false;
    const data = await res.json();
    return data.supermemory === "ok";
  } catch {
    return false;
  }
}

export async function startCommand(opts?: { seed?: boolean }) {
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
    if (process.stdin.isTTY) {
      await setupCommand();
    } else {
      await setupNonInteractive();
    }
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

  spinner.text = "Starting Supermemory...";
  const smHealthy = await ensureSupermemoryHealthyForCli(
    composeFile,
    envPath,
    dataDir,
    imageTag,
    migrationsDir,
    runDockerCompose,
    { build: true }
  );
  if (!smHealthy) {
    spinner.fail("Supermemory failed to become healthy");
    process.exit(1);
  }

  spinner.text = "Starting services...";
  let code = runDockerCompose(
    composeFile,
    ["up", "-d", "--build"],
    envPath,
    dataDir,
    imageTag,
    migrationsDir
  );

  if (code !== 0) {
    spinner.text = "Waiting for Postgres first-time init...";
    await sleep(30_000);
    code = runDockerCompose(
      composeFile,
      ["up", "-d"],
      envPath,
      dataDir,
      imageTag,
      migrationsDir
    );
  }

  if (code !== 0) {
    spinner.fail("Failed to start services");
    process.exit(1);
  }

  spinner.text = "Bootstrapping Supermemory...";
  const smOk = await bootstrapSupermemoryForCli(
    envPath,
    composeFile,
    dataDir,
    imageTag,
    migrationsDir,
    runDockerCompose
  );
  if (smOk) {
    spinner.succeed("Supermemory configured");
  } else if (!envHasSupermemoryKey(envPath)) {
    spinner.warn("Supermemory key not captured — memory features disabled until key is set");
  } else {
    spinner.warn("Supermemory bootstrap incomplete — check docker logs");
  }

  spinner.start("Waiting for agents...");
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

  if (envHasSupermemoryKey(envPath)) {
    const smAgentsOk = await agentsSupermemoryOk();
    if (!smAgentsOk) {
      spinner.warn("Agents report supermemory not ok — try `holocron stop` and `holocron start` again");
    }
  }

  printSuccess("Docker is running");
  printSuccess("Agents online");
  if (await checkSupermemoryOnline()) {
    printSuccess("Supermemory online");
  }
  printSuccess(`Web ready at ${WEB_URL}`);

  openUrl(WEB_URL);
  printInfo("Opened browser");

  if (opts?.seed) {
    await seedCommand();
  }

  console.log(chalk.bold.green(`\nHolocron is running at ${WEB_URL}`));
  console.log(chalk.dim("Run `holocron stop` to tear down.\n"));
}
