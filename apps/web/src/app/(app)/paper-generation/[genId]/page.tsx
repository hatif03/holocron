"use client";

import { useCallback, useEffect, useState } from "react";
import { GenerationHeader } from "@/components/paper-generation/detail/GenerationHeader";
import { ProcessLogPanel, type LogEvent } from "@/components/paper-generation/detail/ProcessLogPanel";
import { ExplorerPanel, type FileNode } from "@/components/paper-generation/detail/ExplorerPanel";
import {
  DetailPanel,
  type CitationsSummary,
} from "@/components/paper-generation/detail/DetailPanel";
import { SupermemoryContext } from "@/components/paper-generation/detail/SupermemoryContext";
import { PageScroll } from "@/components/layout/page-scroll";
import { generationFilesUrl, generationFileUrl } from "@/lib/storage-utils";
import { isImagePath, isTextPreviewPath } from "@/lib/file-mime";
import { parseBibtex, extractCiteKeys } from "@/lib/bib-utils";

type DetailMode =
  | "search"
  | "file"
  | "pdf"
  | "memory"
  | "citations"
  | "citations_verify"
  | "image"
  | null;

const TERMINAL = new Set(["completed", "completed_with_warnings", "failed", "cancelled"]);

function collectTexPaths(nodes: FileNode[]): string[] {
  const paths: string[] = [];
  for (const n of nodes) {
    if (n.type === "file" && n.path.endsWith(".tex")) paths.push(n.path);
    if (n.children) paths.push(...collectTexPaths(n.children));
  }
  return paths;
}

function collectFigurePaths(nodes: FileNode[]): string[] {
  const paths: string[] = [];
  for (const n of nodes) {
    if (n.type === "file" && isImagePath(n.path)) paths.push(n.path);
    if (n.children) paths.push(...collectFigurePaths(n.children));
  }
  return paths;
}

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
  const [agentsReachable, setAgentsReachable] = useState(true);
  const [detailMode, setDetailMode] = useState<DetailMode>(null);
  const [citations, setCitations] = useState<CitationsSummary | null>(null);

  useEffect(() => {
    params.then((p) => setGenId(p.genId));
  }, [params]);

  const status = String(gen?.status || "");
  const isRunning = status === "running" || status === "pending";
  const isTerminal = TERMINAL.has(status);

  const load = useCallback(async () => {
    if (!genId) return;
    const res = await fetch(`/api/generations/${genId}`);
    const json = await res.json();
    setGen(json.generation);
    setEvents(json.events || []);
    setFileTree(json.fileTree || []);
    setAgentsReachable(json.agentsReachable !== false);
  }, [genId]);

  useEffect(() => {
    load();
    const ms = isRunning ? 2000 : isTerminal ? 0 : 5000;
    if (isTerminal) return;
    const interval = setInterval(load, ms || 5000);
    return () => clearInterval(interval);
  }, [load, isRunning, isTerminal]);

  const loadCitations = useCallback(async () => {
    if (!genId) return;
    let bibContent = "";
    try {
      const bibRes = await fetch(`/api/generations/${genId}?file=${encodeURIComponent("references.bib")}`);
      if (bibRes.ok) {
        const bibData = await bibRes.json();
        bibContent = bibData.content || "";
      }
    } catch {
      /* no bib yet */
    }

    const entries = parseBibtex(bibContent);
    const bibKeys = new Set(entries.map((e) => e.key));
    const texPaths = collectTexPaths(fileTree);
    const usedKeys = new Set<string>();
    await Promise.all(
      texPaths.map(async (texPath) => {
        try {
          const res = await fetch(`/api/generations/${genId}?file=${encodeURIComponent(texPath)}`);
          if (res.ok) {
            const data = await res.json();
            for (const k of extractCiteKeys(data.content || "")) usedKeys.add(k);
          }
        } catch {
          /* skip */
        }
      })
    );
    const used = [...usedKeys];
    setCitations({
      entries,
      usedKeys: used,
      missingKeys: used.filter((k) => !bibKeys.has(k)),
      figurePaths: collectFigurePaths(fileTree),
    });
    setDetailMode("citations");
    setSelectedEventIndex(null);
    setSelectedFile(null);
    setFileContent(null);
  }, [genId, fileTree]);

  const selectEvent = async (index: number) => {
    setSelectedEventIndex(index);
    setSelectedFile(null);
    setFileContent(null);
    setMemoryResults([]);
    const ev = events[index];
    if (!ev) return;

    if (ev.agent === "CitationVerifier") {
      setDetailMode("citations_verify");
      return;
    }

    if (ev.event_type === "memory") {
      setDetailMode("memory");
      const q = String(ev.metadata?.query || "");
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

    if (isImagePath(path)) {
      setDetailMode("image");
      setFileContent({ content: "", words: 0, path });
      return;
    }

    if (isTextPreviewPath(path)) {
      const res = await fetch(`/api/generations/${genId}?file=${encodeURIComponent(path)}`);
      const data = await res.json();
      setFileContent(data);
      setDetailMode("file");
      return;
    }

    setDetailMode("file");
    setFileContent({ content: "(Binary file — open via Explorer download)", words: 0, path });
  };

  const headerPdfUrl = genId ? generationFilesUrl(genId, gen?.pdf_path as string | null) : null;
  const pdfUrl =
    selectedFile?.endsWith(".pdf") && genId
      ? generationFileUrl(genId, selectedFile)
      : headerPdfUrl;
  const imageUrl =
    selectedFile && genId && detailMode === "image"
      ? generationFileUrl(genId, selectedFile)
      : null;

  const cancel = async () => {
    await fetch(`/api/generations/${genId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    load();
  };

  const phaseQuery = (() => {
    const last = events[events.length - 1];
    if (!last) return String(gen?.title || "");
    const section = String(last.metadata?.section || "");
    const phase = String(last.metadata?.phase || "");
    return section || phase || String(gen?.title || "");
  })();

  if (!gen) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-4 pt-4 sm:px-6">
        <GenerationHeader
          gen={gen}
          genId={genId}
          onCancel={cancel}
          onViewCitations={loadCitations}
        />
      </div>

      <PageScroll contentClassName="px-4 pb-4 sm:px-6">
        <SupermemoryContext
          genId={genId}
          workId={gen.work_id as string | undefined}
          title={String(gen.title || "")}
          isRunning={isRunning}
          phaseQuery={phaseQuery}
          events={events}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1.2fr] lg:min-h-[480px] lg:max-h-[calc(100vh-12rem)]">
          <ProcessLogPanel
            events={events}
            selectedEventIndex={selectedEventIndex}
            onSelectEvent={selectEvent}
            isRunning={isRunning}
            generationStatus={status}
            agentsReachable={agentsReachable}
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
            imageUrl={imageUrl}
            citations={citations}
            memoryResults={memoryResults}
            onClose={() => {
              setDetailMode(null);
              setSelectedEventIndex(null);
              setSelectedFile(null);
              setMemoryResults([]);
              setCitations(null);
            }}
          />
        </div>
      </PageScroll>
    </div>
  );
}
