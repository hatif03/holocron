import { NextRequest, NextResponse } from "next/server";
import { analyzePaper } from "@/lib/agents-client";
import { getDb } from "@/lib/db";
import { storeMemory } from "@/lib/supermemory-client";

const LOCAL_USER = "00000000-0000-0000-0000-000000000001";

export async function POST(req: NextRequest) {
  try {
    const { text, file_path, reference_id, abstract, url, work_id } = await req.json();
    const analysisText = [text, abstract, url].filter(Boolean).join("\n\n");
    const analysis = await analyzePaper(analysisText || text || "", file_path);

    if (reference_id) {
      const db = getDb();
      await db`
        UPDATE references_lib SET analysis = ${JSON.stringify(analysis)}::jsonb
        WHERE id = ${reference_id}::uuid AND user_id = ${LOCAL_USER}::uuid
      `;
    }

    // Supermemory: add — make analysis semantically searchable (docs/SUPERMEMORY.md)
    if (work_id) {
      await storeMemory({
        content: JSON.stringify(analysis),
        containerTag: `work_${work_id}`,
        customId: reference_id ? `ref_${reference_id}` : undefined,
        metadata: {
          type: "reference",
          ...(reference_id ? { referenceId: reference_id } : {}),
        },
      });
    }

    return NextResponse.json(analysis);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
