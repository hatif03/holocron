import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { LOCAL_USER_ID } from "@holocron/shared";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("search") || "";
    const db = getDb();
    const pattern = search ? `%${search}%` : null;
    const rows = pattern
      ? await db`
          SELECT r.*,
            (SELECT COUNT(*)::int FROM graph_nodes gn WHERE gn.data->>'reference_id' = r.id::text) AS linked_node_count
          FROM references_lib r
          WHERE r.user_id = ${LOCAL_USER_ID}::uuid
            AND (r.title ILIKE ${pattern} OR r.authors ILIKE ${pattern})
          ORDER BY r.created_at DESC
        `
      : await db`
          SELECT r.*,
            (SELECT COUNT(*)::int FROM graph_nodes gn WHERE gn.data->>'reference_id' = r.id::text) AS linked_node_count
          FROM references_lib r
          WHERE r.user_id = ${LOCAL_USER_ID}::uuid
          ORDER BY r.created_at DESC
        `;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();
    const [ref] = await db`
      INSERT INTO references_lib (
        user_id, title, authors, year, bibtex, s2_paper_id,
        pdf_storage_path, analysis, url, doi, notes, source
      )
      VALUES (
        ${LOCAL_USER_ID}::uuid, ${body.title}, ${body.authors || ""},
        ${body.year || null}, ${body.bibtex || ""}, ${body.s2_paper_id || null},
        ${body.pdf_storage_path || null},
        ${JSON.stringify(body.analysis || {})}::jsonb,
        ${body.url || ""}, ${body.doi || ""}, ${body.notes || ""},
        ${body.source || "manual"}
      )
      RETURNING *
    `;
    return NextResponse.json(ref);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
