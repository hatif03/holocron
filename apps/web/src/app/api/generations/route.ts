import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { startGeneration } from "@/lib/agents-client";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const db = getDb();
    const rows = await db`
      SELECT pg.*, rw.title as work_title
      FROM paper_generations pg
      JOIN research_works rw ON rw.id = pg.work_id
      ORDER BY pg.created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workId, config, graph, title } = await req.json();
    const genId = uuidv4();
    const db = getDb();

    await db`
      INSERT INTO paper_generations (id, work_id, status, config, title)
      VALUES (${genId}::uuid, ${workId}::uuid, 'running', ${JSON.stringify(config)}::jsonb, ${title || "Research Paper"})
    `;

    const agentResult = await startGeneration({
      generation_id: genId,
      work_id: workId,
      graph,
      config,
      title: title || "Research Paper",
    });

    return NextResponse.json({ id: genId, ...agentResult });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
