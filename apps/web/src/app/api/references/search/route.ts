import { NextRequest, NextResponse } from "next/server";
import { searchSemanticScholar, searchArxiv } from "@/lib/agents-client";
import type { PaperSearchField, PaperSearchSource } from "@holocron/shared";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  const source = (req.nextUrl.searchParams.get("source") ||
    "semantic_scholar") as PaperSearchSource;
  const field = (req.nextUrl.searchParams.get("field") || "all") as PaperSearchField;

  if (!query.trim()) return NextResponse.json({ data: [] });

  if (source === "arxiv") {
    return NextResponse.json(await searchArxiv(query, field));
  }
  return NextResponse.json(await searchSemanticScholar(query, field));
}
