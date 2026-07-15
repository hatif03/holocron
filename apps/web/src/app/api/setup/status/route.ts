import { NextResponse } from "next/server";
import postgres from "postgres";
import { fetchAgentsHealth, fetchLlmConfig } from "@/lib/agents-client";
import { readAppConfig } from "@/lib/app-config";
import { getStoragePath } from "@/lib/storage-path";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

const AGENTS_URL = process.env.AGENTS_SERVICE_URL || "http://localhost:8000";
const SUPERMEMORY_URL = (
  process.env.SUPERMEMORY_API_URL || "http://localhost:6767"
).replace(/\/$/, "");
const LATEX_URL = process.env.LATEX_SERVICE_URL || "http://localhost:8081";
const WEB_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function checkSupermemory() {
  const apiKey = process.env.SUPERMEMORY_API_KEY || "";
  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  for (const suffix of ["/health", "/v4/openapi"]) {
    try {
      const res = await fetch(`${SUPERMEMORY_URL}${suffix}`, {
        headers,
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok || res.status < 500) return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

async function checkLatex() {
  try {
    const res = await fetch(`${LATEX_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function parsePort(url: string, fallback: number): number {
  try {
    const u = new URL(url);
    if (u.port) return parseInt(u.port, 10);
    return u.protocol === "https:" ? 443 : fallback;
  } catch {
    return fallback;
  }
}

export async function GET() {
  let agents = false;
  let mockLlm = true;
  let supermemoryIntegration: string | undefined;
  try {
    const health = await fetchAgentsHealth();
    agents = true;
    supermemoryIntegration = health.supermemory;
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
    const [{ count }] =
      await sql`SELECT COUNT(*)::int AS count FROM research_works`;
    hasDemoWorks = count > 0;
    database = true;
    await sql.end();
  } catch {
    database = false;
  }

  const [supermemory, latex] = await Promise.all([
    checkSupermemory(),
    checkLatex(),
  ]);
  const appConfig = readAppConfig();
  const envSmKey = !!(process.env.SUPERMEMORY_API_KEY || "").trim();
  const configSmKey = !!(appConfig.supermemoryApiKey || "").trim();
  const supermemoryKeyConfigured = envSmKey || configSmKey;

  return NextResponse.json({
    web: true,
    agents,
    supermemory,
    latex,
    database,
    mockLlm,
    hasDemoWorks,
    supermemoryKeyConfigured,
    supermemoryIntegration,
    storagePath: getStoragePath(),
    onboardingComplete: !!appConfig.onboardingComplete,
    details: {
      web: { url: WEB_URL, port: parsePort(WEB_URL, 3000) },
      database: { url: DATABASE_URL.split("@").pop() || "localhost:5432", port: 5432 },
      agents: { url: AGENTS_URL, port: parsePort(AGENTS_URL, 8000) },
      supermemory: {
        url: SUPERMEMORY_URL,
        port: parsePort(SUPERMEMORY_URL, 6767),
        keyConfigured: supermemoryKeyConfigured,
      },
      latex: { url: LATEX_URL, port: parsePort(LATEX_URL, 8081) },
    },
  });
}
