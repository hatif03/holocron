"use client";



import { useCallback, useEffect, useState } from "react";

import { GenerationHeader } from "@/components/paper-generation/detail/GenerationHeader";

import { ProcessLogPanel, type LogEvent } from "@/components/paper-generation/detail/ProcessLogPanel";

import { ExplorerPanel, type FileNode } from "@/components/paper-generation/detail/ExplorerPanel";

import { DetailPanel } from "@/components/paper-generation/detail/DetailPanel";

import { SupermemoryContext } from "@/components/paper-generation/detail/SupermemoryContext";

import { generationFilesUrl, generationFileUrl } from "@/lib/storage-utils";



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

  const [memoryResults, setMemoryResults] = useState<string[]>([]);

  const [detailMode, setDetailMode] = useState<"search" | "file" | "pdf" | "memory" | null>(null);



  useEffect(() => {

    params.then((p) => setGenId(p.genId));

  }, [params]);



  const isRunning =

    String(gen?.status || "") === "running" || String(gen?.status || "") === "pending";



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

    const ms = isRunning ? 2000 : 5000;

    const interval = setInterval(load, ms);

    return () => clearInterval(interval);

  }, [load, isRunning]);



  const selectEvent = async (index: number) => {

    setSelectedEventIndex(index);

    setSelectedFile(null);

    setFileContent(null);

    setMemoryResults([]);

    const ev = events[index];

    if (!ev) return;



    if (ev.event_type === "memory") {

      setDetailMode("memory");

      const section = String(ev.metadata?.section || "");

      const q = section || String(gen?.title || "plan");

      try {

        const res = await fetch(`/api/generations/${genId}/memory?q=${encodeURIComponent(q)}`);

        const data = await res.json();

        setMemoryResults(data.results || []);

      } catch {

        setMemoryResults([]);

      }

    } else if (

      ev.metadata?.discovered_refs ||

      ev.metadata?.search_query ||

      ev.event_type === "search" ||

      ev.event_type === "found"

    ) {

      setDetailMode("search");

    }

  };



  const selectFile = async (path: string) => {

    setSelectedEventIndex(null);

    setSelectedFile(path);

    setMemoryResults([]);

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



  const headerPdfUrl = genId ? generationFilesUrl(genId, gen?.pdf_path as string | null) : null;
  const pdfUrl =
    selectedFile?.endsWith(".pdf") && genId
      ? generationFileUrl(genId, selectedFile)
      : headerPdfUrl;



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

    <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1600px] flex-col px-4 py-4 sm:px-6">

      <GenerationHeader gen={gen} genId={genId} onCancel={cancel} />

      <SupermemoryContext

        genId={genId}

        workId={gen.work_id as string | undefined}

        title={String(gen.title || "")}

        isRunning={isRunning}

      />



      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">

        <ProcessLogPanel

          events={events}

          selectedEventIndex={selectedEventIndex}

          onSelectEvent={selectEvent}

          isRunning={isRunning}

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

          memoryResults={memoryResults}

          onClose={() => {

            setDetailMode(null);

            setSelectedEventIndex(null);

            setSelectedFile(null);

            setMemoryResults([]);

          }}

        />

      </div>

    </div>

  );

}

