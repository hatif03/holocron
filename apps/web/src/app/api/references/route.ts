import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const LOCAL_USER = "00000000-0000-0000-0000-000000000001";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("search") || "";
    const db = getDb();
    const rows = search
      ? await db`
          SELECT * FROM references_lib
          WHERE user_id = ${LOCAL_USER}::uuid AND title ILIKE ${"%" + search + "%"}
          ORDER BY created_at DESC
        `
      : await db`
          SELECT * FROM references_lib
          WHERE user_id = ${LOCAL_USER}::uuid
          ORDER BY created_at DESC
        `;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();
    const [ref] = await db`
      INSERT INTO references_lib (user_id, title, authors, year, bibtex, s2_paper_id, analysis)
      VALUES (
        ${LOCAL_USER}::uuid, ${body.title}, ${body.authors || ""},
        ${body.year || null}, ${body.bibtex || ""}, ${body.s2_paper_id || null},
        ${JSON.stringify(body.analysis || {})}::jsonb
      )
      RETURNING *
    `;
    return NextResponse.json(ref);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
