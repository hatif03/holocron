"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bot,
  BookOpen,
  Box,
  Loader2,
  Network,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ServiceBadge } from "@/components/setup/ServiceBadge";

const STORAGE_KEY = "holocron_onboarding_v1";

type SetupStatus = {
  agents: boolean;
  supermemory: boolean;
  latex: boolean;
  database: boolean;
  mockLlm: boolean;
  hasDemoWorks: boolean;
  onboardingComplete?: boolean;
};

const STEPS = [
  { id: "welcome", title: "Welcome to Holocron" },
  { id: "services", title: "Check services" },
  { id: "llm", title: "Configure LLM" },
  { id: "optional", title: "Optional keys" },
  { id: "demo", title: "Load demo data" },
  { id: "tour", title: "Feature tour" },
  { id: "done", title: "Ready to research" },
];

const TOUR_LINKS = [
  { href: "/research-graph", label: "Research Graph", icon: Network },
  { href: "/references", label: "References", icon: BookOpen },
  { href: "/paper-generation", label: "Paper Generation", icon: Box },
  { href: "/agents", label: "Agents", icon: Bot },
];

export function SetupWalkthrough() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [k2Key, setK2Key] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/setup/status");
      if (res.ok) setStatus(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const force = searchParams.get("onboarding") === "1";
    const done = localStorage.getItem(STORAGE_KEY) === "complete";
    if (force || !done) {
      setOpen(true);
      loadStatus();
    }
  }, [searchParams, loadStatus]);

  const complete = async () => {
    localStorage.setItem(STORAGE_KEY, "complete");
    await fetch("/api/settings/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboardingComplete: true }),
    });
    setOpen(false);
    router.replace("/research-graph");
  };

  const saveK2Key = async () => {
    if (!k2Key.trim()) return;
    await fetch("/api/settings/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "k2think",
        api_key: k2Key.trim(),
        model: "MBZUAI-IFM/K2-Think-v2",
      }),
    });
    setK2Key("");
    await loadStatus();
  };

  const loadDemo = async () => {
    setSeeding(true);
    setSeedMsg(null);
    try {
      const res = await fetch("/api/setup/seed", { method: "POST" });
      const data = await res.json();
      setSeedMsg(data.ok ? data.message : data.error);
      await loadStatus();
    } catch (e) {
      setSeedMsg(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  };

  if (!open) return null;

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-background p-6 shadow-xl">
        <button
          type="button"
          className="absolute right-3 top-3 rounded p-1 text-muted-foreground hover:bg-muted"
          onClick={() => setOpen(false)}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-xs text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 className="mt-1 text-lg font-semibold">{current.title}</h2>

        <div className="mt-4 space-y-4 text-sm">
          {current.id === "welcome" && (
            <p className="text-muted-foreground">
              Holocron runs entirely on your machine. Research graphs, references,
              paper generations, and API keys stay local — nothing is sent to a
              Holocron cloud.
            </p>
          )}

          {current.id === "services" && (
            <div className="space-y-2 rounded-lg border p-4">
              <ServiceBadge status={status?.database ? "ok" : "down"} label="Database (Postgres)" />
              <ServiceBadge status={status?.agents ? "ok" : "down"} label="Agents service (:8000)" />
              <ServiceBadge status={status?.supermemory ? "ok" : "down"} label="Supermemory Local (:6767)" />
              <ServiceBadge status={status?.latex ? "ok" : "down"} label="LaTeX service (:8081)" />
              {!status && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking…
                </p>
              )}
            </div>
          )}

          {current.id === "llm" && (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                <strong className="text-foreground">K2 Think</strong> is recommended
                for paper generation. Paste your key below, or skip to use mock mode
                for a UI tour.
              </p>
              {status?.mockLlm === false && (
                <p className="text-green-700">Live LLM key configured.</p>
              )}
              <Input
                type="password"
                placeholder="K2 Think API key (optional)"
                value={k2Key}
                onChange={(e) => setK2Key(e.target.value)}
              />
              <Button size="sm" onClick={saveK2Key} disabled={!k2Key.trim()}>
                Save K2 key
              </Button>
              <p className="text-xs text-muted-foreground">
                Or configure any provider in{" "}
                <Link href="/settings" className="underline">
                  Settings
                </Link>
                .
              </p>
            </div>
          )}

          {current.id === "optional" && (
            <p className="text-muted-foreground">
              Optional: add a Semantic Scholar key in Settings for richer literature
              search. Supermemory works out of the box when the local service is
              running. You can configure these anytime.
            </p>
          )}

          {current.id === "demo" && (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Load three demo research graphs with references, figures, and filled
                node fields.
              </p>
              {status?.hasDemoWorks && (
                <p className="text-green-700">Demo works already present.</p>
              )}
              <Button size="sm" onClick={loadDemo} disabled={seeding}>
                {seeding ? "Loading…" : "Load demo research graphs"}
              </Button>
              {seedMsg && <p className="text-xs">{seedMsg}</p>}
            </div>
          )}

          {current.id === "tour" && (
            <div className="grid gap-2">
              {TOUR_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>
          )}

          {current.id === "done" && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Open a research graph and use <strong>Generate Paper</strong> on the
                end node to run the multi-agent pipeline.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button size="sm" onClick={() => setStep((s) => s + 1)}>
              Next
            </Button>
          ) : (
            <Button size="sm" onClick={complete}>
              Finish setup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function restartOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
  window.location.href = "/?onboarding=1";
}
