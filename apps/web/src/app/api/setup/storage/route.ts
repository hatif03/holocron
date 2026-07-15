import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { formatBytes, getStorageBreakdown } from "@/lib/app-config";

export async function GET() {
  const breakdown = getStorageBreakdown();
  return NextResponse.json({
    storagePath: breakdown.storagePath,
    worksFormatted: formatBytes(breakdown.works),
    generationsFormatted: formatBytes(breakdown.generations),
    uploadsFormatted: formatBytes(breakdown.uploads),
    totalFormatted: formatBytes(breakdown.total),
  });
}

function rmDirContents(dir: string) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      rmDirContents(full);
      fs.rmdirSync(full);
    } else {
      fs.unlinkSync(full);
    }
  }
}

export async function DELETE(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("target");
  if (target !== "generations") {
    return NextResponse.json({ error: "Unsupported target" }, { status: 400 });
  }

  const breakdown = getStorageBreakdown();
  const genDir = path.join(breakdown.storagePath, "generations");
  rmDirContents(genDir);

  return NextResponse.json({ ok: true });
}
