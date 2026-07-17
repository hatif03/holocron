/**
 * Lightweight title/keyword overlap scoring for literature discovery ranking.
 */

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

export function scorePaperSimilarity(
  workTitle: string,
  keywords: string,
  paperTitle: string,
  year?: number | null
): number {
  const workTokens = tokenize(`${workTitle} ${keywords}`);
  const paperTokens = tokenize(paperTitle);
  if (workTokens.size === 0 || paperTokens.size === 0) return 0;

  let overlap = 0;
  for (const t of workTokens) {
    if (paperTokens.has(t)) overlap += 1;
  }
  let score = overlap / Math.max(workTokens.size, paperTokens.size);

  const currentYear = new Date().getFullYear();
  if (year && year >= currentYear - 3) score += 0.05;
  if (year && year >= currentYear - 1) score += 0.05;

  return Math.min(1, Math.round(score * 100) / 100);
}

export function similarityBand(score: number): "high" | "medium" | "low" {
  if (score >= 0.5) return "high";
  if (score >= 0.25) return "medium";
  return "low";
}
