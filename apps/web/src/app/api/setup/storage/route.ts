import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDb } from "@/lib/db";
import { formatBytes, getStorageBreakdown } from "@/lib/app-config";
import { getStoragePath } from "@/lib/storage-path";
import { deleteGenerationArtifacts } from "@/lib/storage-cleanup";

export async function GET() {
  try {
    const breakdown = getStorageBreakdown();
    const root = getStoragePath();
    const referencesDir = path.join(root, "references");
    const references = fs.existsSync(referencesDir)
      ? dirSizeBytes(referencesDir)
      : 0;

    let generationCount = 0;
    const genRoot = path.join(root, "generations");
    if (fs.existsSync(genRoot)) {
      generationCount = fs.readdirSync(genRoot).filter((n) => {
        try {
          return fs.statSync(path.join(genRoot, n)).isDirectory();
        } catch {
          return false;
        }
      }).length;
    }

    return NextResponse.json({
      storagePath: breakdown.storagePath,
      worksFormatted: formatBytes(breakdown.works),
      generationsFormatted: formatBytes(breakdown.generations),
      uploadsFormatted: formatBytes(breakdown.uploads),
      referencesFormatted: formatBytes(references),
      totalFormatted: formatBytes(breakdown.total),
      generationCount,
      persisted: true,
      message: `Data is persisted at ${breakdown.storagePath}`,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const target = req.nextUrl.searchParams.get("target");
    if (target !== "generations") {
      return NextResponse.json({ error: "Only target=generations supported" }, { status: 400 });
    }

    const db = getDb();
    const gens = await db`SELECT id FROM paper_generations`;
    for (const g of gens) {
      await db`DELETE FROM paper_generations WHERE id = ${g.id}::uuid`;
      deleteGenerationArtifacts(String(g.id));
    }

    return NextResponse.json({ ok: true, deleted: gens.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

function dirSizeBytes(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) total += dirSizeBytes(full);
    else total += fs.statSync(full).size;
  }
  return total;
}
