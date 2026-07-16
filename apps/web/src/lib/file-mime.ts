export const FILE_MIME: Record<string, string> = {
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
  ".tex": "text/plain",
  ".bib": "text/plain",
  ".py": "text/plain",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".parquet": "application/octet-stream",
};

export function mimeForPath(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return FILE_MIME[ext] || "application/octet-stream";
}

export function isTextPreviewPath(filePath: string): boolean {
  return /\.(tex|bib|csv|tsv|json|txt|py|md|log)$/i.test(filePath);
}

export function isImagePath(filePath: string): boolean {
  return /\.(png|jpg|jpeg|svg|gif|webp)$/i.test(filePath);
}
