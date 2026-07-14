"use client";

import { useCallback, useState } from "react";
import { Upload, FileIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  workId: string;
  value: string;
  fileUrl?: string;
  accept?: string;
  placeholder?: string;
  onChange: (path: string, url?: string) => void;
  compact?: boolean;
}

export function FileDropzone({
  workId,
  value,
  fileUrl,
  accept,
  placeholder,
  onChange,
  compact = false,
}: FileDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`/api/works/${workId}/upload`, {
          method: "POST",
          body: form,
        });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        onChange(data.path, data.url);
      } catch {
        /* ignore */
      } finally {
        setUploading(false);
      }
    },
    [workId, onChange]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) upload(file);
    },
    [upload]
  );

  if (value) {
    const name = value.split("/").pop() || value;
    const href = fileUrl || `/api/works/files?path=${encodeURIComponent(value)}`;
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded border border-border bg-muted/40 px-2 py-1.5",
          compact ? "text-[10px]" : "text-xs"
        )}
      >
        <FileIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="truncate flex-1">{name}</span>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          Open
        </a>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onChange("");
          }}
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={cn(
        "relative rounded border border-dashed border-border bg-muted/20 text-center transition-colors",
        dragOver && "border-primary bg-primary/5",
        compact ? "px-2 py-2" : "px-3 py-3"
      )}
    >
      <input
        type="file"
        accept={accept}
        className="absolute inset-0 opacity-0 cursor-pointer"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />
      {uploading ? (
        <Loader2 className="h-4 w-4 mx-auto animate-spin text-muted-foreground" />
      ) : (
        <>
          <Upload className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <p className={cn("text-muted-foreground", compact ? "text-[9px]" : "text-[10px]")}>
            {placeholder || "Click or drag file to upload"}
          </p>
          {accept && (
            <p className={cn("text-muted-foreground/70 mt-0.5", compact ? "text-[8px]" : "text-[9px]")}>
              {accept}
            </p>
          )}
        </>
      )}
    </div>
  );
}
