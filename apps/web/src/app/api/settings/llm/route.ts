import { NextResponse } from "next/server";
import { fetchLlmConfig, updateLlmConfig } from "@/lib/agents-client";
import { LOCAL_USER_ID, storeUserPreference } from "@/lib/supermemory-client";

const FALLBACK_PROVIDERS = [
  "k2think",
  "groq",
  "openai",
  "anthropic",
  "google",
  "openrouter",
  "custom",
];

export async function GET() {
  try {
    const config = await fetchLlmConfig();
    return NextResponse.json(config);
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Agents unavailable",
        provider: "k2think",
        providers: FALLBACK_PROVIDERS,
        mock_llm: true,
        api_key_set: false,
        api_key_masked: "(unavailable)",
        base_url: "",
        model: "",
        defaults: {},
      },
      { status: 502 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const config = await updateLlmConfig(body);

    // Supermemory: add — persist user LLM/style preferences (docs/SUPERMEMORY.md)
    await storeUserPreference(
      LOCAL_USER_ID,
      `LLM provider: ${body.provider ?? config.provider}, model: ${body.model ?? config.model}`
    );

    return NextResponse.json(config);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save" },
      { status: 502 }
    );
  }
}
