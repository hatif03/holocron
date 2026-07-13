import chalk from "chalk";
import { checkDocker, runDockerCompose } from "../docker.js";
import { getComposePath, getEnvPath, getRepoRoot } from "../paths.js";
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

  console.log(chalk.bold("\nStopping AcademicHub...\n"));
  runDockerCompose(composeFile, ["down"], getEnvPath());
  console.log(chalk.green("Services stopped.\n"));
}
