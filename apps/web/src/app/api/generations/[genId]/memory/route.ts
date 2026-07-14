import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { searchMemories } from "@/lib/supermemory-client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ genId: string }> }
) {
  try {
    const { genId } = await params;
    const db = getDb();
    const [gen] = await db`
      SELECT work_id, title FROM paper_generations WHERE id = ${genId}::uuid
    `;
    if (!gen) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const q = req.nextUrl.searchParams.get("q") || String(gen.title || "plan");
    const results = await searchMemories(String(gen.work_id), q, 6);
    return NextResponse.json({
      workId: gen.work_id,
      query: q,
      results,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
