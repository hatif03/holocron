import chalk from "chalk";
import fs from "fs";
import { getEnvPath } from "../paths.js";
import { envHasSupermemoryKey } from "../supermemory.js";

export async function statusCommand() {
  console.log(chalk.bold("\nHolocron Status\n"));

  const services = [
    { name: "Web", url: "http://localhost:3000/health" },
    { name: "Agents", url: "http://localhost:8000/health" },
    { name: "Supermemory", url: "http://localhost:6767" },
  ];

  for (const svc of services) {
    try {
      const res = await fetch(svc.url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        console.log(chalk.green("●"), svc.name, "— online");
        if (svc.name === "Agents") {
          const data = await res.json();
          const agents = data.agents ?? [];
          console.log(chalk.dim(`  ${agents.length} agents registered`));
          if (data.supermemory) {
            console.log(chalk.dim(`  supermemory: ${data.supermemory}`));
          }
        }
      } else {
        console.log(chalk.red("●"), svc.name, "— error", res.status);
      }
    } catch {
      console.log(chalk.red("●"), svc.name, "— offline");
    }
  }

  const envPath = getEnvPath();
  if (fs.existsSync(envPath)) {
    const keySet = envHasSupermemoryKey(envPath);
    console.log(
      chalk.dim("Supermemory API key:"),
      keySet ? chalk.green("configured") : chalk.yellow("not set")
    );
  }
  console.log("");
}
