import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const STORAGE_PATH =
  process.env.STORAGE_PATH || path.join(__dirname, "..", "storage");

export const ASSETS_DIR = path.join(__dirname, "seed-assets");

export function normalizeNodeData(data) {
  if (data == null) return {};
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  if (Array.isArray(data)) {
    return data.reduce((acc, item) => {
      const part = typeof item === "string" ? JSON.parse(item) : item;
      return { ...acc, ...part };
    }, {});
  }
  return data;
}

export function copyAssetToWork(workId, assetName) {
  const src = path.join(ASSETS_DIR, assetName);
  if (!fs.existsSync(src)) return null;
  const destDir = path.join(STORAGE_PATH, "works", workId);
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, assetName);
  fs.copyFileSync(src, dest);
  const rel = `works/${workId}/${assetName}`;
  return {
    path: rel,
    url: `/api/works/files?path=${encodeURIComponent(rel)}`,
  };
}

export function extractArxivId(refRow) {
  if (!refRow) return null;
  const url = refRow.url || "";
  const fromUrl = url.match(/arxiv\.org\/abs\/([\d.]+)/i)?.[1];
  if (fromUrl) return fromUrl;
  const bib = refRow.bibtex || "";
  const eprint = bib.match(/eprint=\{([^}]+)\}/)?.[1];
  return eprint || null;
}

export async function downloadArxivPdf(arxivId, destPath) {
  if (!arxivId) return false;
  const url = `https://arxiv.org/pdf/${arxivId}.pdf`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return false;
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, buf);
    return true;
  } catch {
    return false;
  }
}

export async function linkLiteraturePdf(sql, workId, nodeKey, refRow) {
  const arxivId = extractArxivId(refRow);
  if (!arxivId) return null;
  const fileName = `${arxivId.replace(/\./g, "_")}.pdf`;
  const destPath = path.join(STORAGE_PATH, "works", workId, fileName);
  const ok = await downloadArxivPdf(arxivId, destPath);
  if (!ok) return null;
  const rel = `works/${workId}/${fileName}`;
  const url = `/api/works/files?path=${encodeURIComponent(rel)}`;
  const [row] = await sql`
    SELECT data FROM graph_nodes
    WHERE work_id = ${workId}::uuid AND node_key = ${nodeKey}
  `;
  if (!row) return null;
  const merged = {
    ...normalizeNodeData(row.data),
    file_path: rel,
    file_path_url: url,
  };
  await sql`
    UPDATE graph_nodes SET data = ${sql.json(merged)}
    WHERE work_id = ${workId}::uuid AND node_key = ${nodeKey}
  `;
  if (refRow.id) {
    await sql`
      UPDATE references_lib SET pdf_storage_path = ${rel}
      WHERE id = ${refRow.id}::uuid
    `;
  }
  return { path: rel, url };
}

