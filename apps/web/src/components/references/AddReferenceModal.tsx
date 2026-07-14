"use client";

import { useEffect, useState } from "react";
import type {
  PaperSearchResult,
  ReferenceAnalysis,
  ReferenceDraft,
} from "@holocron/shared";
import { Button } from "@/components/ui/button";
import { SimpleDialog } from "@/components/ui/simple-dialog";
import { Stepper } from "./Stepper";
import { FindPaperStep } from "./FindPaperStep";
import { ReviewAnalyzeStep } from "./ReviewAnalyzeStep";
import { BibTeXImportDialog } from "./BibTeXImportDialog";

const EMPTY_DRAFT: ReferenceDraft = {
  title: "",
  authors: "",
  year: null,
  doi: "",
  url: "",
  notes: "",
  bibtex: "",
  source: "manual",
};

interface AddReferenceModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editRef?: ReferenceDraft & { id: string };
}

export function AddReferenceModal({
  open,
  onClose,
  onSaved,
  editRef,
}: AddReferenceModalProps) {
  const [step, setStep] = useState(editRef ? 2 : 1);
  const [draft, setDraft] = useState<ReferenceDraft>(
    editRef || EMPTY_DRAFT
  );
  const [bibtexOpen, setBibtexOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editRef) {
      setDraft({
        title: editRef.title,
        authors: editRef.authors ?? "",
        year: editRef.year ?? null,
        doi: editRef.doi ?? "",
        url: editRef.url ?? "",
        notes: editRef.notes ?? "",
        bibtex: editRef.bibtex ?? "",
        source: editRef.source ?? "manual",
        s2_paper_id: editRef.s2_paper_id,
        pdf_storage_path: editRef.pdf_storage_path,
        analysis: editRef.analysis,
      });
      setStep(2);
    } else {
      setDraft(EMPTY_DRAFT);
      setStep(1);
    }
  }, [open, editRef]);

  const updateDraft = (patch: Partial<ReferenceDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  };

  const selectPaper = (paper: PaperSearchResult) => {
    updateDraft({
      title: paper.title,
      authors: paper.authors.join(", "),
      year: paper.year ?? null,
      url: paper.url || "",
      doi: paper.doi || "",
      notes: paper.abstract || "",
      source: paper.source,
      s2_paper_id: paper.source === "semantic_scholar" ? paper.id : undefined,
    });
    setStep(2);
  };

  const save = async () => {
    setSaving(true);
    const method = editRef ? "PATCH" : "POST";
    const url = editRef ? `/api/references/${editRef.id}` : "/api/references";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSaving(false);
    setDraft(EMPTY_DRAFT);
    setStep(1);
    onSaved();
    onClose();
  };

  const handleClose = () => {
    setDraft(EMPTY_DRAFT);
    setStep(1);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <SimpleDialog
        open={open}
        onClose={handleClose}
        title={editRef ? "Edit Reference" : "Add New Reference"}
      >
        <Stepper steps={["Find Paper", "Review & Analyze"]} current={editRef ? 2 : step} />

        {step === 1 && !editRef && (
          <FindPaperStep
            onSelect={selectPaper}
            onImportBibTeX={() => setBibtexOpen(true)}
          />
        )}

        {(step === 2 || editRef) && (
          <ReviewAnalyzeStep
            draft={draft}
            onChange={updateDraft}
            onAnalysis={(a: ReferenceAnalysis) => updateDraft({ analysis: a })}
          />
        )}

        <div className="flex justify-between gap-2 mt-6 pt-4 border-t border-border">
          <div>
            {step === 2 && !editRef && (
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back to Search
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {(step === 2 || editRef) && (
              <Button onClick={save} disabled={!draft.title.trim() || saving}>
                {editRef ? "Save Changes" : "Add Reference"}
              </Button>
            )}
          </div>
        </div>
      </SimpleDialog>

      <BibTeXImportDialog
        open={bibtexOpen}
        onClose={() => setBibtexOpen(false)}
        onImport={(parsed) => {
          updateDraft({
            title: parsed.title,
            authors: parsed.authors,
            year: parsed.year,
            doi: parsed.doi,
            url: parsed.url,
            bibtex: parsed.bibtex,
            source: "manual",
          });
          setStep(2);
        }}
      />
    </>
  );
}
