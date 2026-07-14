import { NextRequest, NextResponse } from "next/server";
import { profileForWorkRich, isSupermemoryEnabled } from "@/lib/supermemory-client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workId: string }> }
) {
  try {
    const { workId } = await params;
    const q = req.nextUrl.searchParams.get("q") ?? "";
    if (!isSupermemoryEnabled()) {
      return NextResponse.json({
        workId,
        enabled: false,
        profile: { static: [], dynamic: [] },
        hits: [],
      });
    }
    const { profile, hits } = await profileForWorkRich(workId, q || undefined);
    return NextResponse.json({
      workId,
      enabled: true,
      query: q,
      profile,
      hits,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
