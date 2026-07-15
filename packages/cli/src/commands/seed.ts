import chalk from "chalk";
import ora from "ora";
import { printError, printInfo, printSuccess } from "../docker.js";

const WEB_SEED_URL = "http://localhost:3000/api/setup/seed-showcase";
const WEB_STATUS_URL = "http://localhost:3000/api/setup/status";

async function webReachable(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:3000/health", {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function seedCommand() {
  console.log(chalk.bold("\nHolocron Seed — OWID Showcase\n"));

  if (!(await webReachable())) {
    printError("Web UI is not running. Start Holocron first: holocron start");
    process.exit(1);
  }

  const spinner = ora("Loading OWID climate-health showcase work…").start();
  try {
    const res = await fetch(WEB_SEED_URL, {
      method: "POST",
      signal: AbortSignal.timeout(300_000),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      spinner.fail(data.error || "Seed failed");
      process.exit(1);
    }
    spinner.succeed(data.message || "Showcase loaded");
    if (data.workId) {
      printSuccess(`Research graph: http://localhost:3000/research-graph/${data.workId}`);
    }
  } catch (e) {
    spinner.fail(e instanceof Error ? e.message : "Seed request failed");
    process.exit(1);
  }

  try {
    const statusRes = await fetch(WEB_STATUS_URL, { signal: AbortSignal.timeout(5000) });
    if (statusRes.ok) {
      const status = await statusRes.json();
      if (status.hasDemoWorks) {
        printInfo("Demo works are available in the research graph list.");
      }
    }
  } catch {
    /* optional */
  }

  console.log("");
}
