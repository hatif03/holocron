import { NextRequest, NextResponse } from "next/server";
import { searchMemoriesRich } from "@/lib/supermemory-client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workId: string }> }
) {
  try {
    const { workId } = await params;
    const q = req.nextUrl.searchParams.get("q") ?? "";
    if (!q.trim()) {
      return NextResponse.json({ error: "Query parameter q is required" }, { status: 400 });
    }
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 5), 20);
    const hits = await searchMemoriesRich(workId, q, limit);
    return NextResponse.json({ workId, query: q, results: hits.map((h) => h.text), hits });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
