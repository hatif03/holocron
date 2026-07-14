import { NextResponse } from "next/server";

export async function GET() {
  const hasS2 = Boolean(process.env.SEMANTIC_SCHOLAR_API_KEY?.trim());
  return NextResponse.json({
    semantic_scholar: hasS2,
    arxiv: true,
    google_scholar: true,
    default: "arxiv" as const,
  });
}
