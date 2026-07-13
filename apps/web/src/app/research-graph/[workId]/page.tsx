import { ResearchCanvas } from "@/components/research-graph/canvas";
import type { Node, Edge } from "@xyflow/react";

async function getWork(workId: string) {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/works/${workId}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function WorkCanvasPage({
  params,
}: {
  params: Promise<{ workId: string }>;
}) {
  const { workId } = await params;
  const data = await getWork(workId);

  if (!data) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Work not found. Ensure the database is running.
      </div>
    );
  }

  const nodes: Node[] = (data.graph?.nodes || []).map(
    (n: {
      id: string;
      type: string;
      label: string;
      position: { x: number; y: number };
      data: Record<string, unknown>;
    }) => ({
      id: n.id,
      type: "research",
      position: n.position,
      data: { label: n.label, nodeType: n.type, ...n.data },
    })
  );

  const edges: Edge[] = (data.graph?.edges || []).map(
    (e: { id: string; source: string; target: string }) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    })
  );

  return (
    <ResearchCanvas
      workId={workId}
      initialWork={{
        title: data.work.title,
        description: data.work.description,
        isTemplate: data.work.is_template,
      }}
      initialGraph={{ nodes, edges }}
    />
  );
}
