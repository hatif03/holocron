#!/usr/bin/env node
import { Command } from "commander";
import { doctorCommand } from "./commands/doctor.js";
import { setupCommand } from "./commands/setup.js";
import { startCommand } from "./commands/start.js";
import { stopCommand } from "./commands/stop.js";
import { statusCommand } from "./commands/status.js";

const program = new Command();

program
  .name("holocron")
  .description("Holocron — AI-native research platform")
  .version("0.1.0");

program
  .command("doctor")
  .description("Check prerequisites (Node, Docker, ports)")
  .action(doctorCommand);

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
