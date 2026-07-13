import chalk from "chalk";

export async function statusCommand() {
  console.log(chalk.bold("\nHolocron Status\n"));

  const services = [
    { name: "Web", url: "http://localhost:3000/health" },
    { name: "Agents", url: "http://localhost:8000/health" },
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
        }
      } else {
        console.log(chalk.red("●"), svc.name, "— error", res.status);
      }
    } catch {
      console.log(chalk.red("●"), svc.name, "— offline");
    }
  }
  console.log("");
}
