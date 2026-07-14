import type { Node, Edge } from "@xyflow/react";

const GAP_X = 420;
const GAP_Y = 260;

/** Layered left-to-right layout from graph edges. */
export function spreadNodes(nodes: Node[], edges: Edge[]): Node[] {
  if (!nodes.length) return nodes;

  const ids = nodes.map((n) => n.id);
  const idSet = new Set(ids);
  const indeg: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  const adj: Record<string, string[]> = Object.fromEntries(ids.map((id) => [id, []]));

  for (const e of edges) {
    if (idSet.has(e.source) && idSet.has(e.target)) {
      adj[e.source].push(e.target);
      indeg[e.target] = (indeg[e.target] || 0) + 1;
    }
  }

  const layerOf: Record<string, number> = {};
  let queue = ids.filter((id) => indeg[id] === 0);
  let depth = 0;
  while (queue.length) {
    const next: string[] = [];
    for (const id of queue) {
      if (layerOf[id] != null) continue;
      layerOf[id] = depth;
      for (const t of adj[id]) {
        indeg[t]--;
        if (indeg[t] <= 0) next.push(t);
      }
    }
    queue = next;
    depth++;
  }
  for (const id of ids) {
    if (layerOf[id] == null) layerOf[id] = depth;
  }

  const byLayer: Record<number, Node[]> = {};
  for (const n of nodes) {
    const layer = layerOf[n.id] ?? 0;
    if (!byLayer[layer]) byLayer[layer] = [];
    byLayer[layer].push(n);
  }

  return nodes.map((n) => {
    const layer = layerOf[n.id] ?? 0;
    const layerNodes = byLayer[layer] || [n];
    const index = layerNodes.findIndex((ln) => ln.id === n.id);
    return {
      ...n,
      position: {
        x: 40 + layer * GAP_X,
        y: 80 + index * GAP_Y,
      },
    };
  });
}

/** True when more than 2 nodes share nearly the same position. */
export function nodesOverlap(nodes: Node[], threshold = 50): boolean {
  const positions = nodes.map((n) => n.position);
  for (let i = 0; i < positions.length; i++) {
    let close = 0;
    for (let j = 0; j < positions.length; j++) {
      if (i === j) continue;
      const dx = Math.abs(positions[i].x - positions[j].x);
      const dy = Math.abs(positions[i].y - positions[j].y);
      if (dx < threshold && dy < threshold) close++;
    }
    if (close >= 2) return true;
  }
  return false;
}
