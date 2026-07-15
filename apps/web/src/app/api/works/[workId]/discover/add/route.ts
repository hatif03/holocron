import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildWriteTrace } from "@/lib/memory-trace";
import { LOCAL_USER_ID } from "@holocron/shared";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workId: string }> }
) {
  try {
    const { workId } = await params;
    const body = await req.json();
    const db = getDb();

    const [work] = await db`SELECT id FROM research_works WHERE id = ${workId}::uuid`;
    if (!work) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const authors = Array.isArray(body.authors)
      ? body.authors.join(", ")
      : String(body.authors || "");

    const [ref] = await db`
      INSERT INTO references_lib (
        user_id, title, authors, year, bibtex, s2_paper_id,
        pdf_storage_path, analysis, url, doi, notes, source
      )
      VALUES (
        ${LOCAL_USER_ID}::uuid, ${body.title}, ${authors},
        ${body.year || null}, ${body.bibtex || ""}, ${body.s2_paper_id || body.id || null},
        ${body.pdf_storage_path || null},
        ${JSON.stringify(body.analysis || {})}::jsonb,
        ${body.url || ""}, ${body.doi || ""}, ${body.notes || ""},
        ${body.source || "discover"}
      )
      RETURNING *
    `;

    let nodeId: string | null = null;
    if (body.linkToGraph) {
      const [{ count }] = await db`
        SELECT COUNT(*)::int AS count FROM graph_nodes WHERE work_id = ${workId}::uuid
      `;
      nodeId = `lit_${Date.now()}`;
      const label = String(body.title).slice(0, 60);
      await db`
        INSERT INTO graph_nodes (work_id, node_key, type, label, position_x, position_y, data)
        VALUES (
          ${workId}::uuid, ${nodeId}, 'literature', ${label},
          ${120 + (count % 5) * 80}, ${80 + Math.floor(count / 5) * 100},
          ${JSON.stringify({
            nodeType: "literature",
            label,
            reference_id: ref.id,
            bibtex: body.bibtex || "",
          })}::jsonb
        )
      `;
      await db`
        INSERT INTO work_references (work_id, reference_id)
        VALUES (${workId}::uuid, ${ref.id}::uuid)
        ON CONFLICT DO NOTHING
      `;
      await db`UPDATE research_works SET updated_at = NOW() WHERE id = ${workId}::uuid`;
    }

    const memoryTrace = buildWriteTrace(workId, "discover_add_ref", { count: 1 });

    return NextResponse.json({ reference: ref, nodeId, memoryTrace });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
