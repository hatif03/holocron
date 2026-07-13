import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getGenerationStatus } from "@/lib/agents-client";
import fs from "fs";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ genId: string }> }
) {
  try {
    const { genId } = await params;
    const db = getDb();
    const [gen] = await db`SELECT * FROM paper_generations WHERE id = ${genId}::uuid`;
    if (!gen) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let agentStatus = null;
    try {
      agentStatus = await getGenerationStatus(genId);
    } catch {
      /* agents may be offline */
    }

    if (agentStatus?.result && gen.status === "running") {
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
    }

    const updatedEvents = await db`
      SELECT * FROM generation_events WHERE generation_id = ${genId}::uuid
      ORDER BY created_at ASC
    `;

    const storagePath = process.env.STORAGE_PATH || "./storage";
    const outputDir = gen.output_dir || path.join(storagePath, "generations", genId);
    let files: string[] = [];
    if (fs.existsSync(outputDir)) {
      files = listFilesRecursive(outputDir);
    }

    return NextResponse.json({
      generation: gen,
      events: updatedEvents.length ? updatedEvents : agentStatus?.events || [],
      agentStatus,
      files,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

function listFilesRecursive(dir: string, base = dir): string[] {
  const result: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full);
    if (entry.isDirectory()) {
      result.push(...listFilesRecursive(full, base));
    } else {
      result.push(rel.replace(/\\/g, "/"));
    }
  }
  return result;
}
