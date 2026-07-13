"use client";

import { useRef, useState } from "react";
import type { GeneratePaperConfig, MetadataPaperDraft } from "@holocron/shared";
import { metadataWizardSteps } from "@holocron/shared";
import { Dialog, Button, Input, Textarea, Switch } from "@/components/ui";
import { WizardStepper } from "./WizardStepper";
import { useRouter } from "next/navigation";

const DEFAULT_CONFIG: GeneratePaperConfig = {
  styleGuide: "Nature",
  targetPages: 10,
  enablePlanning: true,
  enableReviewLoop: true,
  maxReviewIterations: 3,
  pauseForFeedback: false,
  compilePdf: true,
};

const EMPTY_METADATA: MetadataPaperDraft = {
  title: "",
  idea: "",
  method: "",
  data: "",
  experiments: "",
  bibtex: "",
};

interface MetadataWizardProps {
  open: boolean;
  onClose: () => void;
}

export function MetadataWizard({ open, onClose }: MetadataWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [metadata, setMetadata] = useState<MetadataPaperDraft>(EMPTY_METADATA);
  const [config, setConfig] = useState<GeneratePaperConfig>(DEFAULT_CONFIG);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const importJson = () => {
    fileRef.current?.click();
  };

  const handleJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data.metadata) setMetadata({ ...EMPTY_METADATA, ...data.metadata });
        if (data.config) setConfig({ ...DEFAULT_CONFIG, ...data.config });
      } catch {
        /* ignore */
      }
    };
    reader.readAsText(file);
  };

  const canNext =
    step === 1
      ? metadata.idea && metadata.method && metadata.data && metadata.experiments
      : true;

  const submit = async () => {
    setSubmitting(true);
    const res = await fetch("/api/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "metadata", metadata, config, bibtex: metadata.bibtex }),
    });
    const data = await res.json();
    setSubmitting(false);
    onClose();
    setStep(1);
    setMetadata(EMPTY_METADATA);
    if (data.id) router.push(`/paper-generation/${data.id}`);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} title="Generate Paper from Metadata">
      <div className="flex justify-end -mt-2 mb-2">
        <Button size="sm" variant="outline" onClick={importJson}>
          Import JSON
        </Button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleJsonFile} />
      </div>

      <WizardStepper current={step} />

      {step === 1 && (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              placeholder="Paper title (optional)"
              value={metadata.title}
              onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
              className="mt-1"
            />
          </div>
          {(["idea", "method", "data", "experiments"] as const).map((field) => (
            <div key={field}>
              <label className="text-sm font-medium capitalize">
                {field === "idea" ? "Idea / Hypothesis" : field}{" "}
                <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder={
                  field === "idea"
                    ? "Describe your research idea or hypothesis..."
                    : field === "method"
                      ? "Describe your method or approach..."
                      : field === "data"
                        ? "Describe datasets, benchmarks, validation data..."
                        : "Describe experiment design, results, findings..."
                }
                value={metadata[field]}
                onChange={(e) => setMetadata({ ...metadata, [field]: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">BibTeX References</label>
            <Textarea
              value={metadata.bibtex}
              onChange={(e) => setMetadata({ ...metadata, bibtex: e.target.value })}
              placeholder="@article{...}"
              className="mt-1 font-mono text-xs"
              rows={6}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Style Guide</label>
            <select
              className="mt-1 w-full h-10 rounded-lg border border-border px-3 text-sm"
              value={config.styleGuide}
              onChange={(e) =>
                setConfig({ ...config, styleGuide: e.target.value as GeneratePaperConfig["styleGuide"] })
              }
            >
              <option value="Nature">Nature</option>
              <option value="IEEE">IEEE</option>
              <option value="ICML">ICML</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Target Pages</label>
            <Input
              type="number"
              value={config.targetPages}
              onChange={(e) =>
                setConfig({ ...config, targetPages: parseInt(e.target.value) || 10 })
              }
            />
          </div>
          <Switch
            label="Enable Planning"
            checked={config.enablePlanning}
            onChange={(v) => setConfig({ ...config, enablePlanning: v })}
          />
          <Switch
            label="Enable Review Loop"
            checked={config.enableReviewLoop}
            onChange={(v) => setConfig({ ...config, enableReviewLoop: v })}
          />
          <Switch
            label="Compile PDF"
            checked={config.compilePdf}
            onChange={(v) => setConfig({ ...config, compilePdf: v })}
          />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-2 text-sm">
          <p><strong>Title:</strong> {metadata.title || metadata.idea.slice(0, 60)}</p>
          <p><strong>Style:</strong> {config.styleGuide} · {config.targetPages} pages</p>
          <p className="text-muted-foreground line-clamp-3">{metadata.idea}</p>
        </div>
      )}

      <div className="flex justify-between mt-6 pt-4 border-t border-border">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <div className="flex gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < metadataWizardSteps.length ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
              Next
            </Button>
          ) : (
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Starting..." : "Generate Paper"}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
