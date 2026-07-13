import { NextRequest, NextResponse } from "next/server";
import { parseBibTeX } from "@/lib/bibtex";

export async function POST(req: NextRequest) {
  try {
    const { bibtex } = await req.json();
    if (!bibtex?.trim()) {
      return NextResponse.json({ error: "No BibTeX provided" }, { status: 400 });
    }
    const parsed = parseBibTeX(bibtex);
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
