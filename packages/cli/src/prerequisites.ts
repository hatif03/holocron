export type Platform = "win32" | "darwin" | "linux" | "other";

export interface PrerequisiteLinks {
  node: string;
  docker: string;
  dockerDocs: string;
  platformNotes: string[];
}

const NODE_URL = "https://nodejs.org/en/download";
const DOCKER_DESKTOP = "https://www.docker.com/products/docker-desktop/";
const DOCKER_LINUX = "https://docs.docker.com/engine/install/";

export function getPlatform(): Platform {
  const p = process.platform;
  if (p === "win32" || p === "darwin" || p === "linux") return p;
  return "other";
}

export function getPrerequisiteLinks(): PrerequisiteLinks {
  const platform = getPlatform();
  const notes: string[] = [];

  if (platform === "win32") {
    notes.push("Enable WSL 2 when Docker Desktop prompts during install.");
    notes.push("Restart your terminal after installing Node.js.");
  } else if (platform === "darwin") {
    notes.push("Allow the privileged helper when Docker Desktop asks.");
    notes.push("Apple Silicon and Intel Mac builds are both supported.");
  } else if (platform === "linux") {
    notes.push("Install Docker Engine and the Compose plugin (see Docker docs).");
    notes.push("Add your user to the docker group: sudo usermod -aG docker $USER");
  }

  return {
    node: NODE_URL,
    docker: platform === "linux" ? DOCKER_LINUX : DOCKER_DESKTOP,
    dockerDocs: DOCKER_LINUX,
    platformNotes: notes,
  };
}

export function checkNodeVersion(): { ok: boolean; version: string; message?: string } {
  const version = process.version;
  const major = parseInt(version.slice(1), 10);
  if (major >= 20) {
    return { ok: true, version };
  }
  return {
    ok: false,
    version,
    message: `Node.js 20+ required (found ${version}). Install from ${NODE_URL}`,
  };
}

export function checkDockerInstalled(): boolean {
  try {
    const { execSync } = require("child_process") as typeof import("child_process");
    execSync("docker --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function checkDockerCompose(): boolean {
  try {
    const { execSync } = require("child_process") as typeof import("child_process");
    execSync("docker compose version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export interface PrerequisiteReport {
  nodeOk: boolean;
  dockerInstalled: boolean;
  dockerRunning: boolean;
  composeOk: boolean;
  ports: Record<number, boolean>;
  links: PrerequisiteLinks;
  nodeVersion: string;
}

export function runPrerequisiteChecks(
  checkDockerRunning: () => boolean,
  checkPort: (port: number) => boolean
): PrerequisiteReport {
  const node = checkNodeVersion();
  const dockerInstalled = checkDockerInstalled();
  const dockerRunning = dockerInstalled && checkDockerRunning();
  const composeOk = dockerInstalled && checkDockerCompose();
  const ports: Record<number, boolean> = {};
  for (const port of [3000, 8000, 5432, 6767]) {
    ports[port] = checkPort(port);
  }
  return {
    nodeOk: node.ok,
    dockerInstalled,
    dockerRunning,
    composeOk,
    ports,
    links: getPrerequisiteLinks(),
    nodeVersion: node.version,
  };
}

export function printInstallGuide(): void {
  const links = getPrerequisiteLinks();
  const platform = getPlatform();
  const platformLabel =
    platform === "win32" ? "Windows" : platform === "darwin" ? "macOS" : "Linux";

  console.log("\nHolocron Install Guide\n");
  console.log(`Platform: ${platformLabel}\n`);
  console.log("Holocron needs two one-time installs on your computer:\n");
  console.log("  1. Node.js 20 LTS — runs the holocron CLI");
  console.log(`     ${links.node}\n`);
  console.log("  2. Docker Desktop — runs Postgres, agents, web UI, and Supermemory");
  console.log(`     ${links.docker}\n`);
  for (const note of links.platformNotes) {
    console.log(`  • ${note}`);
  }
  console.log("\nAfter both are installed:\n");
  console.log("  npx holocron-research@latest doctor   # verify prerequisites");
  console.log("  npx holocron-research@latest start    # setup wizard + pull images + open browser\n");
  console.log("First start downloads ~2–4 GB of Docker images (5–10 min on slow connections).\n");
}
