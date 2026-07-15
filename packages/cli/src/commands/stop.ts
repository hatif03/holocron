import chalk from "chalk";
import { checkDocker, runDockerCompose } from "../docker.js";
import {
  getComposePath,
  getEnvPath,
  getRepoRoot,
  getDataDir,
  getPackageVersion,
  getMigrationsDir,
} from "../paths.js";
import path from "path";
import fs from "fs";

export async function stopCommand() {
  if (!checkDocker()) {
    console.log(chalk.yellow("Docker not running."));
    return;
  }

  let composeFile = getComposePath();
  if (!fs.existsSync(composeFile)) {
    composeFile = path.join(getRepoRoot(), "docker", "docker-compose.yml");
  }

  console.log(chalk.bold("\nStopping Holocron...\n"));
  runDockerCompose(
    composeFile,
    ["down"],
    getEnvPath(),
    getDataDir(),
    getPackageVersion(),
    getMigrationsDir()
  );
  console.log(chalk.green("Services stopped.\n"));
}
