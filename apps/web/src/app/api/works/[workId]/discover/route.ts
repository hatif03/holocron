import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { searchSemanticScholar, searchArxiv } from "@/lib/agents-client";
import { scorePaperSimilarity } from "@/lib/discover-score";
import { buildWriteTrace } from "@/lib/memory-trace";
import { storeMemory, workTag } from "@/lib/supermemory-client";

const TOP_N = 12;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ workId: string }> }
) {
  try {
    const { workId } = await params;
    const db = getDb();
    const [work] = await db`SELECT * FROM research_works WHERE id = ${workId}::uuid`;
    if (!work) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [startNode] = await db`
      SELECT data FROM graph_nodes
      WHERE work_id = ${workId}::uuid AND type = 'start'
      LIMIT 1
    `;
    const startData = (startNode?.data ?? {}) as Record<string, unknown>;
    const paperTitle = String(startData.paper_title || work.title || "")
      .normalize("NFKD")
      .replace(/[^\x00-\x7F]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const keywords = String(startData.keywords || "").trim();
    let query = [paperTitle, keywords].filter(Boolean).join(" ").trim();
    if (!query) {
      return NextResponse.json(
        { error: "Add a paper title or keywords on the start node first." },
        { status: 400 }
      );
    }
    if (query.length > 220) query = query.slice(0, 220);

    let { data: raw } = await searchSemanticScholar(query, "all");
    if (raw.length === 0 && keywords) {
      ({ data: raw } = await searchSemanticScholar(keywords, "all"));
    }
    if (raw.length === 0 && paperTitle) {
      const shortTitle = paperTitle.split(":")[0]?.trim() || paperTitle;
      ({ data: raw } = await searchSemanticScholar(shortTitle, "title"));
    }
    if (raw.length === 0) {
      const arxivQuery =
        keywords || "CO2 emissions life expectancy climate health";
      ({ data: raw } = await searchArxiv(arxivQuery, "all"));
    }
    const ranked = raw
      .map((p) => ({
        ...p,
        similarityScore: scorePaperSimilarity(paperTitle, keywords, p.title, p.year),
      }))
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, TOP_N);

    const containerTag = workTag(workId);
    for (const paper of ranked) {
      const authors = Array.isArray(paper.authors) ? paper.authors.join(", ") : "";
      const content = [
        `Discovered paper: ${paper.title}`,
        authors ? `Authors: ${authors}` : "",
        paper.year ? `Year: ${paper.year}` : "",
        paper.abstract ? `Abstract: ${paper.abstract.slice(0, 400)}` : "",
        `Similarity: ${(paper.similarityScore * 100).toFixed(0)}%`,
      ]
        .filter(Boolean)
        .join("\n");

      await storeMemory({
        content,
        containerTag,
        customId: paper.id ? `discover_${paper.id}` : undefined,
        metadata: {
          type: "discovered_paper",
          similarityScore: paper.similarityScore,
          paperId: paper.id,
          title: paper.title.slice(0, 200),
        },
      });
    }

    const memoryTrace = buildWriteTrace(workId, "discover", { count: ranked.length });

    return NextResponse.json({
      papers: ranked,
      query,
      memoryTrace,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
