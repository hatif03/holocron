import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getGenerationStatus } from "@/lib/agents-client";
import fs from "fs";
import path from "path";
import { getStoragePath } from "@/lib/storage-path";

interface FileNode {
  name: string;
  path: string;
  size: number;
  type: "file" | "folder";
  children?: FileNode[];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ genId: string }> }
) {
  try {
    const { genId } = await params;
    const fileParam = req.nextUrl.searchParams.get("file");
    const db = getDb();
    const [gen] = await db`SELECT * FROM paper_generations WHERE id = ${genId}::uuid`;
    if (!gen) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const storagePath = getStoragePath();
    const outputDir = gen.output_dir || path.join(storagePath, "generations", genId);

    if (fileParam) {
      const fullPath = path.resolve(outputDir, fileParam);
      if (!fullPath.startsWith(path.resolve(outputDir))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!fs.existsSync(fullPath)) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const content = fs.readFileSync(fullPath, "utf-8");
      const words = content.split(/\s+/).filter(Boolean).length;
      return NextResponse.json({ content, words, path: fileParam });
    }

    let agentStatus = null;
    try {
      agentStatus = await getGenerationStatus(genId);
    } catch {
      /* agents offline */
    }

    if (agentStatus?.result && (gen.status === "running" || agentStatus.status?.includes("completed"))) {
      await db`
        UPDATE paper_generations SET
          status = ${agentStatus.status},
          output_dir = ${agentStatus.result.output_dir},
          pdf_path = ${agentStatus.result.pdf_path},
          word_count = ${agentStatus.result.word_count || 0},
          updated_at = NOW()
        WHERE id = ${genId}::uuid
      `;
    }

    if (agentStatus?.events?.length) {
      for (const ev of agentStatus.events) {
        const exists = await db`
          SELECT 1 FROM generation_events
          WHERE generation_id = ${genId}::uuid AND message = ${ev.message}
          LIMIT 1
        `;
        if (!exists.length) {
          await db`
            INSERT INTO generation_events (generation_id, agent, event_type, message, metadata)
            VALUES (${genId}::uuid, ${ev.agent}, ${ev.event_type}, ${ev.message}, ${JSON.stringify(ev.metadata || {})}::jsonb)
          `;
        }
      }

      const lastEv = agentStatus.events[agentStatus.events.length - 1];
      const reviewCount = agentStatus.events.filter(
        (e: { agent: string; event_type: string }) =>
          e.agent === "Reviewer" && e.event_type === "completed"
      ).length;

      await db`
        UPDATE paper_generations SET
          current_step = ${lastEv.message},
          review_count = ${reviewCount},
          updated_at = NOW()
        WHERE id = ${genId}::uuid
      `;
    }

    const [updatedGen] = await db`SELECT * FROM paper_generations WHERE id = ${genId}::uuid`;

    const events = await db`
      SELECT * FROM generation_events WHERE generation_id = ${genId}::uuid
      ORDER BY created_at ASC
    `;

    const reviewCount =
      updatedGen.review_count ||
      events.filter(
        (e) =>
          String(e.agent) === "Reviewer" && String(e.event_type) === "completed"
      ).length;

    let fileTree: FileNode[] = [];
    if (fs.existsSync(outputDir)) {
      fileTree = buildFileTree(outputDir);
    }

    return NextResponse.json({
      generation: { ...updatedGen, review_count: reviewCount },
      events: events.length ? events : agentStatus?.events || [],
      fileTree,
      outputDir: outputDir.replace(/\\/g, "/"),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ genId: string }> }
) {
  try {
    const { genId } = await params;
    const db = getDb();
    await db`DELETE FROM paper_generations WHERE id = ${genId}::uuid`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ genId: string }> }
) {
  try {
    const { genId } = await params;
    const { status } = await req.json();
    const db = getDb();
    await db`
      UPDATE paper_generations SET status = ${status}, updated_at = NOW()
      WHERE id = ${genId}::uuid
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

function buildFileTree(dir: string, base = dir): FileNode[] {
  const raw = _buildRawTree(dir, base);
  return groupFileTree(raw);
}

function _buildRawTree(dir: string, base = dir): FileNode[] {
  const nodes: FileNode[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        path: rel,
        size: 0,
        type: "folder",
        children: _buildRawTree(full, base),
      });
    } else {
      const stat = fs.statSync(full);
      nodes.push({
        name: entry.name,
        path: rel,
        size: stat.size,
        type: "file",
      });
    }
  }
  return nodes;
}

function groupFileTree(nodes: FileNode[]): FileNode[] {
  const sections: FileNode[] = [];
  const rootFiles: FileNode[] = [];

  for (const node of nodes) {
    if (node.type === "folder" && node.name === "sections" && node.children?.length) {
      sections.push(...node.children);
    } else if (node.type === "file") {
      rootFiles.push(node);
    } else if (node.type === "folder" && node.name !== "figures") {
      rootFiles.push(node);
    }
  }

  const grouped: FileNode[] = [];
  if (sections.length) {
    grouped.push({
      name: "Sections",
      path: "sections",
      size: 0,
      type: "folder",
      children: sections,
    });
  }
  if (rootFiles.length) {
    grouped.push({
      name: "Root",
      path: ".",
      size: 0,
      type: "folder",
      children: rootFiles,
    });
  }
  return grouped.length ? grouped : nodes;
}
