import { NextRequest, NextResponse } from "next/server";
import { searchSemanticScholar, analyzePaper } from "@/lib/agents-client";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) return NextResponse.json({ data: [] });
  const result = await searchSemanticScholar(query);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const { text, file_path } = await req.json();
  const analysis = await analyzePaper(text, file_path);
  return NextResponse.json(analysis);
}
