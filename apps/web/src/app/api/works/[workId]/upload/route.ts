import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { NodeType } from "@holocron/shared";
import { getDb } from "@/lib/db";
import { ingestWorkFile } from "@/lib/supermemory-client";
import { validateUploadExtension } from "@/lib/upload-validation";

function sanitizeFilename(raw: string): string {
  const safeName = path.basename(raw);
  if (!safeName || safeName === "." || safeName === ".." || raw !== safeName) {
    return "";
  }
  return safeName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workId: string }> }
) {
  try {
    const { workId } = await params;
    const db = getDb();
    const [work] = await db`SELECT id FROM research_works WHERE id = ${workId}::uuid`;
    if (!work) return NextResponse.json({ error: "Work not found" }, { status: 404 });

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const nodeType = String(form.get("nodeType") || "") as NodeType;
    const fieldKey = String(form.get("fieldKey") || "");

    const safeName = sanitizeFilename(file.name);
    if (!safeName) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    if (nodeType && fieldKey) {
      const validationError = validateUploadExtension(safeName, nodeType, fieldKey);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
    }

    const storagePath = process.env.STORAGE_PATH || "./storage";
    const workDir = path.join(storagePath, "works", workId);
    fs.mkdirSync(workDir, { recursive: true });

    const dest = path.resolve(workDir, safeName);
    if (!dest.startsWith(path.resolve(workDir))) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(dest, buffer);

    const ext = path.extname(safeName).toLowerCase();
    await ingestWorkFile(dest, workId, ext);

    const relPath = `works/${workId}/${safeName}`;
    const url = `/api/works/files?path=${encodeURIComponent(relPath)}`;

    return NextResponse.json({ path: relPath, url });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
