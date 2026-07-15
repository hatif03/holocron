import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { completeChat } from "@/lib/agents-client";
import { buildReadTrace, buildWriteTrace } from "@/lib/memory-trace";
import {
  profileForWorkRich,
  searchMemoriesRich,
  storeMemory,
  workTag,
} from "@/lib/supermemory-client";

const SYSTEM_GUARDRAIL = `You are a research citation assistant for an academic paper project.
Answer only questions about the project's research, citations, methods, and related literature.
If the user asks something off-topic, politely redirect them to research questions.
Use the recalled memories below as ground truth. Cite paper titles when relevant.`;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workId: string }> }
) {
  try {
    const { workId } = await params;
    const { message, history = [] } = await req.json();
    const prompt = String(message || "").trim();
    if (!prompt) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const db = getDb();
    const [work] = await db`SELECT title FROM research_works WHERE id = ${workId}::uuid`;
    if (!work) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { profile, hits: profileHits } = await profileForWorkRich(workId, prompt);
    const searchHits = await searchMemoriesRich(workId, prompt, 8);
    const recalled = [...profileHits, ...searchHits].filter(
      (h, i, arr) => arr.findIndex((x) => x.text === h.text) === i
    );

    const memoryBlock = [
      `Project: ${work.title}`,
      profile.static.length ? `Static profile:\n${profile.static.join("\n")}` : "",
      profile.dynamic.length ? `Dynamic profile:\n${profile.dynamic.join("\n")}` : "",
      recalled.length
        ? `Recalled memories:\n${recalled.map((h) => `- ${h.text.slice(0, 500)}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const historyText = (history as { role: string; content: string }[])
      .slice(-6)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const system = `${SYSTEM_GUARDRAIL}\n\n${memoryBlock}`;
    const user = historyText ? `${historyText}\nuser: ${prompt}` : prompt;

    const answer = await completeChat(system, user);

    const containerTag = workTag(workId);
    await storeMemory({
      content: `Q: ${prompt}\nA: ${answer}`,
      containerTag,
      metadata: { type: "ask", role: "exchange" },
    });
    await storeMemory({
      content: prompt,
      containerTag,
      metadata: { type: "ask", role: "user" },
    });
    await storeMemory({
      content: answer,
      containerTag,
      metadata: { type: "ask", role: "assistant" },
    });

    const readTrace = buildReadTrace(workId, "ask", {
      query: prompt,
      count: recalled.length,
    });
    const writeTrace = buildWriteTrace(workId, "ask", { count: 3 });

    return NextResponse.json({
      answer,
      recalled: recalled.length,
      memoryTrace: {
        read: readTrace,
        write: writeTrace,
        containerTag,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
