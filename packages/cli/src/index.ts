#!/usr/bin/env node
import { readFileSync } from "fs";
import { join } from "path";
import { Command } from "commander";
import { doctorCommand, installGuideCommand } from "./commands/doctor.js";
import { setupCommand } from "./commands/setup.js";
import { startCommand } from "./commands/start.js";
import { stopCommand } from "./commands/stop.js";
import { statusCommand } from "./commands/status.js";

function readVersion(): string {
  try {
    const pkgPath = join(__dirname, "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
    return pkg.version || "1.0.0";
  } catch {
    return "1.0.0";
  }
}

const program = new Command();

program
  .name("holocron")
  .description("Holocron — AI-native research platform")
  .version(readVersion());

program
  .command("doctor")
  .description("Check prerequisites (Node, Docker, ports)")
  .action(doctorCommand);

program
  .command("install-guide")
  .description("Print step-by-step install guide for fresh systems")
  .action(installGuideCommand);

program
  .command("setup")
  .description("Interactive setup wizard for API keys and config")
  .action(setupCommand);

program
  .command("start")
  .description("Start full stack (web + agents + DB + LaTeX)")
  .action(startCommand);

program
  .command("stop")
  .description("Stop all services")
  .action(stopCommand);

program
  .command("status")
  .description("Show service health and agent status")
  .action(statusCommand);

program.parse();
