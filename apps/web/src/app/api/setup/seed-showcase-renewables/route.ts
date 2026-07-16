import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, "scripts", "seed-showcase-renewables.mjs"))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

function runScript(cwd: string, script: string): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("node", [path.join("scripts", script)], {
      cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

export async function POST() {
  const cwd = findRepoRoot();
  const { code, stdout, stderr } = await runScript(cwd, "seed-showcase-renewables.mjs");

  if (code === 0) {
    const workIdMatch = stdout.match(/Work ID: ([a-f0-9-]+)/i);
    return NextResponse.json({
      ok: true,
      message: "Renewable energy showcase loaded with pre-seeded Supermemory recalls.",
      workId: workIdMatch?.[1] ?? null,
      output: stdout.slice(-2000),
    });
  }

  return NextResponse.json(
    { ok: false, error: stderr || stdout || `Exit ${code}` },
    { status: 500 }
  );
}
