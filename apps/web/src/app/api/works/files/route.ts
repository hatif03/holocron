import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getStoragePath } from "@/lib/storage-path";

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".csv": "text/csv",
  ".tsv": "text/tab-separated-values",
  ".json": "application/json",
  ".txt": "text/plain",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".parquet": "application/octet-stream",
};

export async function GET(req: NextRequest) {
  try {
    const relPath = req.nextUrl.searchParams.get("path");
    if (!relPath || relPath.includes("..")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const storagePath = getStoragePath();
    const fullPath = path.resolve(storagePath, relPath);
    const base = path.resolve(storagePath);

    if (!fullPath.startsWith(base)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    const data = fs.readFileSync(fullPath);
    const filename = path.basename(fullPath);
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    };
    if (ext === ".pdf") {
      headers["Content-Disposition"] = `inline; filename="${filename}"`;
    }

    return new NextResponse(data, { headers });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
