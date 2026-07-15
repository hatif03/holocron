import chalk from "chalk";
import { checkDocker, checkPort, printError, printSuccess, printInfo } from "../docker.js";
import {
  printInstallGuide,
  runPrerequisiteChecks,
} from "../prerequisites.js";

export async function doctorCommand() {
  console.log(chalk.bold("\nHolocron Doctor\n"));

  const report = runPrerequisiteChecks(checkDocker, checkPort);
  let allOk = true;

  if (report.nodeOk) {
    printSuccess(`Node.js ${report.nodeVersion}`);
  } else {
    printError(`Node.js 20+ required (found ${report.nodeVersion})`);
    printInfo(`Install: ${report.links.node}`);
    allOk = false;
  }

  if (!report.dockerInstalled) {
    printError("Docker is not installed");
    printInfo(`Install: ${report.links.docker}`);
    for (const note of report.links.platformNotes) {
      console.log(chalk.dim(`  • ${note}`));
    }
    allOk = false;
  } else if (!report.dockerRunning) {
    printError("Docker is installed but not running");
    printInfo("Start Docker Desktop and wait until it shows 'Docker is running'.");
    allOk = false;
  } else {
    printSuccess("Docker is running");
  }

  if (report.dockerInstalled) {
    if (report.composeOk) {
      printSuccess("Docker Compose available");
    } else {
      printError("Docker Compose not found — install Docker Desktop or Compose plugin");
      allOk = false;
    }
  }

  console.log("");
  for (const [port, free] of Object.entries(report.ports)) {
    if (free) printSuccess(`Port ${port} is available`);
    else {
      printError(`Port ${port} is in use`);
      allOk = false;
    }
  }

  console.log(
    chalk.dim(
      "\nTip: `npx holocron-research@latest start` runs setup (if needed), pulls images, and opens the browser."
    )
  );
  console.log(chalk.dim("New here? Run `holocron install-guide` for step-by-step setup.\n"));

  if (!allOk) {
    process.exitCode = 1;
  }
}

export async function installGuideCommand() {
  printInstallGuide();
}

export function assertPrerequisitesOrExit(): boolean {
  const report = runPrerequisiteChecks(checkDocker, checkPort);

  if (!report.nodeOk) {
    printError(`Node.js 20+ required (found ${report.nodeVersion})`);
    printInfo(`Install: ${report.links.node}`);
    printInfo("Then run: holocron doctor");
    return false;
  }

  if (!report.dockerInstalled) {
    printError("Docker is not installed");
    printInfo(`Install: ${report.links.docker}`);
    printInfo("Run `holocron install-guide` for the full checklist.");
    return false;
  }

  if (!report.dockerRunning) {
    printError("Docker is not running — start Docker Desktop first.");
    return false;
  }

  if (!report.composeOk) {
    printError("Docker Compose is required.");
    return false;
  }

  return true;
}
