"use client";

import { useCallback, useEffect, useState } from "react";
import { GenerationHeader } from "@/components/paper-generation/detail/GenerationHeader";
import { ProcessLogPanel, type LogEvent } from "@/components/paper-generation/detail/ProcessLogPanel";
import { ExplorerPanel, type FileNode } from "@/components/paper-generation/detail/ExplorerPanel";
import { DetailPanel } from "@/components/paper-generation/detail/DetailPanel";

export default function PaperGenerationDetailPage({
  params,
}: {
  params: Promise<{ genId: string }>;
}) {
  const [genId, setGenId] = useState("");
  const [gen, setGen] = useState<Record<string, unknown> | null>(null);
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<{
    content: string;
    words: number;
    path: string;
  } | null>(null);
  const [detailMode, setDetailMode] = useState<"search" | "file" | "pdf" | null>(null);

  useEffect(() => {
    params.then((p) => setGenId(p.genId));
  }, [params]);

  const load = useCallback(async () => {
    if (!genId) return;
    const res = await fetch(`/api/generations/${genId}`);
    const json = await res.json();
    setGen(json.generation);
    setEvents(json.events || []);
    setFileTree(json.fileTree || []);
  }, [genId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [load]);

  const selectEvent = (index: number) => {
    setSelectedEventIndex(index);
    setSelectedFile(null);
    setFileContent(null);
    const ev = events[index];
    if (ev?.metadata?.search_query || ev?.event_type === "search") {
      setDetailMode("search");
    }
  };

  const selectFile = async (path: string) => {
    setSelectedEventIndex(null);
    setSelectedFile(path);
    if (path.endsWith(".pdf")) {
      setDetailMode("pdf");
      setFileContent(null);
      return;
    }
    const res = await fetch(`/api/generations/${genId}?file=${encodeURIComponent(path)}`);
    const data = await res.json();
    setFileContent(data);
    setDetailMode("file");
  };

  const pdfUrl =
    gen?.pdf_path && genId
      ? `/api/works/files?path=${encodeURIComponent(
          String(gen.pdf_path).includes("generations/")
            ? String(gen.pdf_path).replace(/^.*storage[\\/]/, "").replace(/\\/g, "/")
            : `generations/${genId}/main.pdf`
        )}`
      : null;

  const cancel = async () => {
    await fetch(`/api/generations/${genId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    load();
  };

  if (!gen) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6">
      <GenerationHeader gen={gen} genId={genId} onCancel={cancel} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ProcessLogPanel
          events={events}
          selectedEventIndex={selectedEventIndex}
          onSelectEvent={selectEvent}
        />
        <ExplorerPanel
          fileTree={fileTree}
          selectedPath={selectedFile}
          onSelectFile={selectFile}
        />
        <DetailPanel
          mode={detailMode}
          event={selectedEventIndex != null ? events[selectedEventIndex] : null}
          fileContent={fileContent}
          pdfUrl={pdfUrl}
          onClose={() => {
            setDetailMode(null);
            setSelectedEventIndex(null);
            setSelectedFile(null);
          }}
        />
      </div>
    </div>
  );
}