function writeLineChartSvg(filePath, { title, xLabel, yLabel, points, stroke = "#2563eb" }) {
  const w = 480;
  const h = 280;
  const pad = { l: 48, r: 16, t: 36, b: 40 };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scaleX = (x) =>
    pad.l + ((x - minX) / Math.max(maxX - minX, 1)) * (w - pad.l - pad.r);
  const scaleY = (y) =>
    h - pad.b - ((y - minY) / Math.max(maxY - minY, 1)) * (h - pad.t - pad.b);
  const poly = points.map((p) => `${scaleX(p.x)},${scaleY(p.y)}`).join(" ");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#fafafa"/>
  <text x="${w / 2}" y="22" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="600">${title}</text>
  <line x1="${pad.l}" y1="${h - pad.b}" x2="${w - pad.r}" y2="${h - pad.b}" stroke="#ccc"/>
  <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${h - pad.b}" stroke="#ccc"/>
  <polyline fill="none" stroke="${stroke}" stroke-width="2.5" points="${poly}"/>
  ${points
    .map(
      (p) =>
        `<circle cx="${scaleX(p.x)}" cy="${scaleY(p.y)}" r="4" fill="${stroke}"/>`
    )
    .join("\n  ")}
  <text x="${w / 2}" y="${h - 8}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#666">${xLabel}</text>
  <text x="12" y="${h / 2}" transform="rotate(-90 12 ${h / 2})" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#666">${yLabel}</text>
</svg>`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, svg, "utf8");
}

export function writeReviewCurveSvg(destPath) {
  writeLineChartSvg(destPath, {
    title: "Reviewer Score vs Review Iterations",
    xLabel: "Review iterations",
    yLabel: "Automated reviewer score (1–5)",
    points: [
      { x: 0, y: 3.2 },
      { x: 1, y: 3.8 },
      { x: 2, y: 4.1 },
      { x: 3, y: 4.3 },
      { x: 4, y: 4.35 },
      { x: 5, y: 4.36 },
    ],
    stroke: "#7c3aed",
  });
}

export function writeRagMetricsSvg(destPath) {
  writeLineChartSvg(destPath, {
    title: "Citation F1 vs Memory Recall Rate",
    xLabel: "Memory recall rate",
    yLabel: "Citation F1",
    points: [
      { x: 0.2, y: 0.45 },
      { x: 0.35, y: 0.58 },
      { x: 0.5, y: 0.67 },
      { x: 0.65, y: 0.74 },
      { x: 0.8, y: 0.79 },
      { x: 0.95, y: 0.81 },
    ],
    stroke: "#059669",
  });
}

function writeBarChartSvg(filePath, { title, labels, values, barColor = "#4f46e5" }) {
  const w = 520;
  const h = 300;
  const pad = { l: 56, r: 20, t: 40, b: 72 };
  const maxV = Math.max(...values, 1);
  const barW = (w - pad.l - pad.r) / Math.max(labels.length, 1) - 8;
  const bars = labels
    .map((label, i) => {
      const v = values[i] ?? 0;
      const barH = ((v / maxV) * (h - pad.t - pad.b)) | 0;
      const x = pad.l + i * (barW + 8);
      const y = h - pad.b - barH;
      return `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${barColor}" rx="2"/>
  <text x="${x + barW / 2}" y="${h - 52}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" fill="#444" transform="rotate(-35 ${x + barW / 2} ${h - 52})">${label}</text>`;
    })
    .join("\n  ");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#fafafa"/>
  <text x="${w / 2}" y="24" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="600">${title}</text>
  <line x1="${pad.l}" y1="${h - pad.b}" x2="${w - pad.r}" y2="${h - pad.b}" stroke="#ccc"/>
  ${bars}
</svg>`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, svg, "utf8");
}

export function writeOwidEmissionsBarSvg(destPath) {
  writeBarChartSvg(destPath, {
    title: "CO₂ emissions per capita (2023, t)",
    labels: ["USA", "China", "India", "Germany", "Brazil", "UK", "Japan"],
    values: [14.9, 8.2, 2.0, 8.1, 2.2, 5.2, 8.5],
    barColor: "#dc2626",
  });
}

