import chalk from "chalk";
import fs from "fs";
import { getEnvPath } from "../paths.js";
import { envHasSupermemoryKey, checkSupermemoryOnline } from "../supermemory.js";

async function checkUrl(
  name: string,
  url: string
): Promise<{ ok: boolean; detail?: string }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    if (name === "Agents") {
      const data = await res.json();
      const agents = data.agents ?? [];
      const sm = data.supermemory ? `, supermemory: ${data.supermemory}` : "";
      return { ok: true, detail: `${agents.length} agents${sm}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, detail: "offline" };
  }
}

async function checkPostgres(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:3000/api/setup/status", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.database;
  } catch {
    return false;
  }
}

async function checkLatex(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:8081/health", {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function statusCommand() {
  console.log(chalk.bold("\nHolocron Status\n"));

  const services = [
    { name: "Web", url: "http://localhost:3000/health" },
    { name: "Agents", url: "http://localhost:8000/health" },
  ];

  for (const svc of services) {
    const result = await checkUrl(svc.name, svc.url);
    if (result.ok) {
      console.log(chalk.green("●"), svc.name, "— online");
      if (result.detail) console.log(chalk.dim(`  ${result.detail}`));
    } else {
      console.log(chalk.red("●"), svc.name, "—", result.detail || "offline");
    }
  }

  const pgOk = await checkPostgres();
  console.log(
    pgOk ? chalk.green("●") : chalk.red("●"),
    "Database (Postgres)",
    pgOk ? "— online" : "— offline"
  );

  const latexOk = await checkLatex();
  console.log(
    latexOk ? chalk.green("●") : chalk.red("●"),
    "LaTeX",
    latexOk ? "— online" : "— offline"
  );

  const envPath = getEnvPath();
  const keySet = fs.existsSync(envPath) && envHasSupermemoryKey(envPath);
  const smOnline = await checkSupermemoryOnline("http://localhost:6767");

  if (smOnline) {
    console.log(chalk.green("●"), "Supermemory", "— online");
  } else {
    console.log(chalk.red("●"), "Supermemory", "— offline");
  }

  if (fs.existsSync(envPath)) {
    console.log(
      chalk.dim("Supermemory API key:"),
      keySet ? chalk.green("configured") : chalk.yellow("not set")
    );
  }
  console.log("");
}
