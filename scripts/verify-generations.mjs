#!/usr/bin/env node
/**
 * Run 2 paper generations on different works for E2E verification.
 * Usage: node scripts/verify-generations.mjs [workId1] [workId2]
 */
const WEB = process.env.WEB_URL || "http://localhost:3000";

async function listWorks() {
  const res = await fetch(`${WEB}/api/works`);
  if (!res.ok) throw new Error(`Works list failed: ${res.status}`);
  const data = await res.json();
  return (data.works || []).filter((w) => !w.is_template);
}

async function fetchWork(workId) {
  const res = await fetch(`${WEB}/api/works/${workId}`);
  if (!res.ok) throw new Error(`Work fetch failed: ${res.status}`);
  return res.json();
}

async function startGeneration(workId, title, graph) {
  const res = await fetch(`${WEB}/api/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workId,
      title,
      config: {
        styleGuide: "Nature",
        targetPages: 5,
        enablePlanning: true,
        enableReviewLoop: true,
        maxReviewIterations: 1,
        pauseForFeedback: false,
        compilePdf: true,
      },
      graph: {
        nodes: graph.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          label: n.label,
          data: n.data,
        })),
        edges: graph.edges.map((e) => ({ source: e.source, target: e.target })),
      },
    }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Generation start failed: ${JSON.stringify(data)}`);
  return data.id;
}

async function pollGeneration(genId, maxWaitMs = 300000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(`${WEB}/api/generations/${genId}`);
    const data = await res.json();
    const status = data.generation?.status;
    const step = data.generation?.current_step || status;
    process.stdout.write(`\r  [${genId.slice(0, 8)}] ${step}          `);
    if (status?.includes("completed") || status === "failed" || status === "cancelled") {
      console.log();
      return data.generation;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("Timeout waiting for generation");
}

async function checkMemory(workId, query) {
  const res = await fetch(
    `${WEB}/api/works/${workId}/memory/search?q=${encodeURIComponent(query)}`
  );
  return res.json();
}

async function main() {
  const works = await listWorks();
  if (works.length < 2) {
    throw new Error("Need at least 2 non-template works. Run seed:works first.");
  }

  const workId1 = process.argv[2] || works[0].id;
  const workId2 = process.argv[3] || works.find((w) => w.id !== workId1)?.id;

  if (!workId2 || workId1 === workId2) {
    throw new Error("Provide two distinct work IDs or seed multiple works.");
  }

  const [{ work: work1, graph: graph1 }, { work: work2, graph: graph2 }] = await Promise.all([
    fetchWork(workId1),
    fetchWork(workId2),
  ]);

  console.log(`Work 1: ${work1.title} (${graph1.nodes.length} nodes)`);
  console.log(`Work 2: ${work2.title} (${graph2.nodes.length} nodes)`);

  console.log("\n=== Generation 1 ===");
  const gen1 = await startGeneration(workId1, work1.title, graph1);
  console.log(`Started: ${gen1}`);
  const result1 = await pollGeneration(gen1);
  console.log(`Status: ${result1.status}, words: ${result1.word_count}, pdf: ${result1.pdf_path || "none"}`);

  const mem1 = await checkMemory(workId1, "plan");
  console.log(`Memory search (plan): ${mem1.results?.length || 0} results`);

  console.log("\n=== Generation 2 (different work) ===");
  const gen2 = await startGeneration(workId2, work2.title, graph2);
  console.log(`Started: ${gen2}`);
  const result2 = await pollGeneration(gen2);
  console.log(`Status: ${result2.status}, words: ${result2.word_count}, pdf: ${result2.pdf_path || "none"}`);

  const mem2 = await checkMemory(workId2, "Introduction");
  console.log(`Memory search (Introduction): ${mem2.results?.length || 0} results`);

  const ok =
    (result1.status?.includes("completed") || result1.pdf_path) &&
    (result2.status?.includes("completed") || result2.pdf_path);

  console.log(ok ? "\n✓ E2E verification passed" : "\n✗ E2E verification incomplete");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