export function writeOwidLifeExpHistogramSvg(destPath) {
  const w = 520;
  const h = 300;
  const pad = { l: 48, r: 20, t: 40, b: 48 };
  const bins = [50, 55, 60, 65, 70, 75, 80, 85];
  const counts = [2, 5, 12, 28, 45, 38, 22, 8];
  const maxC = Math.max(...counts);
  const barW = (w - pad.l - pad.r) / bins.length - 4;
  const bars = bins
    .map((b, i) => {
      const c = counts[i];
      const barH = (c / maxC) * (h - pad.t - pad.b);
      const x = pad.l + i * (barW + 4);
      const y = h - pad.b - barH;
      return `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="#0ea5e9" rx="2"/>
  <text x="${x + barW / 2}" y="${h - 28}" text-anchor="middle" font-size="10" fill="#666">${b}</text>`;
    })
    .join("\n  ");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#fafafa"/>
  <text x="${w / 2}" y="24" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="600">Life expectancy distribution (countries, 2023)</text>
  <line x1="${pad.l}" y1="${h - pad.b}" x2="${w - pad.r}" y2="${h - pad.b}" stroke="#ccc"/>
  ${bars}
  <text x="${w / 2}" y="${h - 8}" text-anchor="middle" font-size="11" fill="#666">Life expectancy (years)</text>
</svg>`;
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, svg, "utf8");
}

function writeMatplotlibPng(destPath, pythonBody) {
  const script = `
import matplotlib
matplotlib.use('Agg')
${pythonBody}
`;
  const r = spawnSync("python", ["-c", script], {
    encoding: "utf8",
    timeout: 60_000,
  });
  if (r.status !== 0) {
    throw new Error(r.stderr || r.stdout || "matplotlib PNG export failed");
  }
}

export function writeOwidEmissionsBarPng(destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const labels = ["USA", "China", "India", "Germany", "Brazil", "UK", "Japan"];
  const values = [14.9, 8.2, 2.0, 8.1, 2.2, 5.2, 8.5];
  writeMatplotlibPng(
    destPath,
    `
labels = ${JSON.stringify(labels)}
values = ${JSON.stringify(values)}
import matplotlib.pyplot as plt
plt.figure(figsize=(6.5, 3.5))
plt.bar(labels, values, color="#dc2626")
plt.title("CO₂ emissions per capita (2023, t)")
plt.xticks(rotation=45, ha="right")
plt.tight_layout()
plt.savefig(${JSON.stringify(destPath.replace(/\\/g, "/"))}, dpi=120)
plt.close()
`
  );
}

export function writeOwidLifeExpHistogramPng(destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  writeMatplotlibPng(
    destPath,
    `
import matplotlib.pyplot as plt
bins = [50, 55, 60, 65, 70, 75, 80, 85]
counts = [2, 5, 12, 28, 45, 38, 22, 8]
plt.figure(figsize=(6.5, 3.5))
plt.bar(bins, counts, width=4, color="#0ea5e9", align="edge")
plt.title("Life expectancy distribution (countries, 2023)")
plt.xlabel("Life expectancy (years)")
plt.tight_layout()
plt.savefig(${JSON.stringify(destPath.replace(/\\/g, "/"))}, dpi=120)
plt.close()
`
  );
}

export function writeRenewablesBarPng(destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const labels = ["Norway", "Brazil", "Germany", "China", "USA", "India", "Australia"];
  const values = [98, 89, 46, 31, 22, 21, 32];
  writeMatplotlibPng(
    destPath,
    `
labels = ${JSON.stringify(labels)}
values = ${JSON.stringify(values)}
import matplotlib.pyplot as plt
plt.figure(figsize=(6.5, 3.5))
plt.bar(labels, values, color="#16a34a")
plt.title("Renewable electricity share (2023, %)")
plt.xticks(rotation=45, ha="right")
plt.tight_layout()
plt.savefig(${JSON.stringify(destPath.replace(/\\/g, "/"))}, dpi=120)
plt.close()
`
  );
}

export function writeFossilShareHistogramPng(destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  writeMatplotlibPng(
    destPath,
    `
import matplotlib.pyplot as plt
bins = [10, 20, 30, 40, 50, 60, 70, 80, 90]
counts = [8, 14, 22, 35, 48, 42, 30, 18, 6]
plt.figure(figsize=(6.5, 3.5))
plt.bar(bins, counts, width=8, color="#ca8a04", align="edge")
plt.title("Fossil fuel share of primary energy (countries, 2023)")
plt.xlabel("Fossil share (%)")
plt.tight_layout()
plt.savefig(${JSON.stringify(destPath.replace(/\\/g, "/"))}, dpi=120)
plt.close()
`
  );
}

/** Sample OWID panel: renewable share vs fossil fuel dependence. */
export function sampleRenewablesPanel(renewCsvText, fossilCsvText) {
  const countries = new Set([
    "United States",
    "China",
    "India",
    "Germany",
    "Brazil",
    "United Kingdom",
    "Japan",
    "France",
    "Norway",
    "Australia",
  ]);
  const years = new Set();
  for (let y = 2000; y <= 2023; y++) years.add(String(y));

  function parseLongCsv(text, valueHints) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    const header = lines[0].split(",");
    const entityIdx = header.indexOf("Entity");
    const yearIdx = header.indexOf("Year");
    const valIdx = header.findIndex((h) =>
      valueHints.some((hint) => h.toLowerCase().includes(hint))
    );
    const map = new Map();
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      const entity = cols[entityIdx];
      const year = cols[yearIdx];
      if (!countries.has(entity) || !years.has(year)) continue;
      const val = cols[valIdx];
      if (!map.has(entity)) map.set(entity, {});
      map.get(entity)[year] = val;
    }
    return map;
  }

  const renew = parseLongCsv(renewCsvText, ["renewable", "share"]);
  const fossil = parseLongCsv(fossilCsvText, ["fossil", "primary"]);
  const rows = ["Entity,Year,renewable_share,fossil_share"];
  for (const c of countries) {
    for (const y of years) {
      const rv = renew.get(c)?.[y] ?? "";
      const fv = fossil.get(c)?.[y] ?? "";
      if (rv || fv) rows.push(`${c},${y},${rv},${fv}`);
    }
  }
  return rows.join("\n");
}

export async function seedRecallMemories(workId, userId, memories) {
  const smUrl = process.env.SUPERMEMORY_API_URL || "http://localhost:6767";
  const smKey = process.env.SUPERMEMORY_API_KEY || "";
  if (!smKey) {
    console.warn("SUPERMEMORY_API_KEY not set — skipping recall memory seed");
    return 0;
  }
  let count = 0;
  for (const mem of memories) {
    const containerTag = mem.containerTag || `work_${workId}`;
    try {
      const res = await fetch(`${smUrl}/v3/documents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${smKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: mem.content,
          containerTag,
          dreaming: "instant",
          customId: mem.customId,
          metadata: { ...mem.metadata, workId, userId },
        }),
      });
      if (res.ok) count += 1;
      else console.warn(`Supermemory seed failed (${mem.customId}): HTTP ${res.status}`);
    } catch (e) {
      console.warn(`Supermemory seed failed (${mem.customId}):`, e.message);
    }
  }
  return count;
}

