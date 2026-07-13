"use client";

import { useState } from "react";
import { Dialog, Button, Textarea } from "@/components/ui";

interface BibTeXImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (parsed: {
    title: string;
    authors: string;
    year: number | null;
    doi: string;
    url: string;
    bibtex: string;
  }) => void;
}

export function BibTeXImportDialog({ open, onClose, onImport }: BibTeXImportDialogProps) {
  const [bibtex, setBibtex] = useState("");
  const [error, setError] = useState("");

  const importBib = async () => {
    setError("");
    const res = await fetch("/api/references/import-bibtex", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bibtex }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to parse BibTeX");
      return;
    }
    onImport(data);
    setBibtex("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Import BibTeX">
      <Textarea
        value={bibtex}
        onChange={(e) => setBibtex(e.target.value)}
        placeholder="@article{...}"
        rows={8}
        className="font-mono text-xs"
      />
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={importBib} disabled={!bibtex.trim()}>
          Import
        </Button>
      </div>
    </Dialog>
  );
}
