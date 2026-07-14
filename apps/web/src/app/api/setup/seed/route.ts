import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, "scripts", "seed-works.mjs"))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

function runSeed(cwd: string): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("npm", ["run", "seed:all", "--", "--force"], {
      cwd,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
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
  const { code, stdout, stderr } = await runSeed(cwd);

  if (code === 0) {
    return NextResponse.json({
      ok: true,
      message: "Demo research graphs loaded.",
      output: stdout.slice(-2000),
    });
  }

  return NextResponse.json(
    { ok: false, error: stderr || stdout || `Exit ${code}` },
    { status: 500 }
  );
}