const SEARCH_THRESHOLD = 0.3;

export async function searchSupermemoryWork(workId, query, limit = 5) {
  const smUrl = process.env.SUPERMEMORY_API_URL || "http://localhost:6767";
  const smKey = process.env.SUPERMEMORY_API_KEY || "";
  if (!smKey) return [];
  try {
    const res = await fetch(`${smUrl}/v4/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${smKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        containerTag: `work_${workId}`,
        searchMode: "hybrid",
        limit,
        threshold: SEARCH_THRESHOLD,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? [])
      .map((r) => r.memory ?? r.chunk ?? "")
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Poll hybrid search until hits appear or timeout (after instant-dreaming store). */
export async function waitForSearchable(workId, query, { timeoutMs = 30_000, intervalMs = 1000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const hits = await searchSupermemoryWork(workId, query, 3);
    if (hits.length > 0) return hits;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return [];
}

export async function downloadOwidCsv(slug, destPath) {
  const url = `https://ourworldindata.org/grapher/${slug}.csv?v=1&csvType=full&useColumnShortNames=false`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Holocron research seed/1.0" },
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`OWID download failed: ${slug} HTTP ${res.status}`);
  const text = await res.text();
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, text, "utf8");
  return destPath;
}

/** Sample OWID long-format CSV to a compact cross-country panel. */
export function sampleOwidPanel(co2CsvText, lifeCsvText) {
  const countries = new Set([
    "United States",
    "China",
    "India",
    "Germany",
    "Brazil",
    "United Kingdom",
    "Japan",
    "France",
    "Nigeria",
    "Australia",
  ]);
  const years = new Set();
  for (let y = 1990; y <= 2023; y++) years.add(String(y));

  function parseLongCsv(text, valueCol) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    const header = lines[0].split(",");
    const entityIdx = header.indexOf("Entity");
    const yearIdx = header.indexOf("Year");
    const valIdx = header.findIndex((h) => h.includes(valueCol) || h === valueCol);
    const map = new Map();
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      const entity = cols[entityIdx];
      const year = cols[yearIdx];
      if (!countries.has(entity) || !years.has(year)) continue;
      const val = cols[valIdx];
      if (!map.has(entity)) map.set(entity, {});
      map.get(entity)[year] = val;
    }
    return map;
  }

  const co2 = parseLongCsv(co2CsvText, "emissions");
  const life = parseLongCsv(lifeCsvText, "expectancy");
  const rows = ["Entity,Year,co2_per_capita,life_expectancy"];
  for (const c of countries) {
    for (const y of years) {
      const co2v = co2.get(c)?.[y] ?? "";
      const lifev = life.get(c)?.[y] ?? "";
      if (co2v || lifev) {
        rows.push(`${c},${y},${co2v},${lifev}`);
      }
    }
  }
  return rows.join("\n");
}

