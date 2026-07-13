import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workId: string }> }
) {
  try {
    const { workId } = await params;
    const db = getDb();
    const [work] = await db`SELECT * FROM research_works WHERE id = ${workId}::uuid`;
    if (!work) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const nodes = await db`
      SELECT node_key as id, type, label, position_x, position_y, data
      FROM graph_nodes WHERE work_id = ${workId}::uuid
    `;
    const edges = await db`
      SELECT edge_key as id, source_node_key as source, target_node_key as target
      FROM graph_edges WHERE work_id = ${workId}::uuid
    `;

    return NextResponse.json({
      work,
      graph: {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          label: n.label,
          position: { x: Number(n.position_x), y: Number(n.position_y) },
          data: n.data,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
        })),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ workId: string }> }
) {
  try {
    const { workId } = await params;
    const { title, description, graph } = await req.json();
    const db = getDb();

    if (title || description) {
      await db`
        UPDATE research_works SET
          title = COALESCE(${title}, title),
          description = COALESCE(${description}, description),
          updated_at = NOW()
        WHERE id = ${workId}::uuid
      `;
    }

    if (graph) {
      await db`DELETE FROM graph_edges WHERE work_id = ${workId}::uuid`;
      await db`DELETE FROM graph_nodes WHERE work_id = ${workId}::uuid`;

      for (const node of graph.nodes || []) {
        await db`
          INSERT INTO graph_nodes (work_id, node_key, type, label, position_x, position_y, data)
          VALUES (
            ${workId}::uuid, ${node.id}, ${node.type}, ${node.label},
            ${node.position?.x ?? 0}, ${node.position?.y ?? 0},
            ${JSON.stringify(node.data || {})}::jsonb
          )
        `;
      }

      for (const edge of graph.edges || []) {
        await db`
          INSERT INTO graph_edges (work_id, edge_key, source_node_key, target_node_key)
          VALUES (${workId}::uuid, ${edge.id}, ${edge.source}, ${edge.target})
        `;
      }

      await db`UPDATE research_works SET updated_at = NOW() WHERE id = ${workId}::uuid`;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ workId: string }> }
) {
  try {
    const { workId } = await params;
    const db = getDb();
    await db`DELETE FROM research_works WHERE id = ${workId}::uuid`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
