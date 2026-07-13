import chalk from "chalk";
import { checkDocker, checkPort, printError, printSuccess } from "../docker.js";

export async function doctorCommand() {
  console.log(chalk.bold("\nHolocron Doctor\n"));

  const nodeOk = parseInt(process.version.slice(1)) >= 20;
  if (nodeOk) printSuccess(`Node.js ${process.version}`);
  else printError(`Node.js 20+ required (found ${process.version})`);

  const dockerOk = checkDocker();
  if (dockerOk) printSuccess("Docker is running");
  else
    printError(
      "Docker is not running — install Docker Desktop: https://docker.com/products/docker-desktop"
    );

  for (const port of [3000, 8000, 5432]) {
    const free = checkPort(port);
    if (free) printSuccess(`Port ${port} is available`);
    else printError(`Port ${port} is in use`);
  }

  console.log("");
}
