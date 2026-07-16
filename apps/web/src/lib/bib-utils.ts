export interface BibEntry {
  key: string;
  title?: string;
  authors?: string;
  year?: string;
  raw: string;
}

/** Parse BibTeX entries into structured records (best-effort). */
export function parseBibtex(content: string): BibEntry[] {
  const entries: BibEntry[] = [];
  const re = /@\w+\s*\{\s*([^,\s]+)\s*,([\s\S]*?)(?=\n@|\n*$)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const key = match[1].trim();
    const body = match[2];
    const raw = match[0].trim();
    const title = body.match(/title\s*=\s*\{([^}]*)\}/i)?.[1];
    const authors = body.match(/author\s*=\s*\{([^}]*)\}/i)?.[1];
    const year = body.match(/year\s*=\s*\{([^}]*)\}/i)?.[1];
    entries.push({ key, title, authors, year, raw });
  }
  return entries;
}

/** Extract citation keys from LaTeX content. */
export function extractCiteKeys(tex: string): string[] {
  const keys = new Set<string>();
  const patterns = [
    /\\cite[a-z*]*\{([^}]+)\}/gi,
    /\\citep\{([^}]+)\}/gi,
    /\\citet\{([^}]+)\}/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(tex)) !== null) {
      for (const k of m[1].split(",")) {
        const trimmed = k.trim();
        if (trimmed) keys.add(trimmed);
      }
    }
  }
  return [...keys];
}

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
