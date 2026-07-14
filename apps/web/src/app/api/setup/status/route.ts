import { NextResponse } from "next/server";
import postgres from "postgres";
import { fetchAgentsHealth, fetchLlmConfig } from "@/lib/agents-client";
import { readAppConfig } from "@/lib/app-config";
import { getStoragePath } from "@/lib/storage-path";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

async function checkSupermemory() {
  const url = process.env.SUPERMEMORY_API_URL || "http://localhost:6767";
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function checkLatex() {
  const url = process.env.LATEX_SERVICE_URL || "http://localhost:8081";
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  let agents = false;
  let mockLlm = true;
  try {
    await fetchAgentsHealth();
    agents = true;
    const llm = await fetchLlmConfig();
    mockLlm = !!llm.mock_llm;
  } catch {
    agents = false;
  }

  let database = false;
  let hasDemoWorks = false;
  try {
    const sql = postgres(DATABASE_URL, { max: 1 });
    await sql`SELECT 1`;
    const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM research_works`;
    hasDemoWorks = count > 0;
    database = true;
    await sql.end();
  } catch {
    database = false;
  }

  const [supermemory, latex] = await Promise.all([checkSupermemory(), checkLatex()]);
  const appConfig = readAppConfig();

  return NextResponse.json({
    agents,
    supermemory,
    latex,
    database,
    mockLlm,
    hasDemoWorks,
    storagePath: getStoragePath(),
    onboardingComplete: !!appConfig.onboardingComplete,
  });
}
