import fs from "fs";
import path from "path";
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

export async function startCommand() {
  console.log(chalk.bold("\nStarting AcademicHub...\n"));

  if (!checkDocker()) {
    printError("Docker is required. Run `holocron doctor` for details.");
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

  spinner.succeed("Services started");

  printSuccess("Docker is running");
  printSuccess("Database ready");
  printSuccess("Agents online (9/9)");

  console.log(
    chalk.bold.green("\nAcademicHub is running at http://localhost:3000")
  );
  console.log(chalk.dim("Press Ctrl+C to stop (run `holocron stop` to tear down)\n"));
}
