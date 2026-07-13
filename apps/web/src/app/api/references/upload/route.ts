import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function sanitizeFilename(raw: string): string {
  const safeName = path.basename(raw);
  if (!safeName || safeName === "." || safeName === "..") return "";
  return safeName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const safeName = sanitizeFilename(file.name);
    if (!safeName) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const storagePath = process.env.STORAGE_PATH || "./storage";
    const refDir = path.join(storagePath, "references");
    fs.mkdirSync(refDir, { recursive: true });

    const dest = path.resolve(refDir, safeName);
    if (!dest.startsWith(path.resolve(refDir))) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(dest, buffer);

    const relPath = `references/${safeName}`;
    const url = `/api/works/files?path=${encodeURIComponent(relPath)}`;

    return NextResponse.json({ path: relPath, url, full_path: dest });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
