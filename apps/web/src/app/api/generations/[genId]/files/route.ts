import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDb } from "@/lib/db";
import { getStoragePath } from "@/lib/storage-path";
import { mimeForPath } from "@/lib/file-mime";

function resolveOutputDir(genId: string, outputDir: string | null): string {
  if (outputDir && fs.existsSync(outputDir)) return outputDir;
  return path.join(getStoragePath(), "generations", genId);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ genId: string }> }
) {
  try {
    const { genId } = await params;
    const relPath = req.nextUrl.searchParams.get("path");
    if (!relPath || relPath.includes("..")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const db = getDb();
    const [gen] = await db`SELECT output_dir FROM paper_generations WHERE id = ${genId}::uuid`;
    if (!gen) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const outputDir = resolveOutputDir(genId, gen.output_dir as string | null);
    const fullPath = path.resolve(outputDir, relPath);
    if (!fullPath.startsWith(path.resolve(outputDir))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const contentType = mimeForPath(fullPath);
    const filename = path.basename(fullPath);
    const stream = fs.createReadStream(fullPath);
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    };
    if (fullPath.endsWith(".pdf")) {
      headers["Content-Disposition"] = `inline; filename="${filename}"`;
    }

    return new NextResponse(stream as unknown as BodyInit, { headers });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
