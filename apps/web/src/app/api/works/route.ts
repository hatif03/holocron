import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { LOCAL_USER_ID } from "@holocron/shared";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const search = req.nextUrl.searchParams.get("search") || "";
    const rows = search
      ? await db`
          SELECT w.*,
            COALESCE(gn.node_count, 0) AS node_count,
            COALESCE(ge.edge_count, 0) AS edge_count,
            COALESCE(wr.ref_count, 0) AS ref_count
          FROM research_works w
          LEFT JOIN (
            SELECT work_id, COUNT(*)::int AS node_count FROM graph_nodes GROUP BY work_id
          ) gn ON gn.work_id = w.id
          LEFT JOIN (
            SELECT work_id, COUNT(*)::int AS edge_count FROM graph_edges GROUP BY work_id
          ) ge ON ge.work_id = w.id
          LEFT JOIN (
            SELECT work_id, COUNT(*)::int AS ref_count FROM work_references GROUP BY work_id
          ) wr ON wr.work_id = w.id
          WHERE w.title ILIKE ${"%" + search + "%"}
          ORDER BY w.updated_at DESC
        `
      : await db`
          SELECT w.*,
            COALESCE(gn.node_count, 0) AS node_count,
            COALESCE(ge.edge_count, 0) AS edge_count,
            COALESCE(wr.ref_count, 0) AS ref_count
          FROM research_works w
          LEFT JOIN (
            SELECT work_id, COUNT(*)::int AS node_count FROM graph_nodes GROUP BY work_id
          ) gn ON gn.work_id = w.id
          LEFT JOIN (
            SELECT work_id, COUNT(*)::int AS edge_count FROM graph_edges GROUP BY work_id
          ) ge ON ge.work_id = w.id
          LEFT JOIN (
            SELECT work_id, COUNT(*)::int AS ref_count FROM work_references GROUP BY work_id
          ) wr ON wr.work_id = w.id
          ORDER BY w.updated_at DESC
        `;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, description } = await req.json();
    const db = getDb();
    const [work] = await db`
      INSERT INTO research_works (user_id, title, description)
      VALUES (${LOCAL_USER_ID}::uuid, ${title}, ${description || ""})
      RETURNING *
    `;
    return NextResponse.json(work);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
