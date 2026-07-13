import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const LOCAL_USER = "00000000-0000-0000-0000-000000000001";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ refId: string }> }
) {
  try {
    const { refId } = await params;
    const db = getDb();
    const [ref] = await db`
      SELECT r.*,
        (SELECT COUNT(*)::int FROM graph_nodes gn WHERE gn.data->>'reference_id' = r.id::text) AS linked_node_count
      FROM references_lib r
      WHERE r.id = ${refId}::uuid AND r.user_id = ${LOCAL_USER}::uuid
    `;
    if (!ref) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(ref);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ refId: string }> }
) {
  try {
    const { refId } = await params;
    const body = await req.json();
    const db = getDb();
    const [ref] = await db`
      UPDATE references_lib SET
        title = COALESCE(${body.title}, title),
        authors = COALESCE(${body.authors}, authors),
        year = COALESCE(${body.year}, year),
        bibtex = COALESCE(${body.bibtex}, bibtex),
        url = COALESCE(${body.url}, url),
        doi = COALESCE(${body.doi}, doi),
        notes = COALESCE(${body.notes}, notes),
        source = COALESCE(${body.source}, source),
        analysis = COALESCE(${body.analysis ? JSON.stringify(body.analysis) : null}::jsonb, analysis),
        pdf_storage_path = COALESCE(${body.pdf_storage_path}, pdf_storage_path)
      WHERE id = ${refId}::uuid AND user_id = ${LOCAL_USER}::uuid
      RETURNING *
    `;
    if (!ref) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(ref);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ refId: string }> }
) {
  try {
    const { refId } = await params;
    const db = getDb();
    await db`DELETE FROM references_lib WHERE id = ${refId}::uuid AND user_id = ${LOCAL_USER}::uuid`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
