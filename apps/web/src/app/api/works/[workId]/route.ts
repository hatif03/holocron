import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { storeMemory, summarizeGraph, deleteWorkMemory } from "@/lib/supermemory-client";
import { buildWriteTrace } from "@/lib/memory-trace";
import { workTag } from "@holocron/shared";
import { deleteWorkArtifacts } from "@/lib/storage-cleanup";

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

      const refIds = new Set<string>();
      for (const node of graph.nodes || []) {
        const refId = node.data?.reference_id;
        if (refId && typeof refId === "string") refIds.add(refId);
      }
      await db`DELETE FROM work_references WHERE work_id = ${workId}::uuid`;
      for (const refId of refIds) {
        await db`
          INSERT INTO work_references (work_id, reference_id)
          VALUES (${workId}::uuid, ${refId}::uuid)
          ON CONFLICT DO NOTHING
        `;
      }

      await db`UPDATE research_works SET updated_at = NOW() WHERE id = ${workId}::uuid`;

      await storeMemory({
        content: summarizeGraph(graph),
        containerTag: workTag(workId),
        customId: `work_${workId}_graph`,
        metadata: { type: "graph", workId },
      });

      const memoryTrace = buildWriteTrace(workId, "graph", {
        customId: `work_${workId}_graph`,
      });
      return NextResponse.json({ ok: true, memoryTrace });
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

    const [running] = await db`
      SELECT COUNT(*)::int as count FROM paper_generations
      WHERE work_id = ${workId}::uuid
        AND status IN ('running', 'pending')
    `;
    if (running?.count > 0) {
      return NextResponse.json(
        { error: "Cannot delete work with running paper generations" },
        { status: 409 }
      );
    }

    const gens = await db`
      SELECT id FROM paper_generations WHERE work_id = ${workId}::uuid
    `;
    const genIds = gens.map((g) => String(g.id));

    await db`DELETE FROM research_works WHERE id = ${workId}::uuid`;

    deleteWorkArtifacts(workId, genIds);

    const sm = await deleteWorkMemory(workId);
    const memoryTrace = buildWriteTrace(workId, "delete", { count: sm.deleted ? 1 : 0 });

    return NextResponse.json({ ok: true, memoryTrace, supermemory: sm });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
