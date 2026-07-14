import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { LOCAL_USER_ID } from "@holocron/shared";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ workId: string }> }
) {
  try {
    const { workId } = await params;
    const db = getDb();

    const [source] = await db`
      SELECT * FROM research_works WHERE id = ${workId}::uuid
    `;
    if (!source) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [work] = await db`
      INSERT INTO research_works (user_id, title, description, is_template)
      VALUES (
        ${LOCAL_USER_ID}::uuid,
        ${source.title + " (copy)"},
        ${source.description || ""},
        false
      )
      RETURNING *
    `;

    const nodes = await db`
      SELECT node_key, type, label, position_x, position_y, data
      FROM graph_nodes WHERE work_id = ${workId}::uuid
    `;
    const edges = await db`
      SELECT edge_key, source_node_key, target_node_key
      FROM graph_edges WHERE work_id = ${workId}::uuid
    `;

    for (const node of nodes) {
      await db`
        INSERT INTO graph_nodes (work_id, node_key, type, label, position_x, position_y, data)
        VALUES (
          ${work.id}::uuid, ${node.node_key}, ${node.type}, ${node.label},
          ${node.position_x}, ${node.position_y},
          ${JSON.stringify(node.data || {})}::jsonb
        )
      `;
    }

    for (const edge of edges) {
      await db`
        INSERT INTO graph_edges (work_id, edge_key, source_node_key, target_node_key)
        VALUES (
          ${work.id}::uuid, ${edge.edge_key}, ${edge.source_node_key}, ${edge.target_node_key}
        )
      `;
    }

    return NextResponse.json(work);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
