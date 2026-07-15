import { NextRequest, NextResponse } from "next/server";
import {
  isSupermemoryEnabled,
  searchMemoriesRich,
  workTag,
} from "@/lib/supermemory-client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workId: string }> }
) {
  try {
    const { workId } = await params;
    const enabled = isSupermemoryEnabled();
    const containerTag = workTag(workId);

    if (!enabled) {
      return NextResponse.json({
        enabled: false,
        containerTag,
        types: {},
        recent: [],
      });
    }

    const hits = await searchMemoriesRich(
      workId,
      "graph planner writer discover ask reference data_file discovered_paper",
      25
    );

    const types: Record<string, number> = {};
    for (const hit of hits) {
      const t = hit.type || String(hit.metadata?.type ?? "unknown");
      types[t] = (types[t] ?? 0) + 1;
    }

    const recent = hits.slice(0, 12).map((h) => ({
      type: h.type || String(h.metadata?.type ?? ""),
      text: h.text.slice(0, 120),
      customId: h.customId,
      score: h.score,
    }));

    return NextResponse.json({
      enabled: true,
      containerTag,
      types,
      recent,
      total: hits.length,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
