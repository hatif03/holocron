import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ genId: string }> }
) {
  try {
    const { genId } = await params;
    const db = getDb();

    const events = await db`
      SELECT agent, event_type, message, metadata, created_at
      FROM generation_events
      WHERE generation_id = ${genId}::uuid
        AND agent = 'Supermemory'
      ORDER BY created_at ASC
    `;

    const recalls = events.map((ev) => {
      const meta = (ev.metadata || {}) as Record<string, unknown>;
      return {
        action: String(meta.action || "memory"),
        section: String(meta.section || ""),
        query: String(meta.query || ""),
        message: String(ev.message || ""),
        preview: String(meta.preview || ""),
        containerTag: String(meta.containerTag || ""),
        phase: String(meta.phase || ""),
        recalledCount: Number(meta.recalledCount || 0) || undefined,
        hits: Array.isArray(meta.hits) ? (meta.hits as string[]) : undefined,
        createdAt: ev.created_at,
      };
    });

    return NextResponse.json({ recalls, count: recalls.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
