import { NextResponse } from "next/server";
import { fetchAgentsHealth } from "@/lib/agents-client";

export async function GET() {
  try {
    const health = await fetchAgentsHealth();
    return NextResponse.json({
      status: health.status,
      supermemory: health.supermemory,
    });
  } catch {
    return NextResponse.json({ status: "offline", supermemory: "unreachable" });
  }
}
