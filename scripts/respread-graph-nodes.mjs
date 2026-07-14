#!/usr/bin/env node
/** Re-space graph nodes using topological layered layout. */
import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

const GAP_X = 420;
const GAP_Y = 260;

const workArg = process.argv.find((a) => a.startsWith("--work-id="));
const workFilter = workArg ? workArg.replace("--work-id=", "") : null;

const sql = postgres(DATABASE_URL);

const works = workFilter
  ? await sql`SELECT id, title FROM research_works WHERE id = ${workFilter}::uuid`
  : await sql`SELECT id, title FROM research_works WHERE is_template = false ORDER BY created_at`;

function topoLayers(nodes, edges) {
  const ids = nodes.map((n) => n.node_key);
  const idSet = new Set(ids);
  const indeg = Object.fromEntries(ids.map((id) => [id, 0]));
  const adj = Object.fromEntries(ids.map((id) => [id, []]));
  for (const e of edges) {
    const s = e.source_node_key;
    const t = e.target_node_key;
    if (idSet.has(s) && idSet.has(t)) {
      adj[s].push(t);
      indeg[t] = (indeg[t] || 0) + 1;
    }
  }
  const layerOf = {};
  let queue = ids.filter((id) => indeg[id] === 0);
  let depth = 0;
  while (queue.length) {
    const next = [];
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
  return layerOf;
}

for (const work of works) {
  const nodes = await sql`
    SELECT node_key, type, label FROM graph_nodes WHERE work_id = ${work.id}::uuid
  `;
  const edges = await sql`
    SELECT source_node_key, target_node_key FROM graph_edges WHERE work_id = ${work.id}::uuid
  `;
  if (!nodes.length) continue;

  const layerOf = topoLayers(nodes, edges);
  const byLayer = {};
  for (const n of nodes) {
    const layer = layerOf[n.node_key] ?? 0;
    if (!byLayer[layer]) byLayer[layer] = [];
    byLayer[layer].push(n);
  }

  for (const [layerStr, layerNodes] of Object.entries(byLayer)) {
    const layer = Number(layerStr);
    for (let i = 0; i < layerNodes.length; i++) {
      const n = layerNodes[i];
      const x = 40 + layer * GAP_X;
      const y = 80 + i * GAP_Y;
      await sql`
        UPDATE graph_nodes
        SET position_x = ${x}, position_y = ${y}
        WHERE work_id = ${work.id}::uuid AND node_key = ${n.node_key}
      `;
    }
  }
  console.log(`Respread ${nodes.length} nodes for: ${work.title}`);
}

await sql.end();
console.log("Done.");
