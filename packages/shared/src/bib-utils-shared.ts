/** Shared BibTeX helpers (no Node deps). */

export function splitBibtexEntries(bibtex: string): string[] {
  const entries: string[] = [];
  const re = /@\w+\s*\{[\s\S]*?\n\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(bibtex)) !== null) {
    entries.push(match[0].trim());
  }
  if (!entries.length && bibtex.trim()) {
    return [bibtex.trim()];
  }
  return entries;
}

export function extractBibKey(entry: string): string {
  const m = entry.match(/@\w+\s*\{\s*([^,\s]+)/);
  return m?.[1]?.trim() || "ref";
}
