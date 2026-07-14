import { NextResponse } from "next/server";
import { maskKey, readAppConfig, writeAppConfig } from "@/lib/app-config";

export async function GET() {
  const config = readAppConfig();
  return NextResponse.json({
    semanticScholarApiKeySet: !!config.semanticScholarApiKey,
    semanticScholarApiKeyMasked: maskKey(config.semanticScholarApiKey || ""),
    supermemoryApiKeySet: !!config.supermemoryApiKey,
    supermemoryApiKeyMasked: maskKey(config.supermemoryApiKey || ""),
    onboardingComplete: !!config.onboardingComplete,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const existing = readAppConfig();
  const next = { ...existing };

  if (body.semanticScholarApiKey !== undefined) {
    if (body.semanticScholarApiKey) next.semanticScholarApiKey = body.semanticScholarApiKey;
  }
  if (body.supermemoryApiKey !== undefined) {
    if (body.supermemoryApiKey) next.supermemoryApiKey = body.supermemoryApiKey;
  }
  if (body.onboardingComplete === true) {
    next.onboardingComplete = true;
    next.onboardingCompletedAt = new Date().toISOString();
  }
  if (body.onboardingComplete === false) {
    next.onboardingComplete = false;
    delete next.onboardingCompletedAt;
  }

  writeAppConfig(next);
  return NextResponse.json({
    semanticScholarApiKeySet: !!next.semanticScholarApiKey,
    semanticScholarApiKeyMasked: maskKey(next.semanticScholarApiKey || ""),
    supermemoryApiKeySet: !!next.supermemoryApiKey,
    supermemoryApiKeyMasked: maskKey(next.supermemoryApiKey || ""),
    onboardingComplete: !!next.onboardingComplete,
  });
}
