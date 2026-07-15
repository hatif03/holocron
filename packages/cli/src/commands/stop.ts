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

  const releaseCompose = getComposePath();
  const devCompose = path.join(getRepoRoot(), "docker", "docker-compose.yml");
  const envPath = getEnvPath();
  const dataDir = getDataDir();
  const imageTag = getPackageVersion();
  const migrationsDir = getMigrationsDir();

  console.log(chalk.bold("\nStopping Holocron...\n"));

  if (fs.existsSync(releaseCompose)) {
    runDockerCompose(releaseCompose, ["down"], envPath, dataDir, imageTag, migrationsDir);
  }

  if (fs.existsSync(devCompose)) {
    runDockerCompose(devCompose, ["down"], envPath, dataDir, imageTag, migrationsDir);
  }

  console.log(chalk.green("Services stopped.\n"));
}
