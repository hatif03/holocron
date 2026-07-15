"use client";

import { useState } from "react";
import { Download, Terminal, Container, CheckCircle2 } from "lucide-react";

type Platform = "windows" | "macos" | "linux";

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "windows", label: "Windows" },
  { id: "macos", label: "macOS" },
  { id: "linux", label: "Linux" },
];

const PLATFORM_NOTES: Record<Platform, string[]> = {
  windows: [
    "Download Node.js 20 LTS from nodejs.org and run the installer.",
    "Install Docker Desktop and enable WSL 2 when prompted.",
    "Restart PowerShell or Terminal after installing Node.",
  ],
  macos: [
    "Download Node.js 20 LTS from nodejs.org (Apple Silicon or Intel).",
    "Install Docker Desktop for Mac and allow the privileged helper.",
    "Open Terminal and verify with node --version and docker --version.",
  ],
  linux: [
    "Install Node.js 20 via your package manager or nodejs.org.",
    "Install Docker Engine and the Compose plugin (see docs.docker.com).",
    "Add your user to the docker group: sudo usermod -aG docker $USER",
  ],
};

export default function InstallPage() {
  const [platform, setPlatform] = useState<Platform>("windows");

  return (
    <div className="px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">Install Holocron</h1>
        <p className="mt-3 text-muted-foreground">
          Holocron runs locally via Docker. You only need Node.js (for the CLI) and Docker Desktop
          — no Python, Postgres, or manual setup.
        </p>

        <div className="mt-8 flex gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                platform === p.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <ol className="mt-10 space-y-8">
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              1
            </span>
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                <Download className="h-4 w-4" /> Install Node.js 20 LTS
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Required to run the <code className="rounded bg-muted px-1">holocron</code> CLI via npx.
              </p>
              <a
                href="https://nodejs.org/en/download"
                className="mt-2 inline-block text-sm text-primary hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                nodejs.org/en/download →
              </a>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {PLATFORM_NOTES[platform].slice(0, 1).map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          </li>

          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              2
            </span>
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                <Container className="h-4 w-4" /> Install Docker
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Holocron ships Postgres, agents, web UI, LaTeX, and Supermemory in Docker images.
              </p>
              <a
                href={
                  platform === "linux"
                    ? "https://docs.docker.com/engine/install/"
                    : "https://www.docker.com/products/docker-desktop/"
                }
                className="mt-2 inline-block text-sm text-primary hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {platform === "linux" ? "Docker Engine install guide →" : "Docker Desktop →"}
              </a>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {PLATFORM_NOTES[platform].slice(1).map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          </li>

          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              3
            </span>
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                <Terminal className="h-4 w-4" /> Verify prerequisites
              </h2>
              <pre className="code-block mt-3">npx holocron-research@latest doctor</pre>
              <p className="mt-2 text-sm text-muted-foreground">
                All checks should pass before starting.
              </p>
            </div>
          </li>

          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              4
            </span>
            <div>
              <h2 className="font-semibold">Start Holocron</h2>
              <pre className="code-block mt-3">npx holocron-research@latest start</pre>
              <p className="mt-2 text-sm text-muted-foreground">
                First run runs the setup wizard, pulls ~2–4 GB of Docker images (5–10 min on slow
                connections), and opens http://localhost:3000.
              </p>
            </div>
          </li>
        </ol>

        <div className="mt-12 rounded-lg border bg-muted/50 p-6">
          <h3 className="font-semibold">Troubleshooting</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Docker not running — start Docker Desktop and wait for &quot;Docker is running&quot;.
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Port in use — free ports 3000, 8000, 5432, or 6767.
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Mock content only — add an LLM API key via setup or Settings.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
