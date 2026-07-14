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
            (SELECT COUNT(*) FROM graph_nodes gn WHERE gn.work_id = w.id) as node_count,
            (SELECT COUNT(*) FROM graph_edges ge WHERE ge.work_id = w.id) as edge_count,
            (SELECT COUNT(*) FROM work_references wr WHERE wr.work_id = w.id) as ref_count
          FROM research_works w
          WHERE w.title ILIKE ${"%" + search + "%"}
          ORDER BY w.updated_at DESC
        `
      : await db`
          SELECT w.*,
            (SELECT COUNT(*) FROM graph_nodes gn WHERE gn.work_id = w.id) as node_count,
            (SELECT COUNT(*) FROM graph_edges ge WHERE ge.work_id = w.id) as edge_count,
            (SELECT COUNT(*) FROM work_references wr WHERE wr.work_id = w.id) as ref_count
          FROM research_works w
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
