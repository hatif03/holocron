#!/usr/bin/env node
/**
 * Smoke test: store one doc with dreaming=instant, poll search until hits appear.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { searchSupermemoryWork, waitForSearchable } from "./seed-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
  }
}

const smUrl = process.env.SUPERMEMORY_API_URL || "http://localhost:6767";
const smKey = process.env.SUPERMEMORY_API_KEY || "";

async function main() {
  if (!smKey) {
    console.error("FAIL: SUPERMEMORY_API_KEY not set");
    process.exit(1);
  }

  const workId = randomUUID();
  const containerTag = `work_${workId}`;
  const content =
    "Introduction draft (diagnostic): Holocron Supermemory search recall smoke test document.";

  console.log("=== Supermemory search diagnose ===");
  console.log(`workId: ${workId}`);

  const storeRes = await fetch(`${smUrl}/v3/documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${smKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      containerTag,
      dreaming: "instant",
      customId: `diag_${workId}`,
      metadata: { type: "diagnostic" },
    }),
  });

  if (!storeRes.ok) {
    console.error(`FAIL: store HTTP ${storeRes.status}`, await storeRes.text());
    process.exit(1);
  }
  const stored = await storeRes.json();
  console.log(`Stored document id=${stored.id ?? "?"} status=${stored.status ?? "?"}`);

  const hits = await waitForSearchable(workId, "Introduction draft diagnostic", {
    timeoutMs: 45_000,
  });

  if (hits.length < 1) {
    const probe = await searchSupermemoryWork(workId, "Holocron Supermemory", 5);
    console.error(`FAIL: no search hits after 45s (probe returned ${probe.length})`);
    process.exit(1);
  }

  console.log(`PASS: ${hits.length} hit(s)`);
  console.log(`Sample: ${hits[0].slice(0, 120)}…`);

  await fetch(`${smUrl}/v3/documents/bulk`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${smKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ containerTags: [containerTag] }),
  }).catch(() => {});
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
