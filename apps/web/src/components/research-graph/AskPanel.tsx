"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pushMemoryTrace } from "@/lib/memory-trace";
import { workTag } from "@holocron/shared";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  recalled?: number;
}

export function AskPanel({ workId }: { workId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedTrace, setExpandedTrace] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await fetch(`/api/works/${workId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ask failed");
      if (data.memoryTrace?.read) pushMemoryTrace(data.memoryTrace.read);
      if (data.memoryTrace?.write) pushMemoryTrace(data.memoryTrace.write);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.answer,
          recalled: data.recalled,
        },
      ]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Error: ${String(e)}` },
      ]);
    } finally {
      setLoading(false);
    }
  }, [workId, input, loading, messages]);

  return (
    <div className="flex flex-col h-full min-h-[280px]">
      <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
        Ask about citations and research context. Answers use memories from{" "}
        <code className="text-[10px] bg-muted px-1 rounded">{workTag(workId)}</code>.
      </p>

      <div className="flex-1 overflow-y-auto space-y-2 mb-2 min-h-[160px]">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-4 text-center">
            Try: &quot;What papers are most relevant to our topic?&quot;
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={
              msg.role === "user"
                ? "ml-4 rounded bg-primary/10 p-2 text-[11px]"
                : "mr-2 rounded border border-border bg-muted/30 p-2 text-[11px]"
            }
          >
            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            {msg.role === "assistant" && msg.recalled != null && msg.recalled > 0 && (
              <button
                type="button"
                onClick={() => setExpandedTrace(expandedTrace === i ? null : i)}
                className="mt-1.5 text-[10px] text-muted-foreground hover:text-foreground"
              >
                Recalled {msg.recalled} memories from {workTag(workId)}
                {expandedTrace === i ? " ▾" : " ▸"}
              </button>
            )}
            {expandedTrace === i && (
              <p className="mt-1 text-[10px] font-mono text-muted-foreground">
                read · profile+search · {workTag(workId)}
              </p>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-1 shrink-0">
        <Input
          placeholder="Ask about your research…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          className="h-8 text-xs"
          disabled={loading}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={send}
          disabled={loading || !input.trim()}
          className="shrink-0 h-8 px-2"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
