/**
 * Minimal BibTeX entry parser for single-entry imports.
 */
export interface ParsedBibTeX {
  title: string;
  authors: string;
  year: number | null;
  doi: string;
  url: string;
  bibtex: string;
}

function extractField(entry: string, field: string): string {
  const re = new RegExp(`${field}\\s*=\\s*[{"]`, "i");
  const match = entry.match(re);
  if (!match || match.index === undefined) return "";

  const start = match.index + match[0].length;
  const open = entry[start - 1];
  let depth = 1;
  let i = start;
  while (i < entry.length && depth > 0) {
    const ch = entry[i];
    if (ch === open) depth++;
    else if (ch === (open === "{" ? "}" : '"')) depth--;
    i++;
  }
  return entry.slice(start, i - 1).trim();
}

function normalizeAuthors(raw: string): string {
  return raw
    .split(/\s+and\s+/i)
    .map((a) => a.trim())
    .filter(Boolean)
    .join(", ");
}

export function parseBibTeX(input: string): ParsedBibTeX {
  const entry = input.trim();
  const title = extractField(entry, "title");
  const authorRaw = extractField(entry, "author");
  const yearStr = extractField(entry, "year");
  const doi = extractField(entry, "doi");
  const url = extractField(entry, "url") || extractField(entry, "eprint");

  return {
    title: title.replace(/[{}]/g, ""),
    authors: normalizeAuthors(authorRaw.replace(/[{}]/g, "")),
    year: yearStr ? parseInt(yearStr, 10) : null,
    doi: doi.replace(/[{}]/g, ""),
    url: url.replace(/[{}]/g, ""),
    bibtex: entry,
  };
}
