import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { startGeneration } from "@/lib/agents-client";
import { buildGraphFromMetadata } from "@holocron/shared";
import { v4 as uuidv4 } from "uuid";

const LOCAL_USER = "00000000-0000-0000-0000-000000000001";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("search") || "";
    const db = getDb();
    const pattern = search ? `%${search}%` : null;
    const rows = pattern
      ? await db`
          SELECT pg.*, rw.title as work_title
          FROM paper_generations pg
          LEFT JOIN research_works rw ON rw.id = pg.work_id
          WHERE pg.title ILIKE ${pattern} OR rw.title ILIKE ${pattern}
          ORDER BY pg.created_at DESC
        `
      : await db`
          SELECT pg.*, rw.title as work_title
          FROM paper_generations pg
          LEFT JOIN research_works rw ON rw.id = pg.work_id
          ORDER BY pg.created_at DESC
        `;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const genId = uuidv4();
    const db = getDb();

    let workId = body.workId;
    let graph = body.graph;
    let title = body.title || "Research Paper";
    let source = "graph";

    if (body.mode === "metadata") {
      source = "metadata";
      const metadata = body.metadata;
      title = metadata.title || metadata.idea.slice(0, 80);

      const [work] = await db`
        INSERT INTO research_works (user_id, title, description)
        VALUES (${LOCAL_USER}::uuid, ${title}, ${metadata.idea.slice(0, 200)})
        RETURNING id
      `;
      workId = work.id;
      graph = buildGraphFromMetadata(metadata);
    }

    if (!workId) {
      return NextResponse.json({ error: "workId required" }, { status: 400 });
    }

    await db`
      INSERT INTO paper_generations (id, work_id, status, config, title, source, current_step)
      VALUES (
        ${genId}::uuid, ${workId}::uuid, 'running',
        ${JSON.stringify(body.config || {})}::jsonb,
        ${title}, ${source}, 'Planning: Creating paper plan'
      )
    `;

    startGeneration({
      generation_id: genId,
      work_id: workId,
      graph,
      config: body.config || {},
      title,
    }).catch(() => {});

    return NextResponse.json({ id: genId, status: "running" });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
