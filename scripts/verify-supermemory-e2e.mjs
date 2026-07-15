#!/usr/bin/env node
/**
 * E2E: create work + graph, verify Supermemory, start paper generation, poll memory.
 */
const WEB = process.env.WEB_URL || "http://localhost:3000";
const AGENTS = process.env.AGENTS_SERVICE_URL || "http://localhost:8000";

const nodes = [
  {
    id: "start_1",
    type: "start",
    label: "Paper Start",
    position: { x: 40, y: 200 },
    data: {
      status: "complete",
      paper_title: "Supermemory E2E Test",
      target_venue: "Nature",
    },
  },
  {
    id: "idea_1",
    type: "idea",
    label: "Core Idea",
    position: { x: 280, y: 80 },
    data: {
      status: "complete",
      body: "Persistent work-scoped memory improves multi-agent paper writing fidelity.",
    },
  },
  {
    id: "question_1",
    type: "question",
    label: "Research Question",
    position: { x: 280, y: 220 },
    data: {
      status: "complete",
      body: "Does Supermemory retrieval during planning increase citation grounding?",
    },
  },
  {
    id: "method_1",
    type: "method",
    label: "Methods",
    position: { x: 520, y: 120 },
    data: {
      status: "complete",
      body: "Compare planner outputs with and without work_{workId} memory profile queries.",
    },
  },
  {
    id: "result_1",
    type: "result",
    label: "Expected Result",
    position: { x: 520, y: 280 },
    data: {
      status: "complete",
      body: "Memory-augmented sections reference graph hypotheses and methods more consistently.",
    },
  },
  {
    id: "end_1",
    type: "end",
    label: "Paper End",
    position: { x: 760, y: 200 },
    data: {
      status: "complete",
      notes: "Generate IMRaD paper from this graph for Supermemory E2E verification.",
    },
  },
];

const edges = [
  { id: "e1", source: "start_1", target: "idea_1" },
  { id: "e2", source: "idea_1", target: "question_1" },
  { id: "e3", source: "question_1", target: "method_1" },
  { id: "e4", source: "method_1", target: "result_1" },
  { id: "e5", source: "result_1", target: "end_1" },
];

async function json(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    signal: AbortSignal.timeout(opts.timeout ?? 30_000),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) throw new Error(`${url} → ${res.status}: ${text.slice(0, 300)}`);
  return data;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("=== Supermemory E2E ===\n");

  const work = await json(`${WEB}/api/works`, {
    method: "POST",
    body: JSON.stringify({
      title: "Supermemory E2E Test",
      description: "Automated E2E verification of work-scoped memory",
    }),
  });
  const workId = work.id;
  console.log(`Created work: ${workId}`);

  await json(`${WEB}/api/works/${workId}`, {
    method: "PUT",
    body: JSON.stringify({
      title: work.title,
      description: work.description,
      graph: { nodes, edges },
    }),
  });
  console.log("Saved graph (Supermemory write on save)");

  await sleep(8000);
  const profile = await json(`${WEB}/api/works/${workId}/memory/profile?q=hypothesis`);
  const hitCount =
    (profile.hits || []).length +
    (profile.profile?.dynamic || []).length +
    (profile.profile?.static || []).length;
  console.log(`Memory profile enabled=${profile.enabled} hits=${hitCount}`);
  if (!profile.enabled) {
    console.error("FAIL: Supermemory not enabled on web");
    process.exit(1);
  }

  // Direct search fallback (indexing may lag profile)
  const search = await json(
    `${WEB}/api/works/${workId}/memory/search?q=Supermemory&limit=5`
  ).catch(() => ({ results: [] }));
  const searchCount = (search.results || []).length;
  console.log(`Memory search results=${searchCount}`);

  const agentsHealth = await json(`${AGENTS}/health`);
  if (agentsHealth.supermemory !== "ok") {
    console.error(`FAIL: agents supermemory=${agentsHealth.supermemory}`);
    process.exit(1);
  }
  console.log(`Agents supermemory: ${agentsHealth.supermemory}`);

  const genGraph = {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
      data: n.data,
    })),
    edges: edges.map((e) => ({ source: e.source, target: e.target })),
  };

  const config = {
    styleGuide: "Nature",
    targetPages: 6,
    enablePlanning: true,
    enableReviewLoop: true,
    maxReviewIterations: 2,
    compilePdf: true,
    pauseForFeedback: false,
  };

  const gen = await json(`${WEB}/api/generations`, {
    method: "POST",
    body: JSON.stringify({
      workId,
      title: work.title,
      config,
      graph: genGraph,
    }),
    timeout: 60_000,
  });
  const genId = gen.id;
  console.log(`\nStarted generation: ${genId}`);

  let memoryOk = false;
  let smEventCount = 0;
  for (let i = 0; i < 45; i++) {
    await sleep(10_000);
    try {
      const mem = await json(`${WEB}/api/generations/${genId}/memory?q=plan`);
      const results = mem.results?.length || mem.hits?.length || 0;
      const detail = await json(`${WEB}/api/generations/${genId}`);
      const gen = detail.generation || detail;
      const events = detail.events || [];
      smEventCount = events.filter(
        (e) => e.agent === "Supermemory" || e.message?.includes("Supermemory")
      ).length;
      const step = gen?.current_step || gen?.status || "unknown";
      console.log(
        `  poll ${i + 1}: gen=${gen?.status || "?"} step=${step} memory_hits=${results} sm_events=${smEventCount}`
      );
      if (results > 0 || smEventCount > 0) memoryOk = true;
      if (
        gen?.status === "completed" ||
        gen?.status === "completed_with_warnings" ||
        gen?.status === "failed"
      )
        break;
    } catch (e) {
      console.log(`  poll ${i + 1}: ${e.message}`);
    }
  }

  const finalHealth = await json(`${AGENTS}/health`);
  console.log(`\nFinal agents supermemory: ${finalHealth.supermemory}`);
  console.log(`Memory hits during generation: ${memoryOk ? "yes" : "no"}`);

  if (!memoryOk) {
    console.error("FAIL: No memory hits during generation");
    process.exit(1);
  }
  if (finalHealth.supermemory !== "ok") {
    console.error("FAIL: agents lost supermemory connectivity");
    process.exit(1);
  }

  console.log("\nPASS: Supermemory E2E verification");
  console.log(`Work: ${WEB}/research-graph/${workId}`);
  console.log(`Generation: ${WEB}/paper-generation/${genId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
