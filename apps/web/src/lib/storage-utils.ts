/**
 * Normalize absolute or relative storage paths to a path relative to STORAGE_PATH.
 * Handles Docker paths like /data/storage/generations/{id}/main.pdf.
 */
export function toStorageRelPath(filePath: string, genId?: string): string {
  const normalized = filePath.replace(/\\/g, "/");

  if (normalized.includes("generations/")) {
    const idx = normalized.indexOf("generations/");
    return normalized.slice(idx);
  }

  if (genId) {
    const name = normalized.split("/").pop() || "main.pdf";
    return `generations/${genId}/${name}`;
  }

  return normalized.replace(/^\.?\/?storage\/?/, "").replace(/^\/+/, "");
}

export function generationPdfRelPath(genId: string, pdfPath?: string | null): string | null {
  if (!pdfPath) return `generations/${genId}/main.pdf`;
  return toStorageRelPath(String(pdfPath), genId);
}

export function generationFileUrl(genId: string, relFile: string): string {
  const normalized = relFile.replace(/\\/g, "/").replace(/^\.\//, "");
  const rel = normalized.startsWith("generations/")
    ? normalized
    : `generations/${genId}/${normalized}`;
  return `/api/works/files?path=${encodeURIComponent(rel)}`;
}

export function generationFilesUrl(genId: string, pdfPath?: string | null): string | null {
  const rel = generationPdfRelPath(genId, pdfPath);
  if (!rel) return null;
  return `/api/works/files?path=${encodeURIComponent(rel)}`;
}