export function resolveRefForNode(n, refs, workTitle) {
  if (n.refIndex == null) return { data: { ...n.data }, ref: null };
  const data = { ...n.data };
  const ref = refs[n.refIndex];
  if (!ref) {
    console.warn(
      `[${workTitle}] Node ${n.key}: refIndex ${n.refIndex} missing (only ${refs.length} refs)`
    );
    return { data, ref: null };
  }
  data.reference_id = ref.id;
  data.bibtex = ref.bibtex || data.bibtex;
  return { data, ref };
}

export async function syncWorkReferences(sql, workId, nodes) {
  const refIds = new Set();
  for (const n of nodes) {
    const data = normalizeNodeData(n.data || {});
    if (data.reference_id) refIds.add(data.reference_id);
  }
  await sql`DELETE FROM work_references WHERE work_id = ${workId}::uuid`;
  for (const refId of refIds) {
    await sql`
      INSERT INTO work_references (work_id, reference_id)
      VALUES (${workId}::uuid, ${refId}::uuid)
      ON CONFLICT DO NOTHING
    `;
  }
  return refIds.size;
}

export async function assertWorkRefCount(sql, workId, title, minRefs = 1) {
  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count FROM work_references WHERE work_id = ${workId}::uuid
  `;
  if (count < minRefs) {
    console.error(`FAIL: "${title}" has ${count} refs (expected >= ${minRefs})`);
    return false;
  }
  console.log(`OK: "${title}" linked ${count} reference(s)`);
  return true;
}

/** Write a minimal but valid PDF (browser-viewable) for demo seeds. */
export function writeMinimalPdf(filePath, title = "Holocron Demo Paper") {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  function esc(s) {
    return String(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  const t1 = esc(title.slice(0, 72));
  const t2 = esc("Demo generation - Holocron");
  const stream = `BT /F1 14 Tf 72 750 Td (${t1}) Tj 0 -20 Td (${t2}) Tj ET`;

  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let body = "%PDF-1.4\n";
  const offsets = [0];

  for (let i = 0; i < objs.length; i++) {
    offsets.push(Buffer.byteLength(body, "utf8"));
    body += `${i + 1} 0 obj\n${objs[i]}\nendobj\n`;
  }

  const xrefPos = Buffer.byteLength(body, "utf8");
  body += `xref\n0 ${objs.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (let i = 1; i <= objs.length; i++) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\n`;
  body += `startxref\n${xrefPos}\n%%EOF\n`;

  fs.writeFileSync(filePath, body, "utf8");
}

export async function ingestGraphMemory(workId, title, nodeCount, edgeCount) {
  const smUrl = process.env.SUPERMEMORY_API_URL || "http://localhost:6767";
  const smKey = process.env.SUPERMEMORY_API_KEY || "";
  if (!smKey) return;
  try {
    await fetch(`${smUrl}/v3/documents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${smKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: `Research work "${title}" seeded with ${nodeCount} nodes and ${edgeCount} edges.`,
        containerTag: `work_${workId}`,
        dreaming: "instant",
        customId: `work_${workId}_seed`,
        metadata: { type: "graph", workId },
      }),
    });
  } catch {
    /* supermemory optional during seed */
  }
}
