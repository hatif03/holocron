"use client";

import { useEffect, useState } from "react";
import { Settings, KeyRound, Save, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";

interface LlmConfig {
  provider: string;
  base_url: string;
  model: string;
  api_key_set: boolean;
  api_key_masked: string;
  mock_llm: boolean;
  providers: string[];
  defaults: Record<string, { base_url: string; model: string }>;
  error?: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  k2think: "K2 Think (recommended)",
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google Gemini",
  openrouter: "OpenRouter",
  custom: "Custom (OpenAI-compatible)",
};

const LOCAL_DEFAULTS: Record<string, { base_url: string; model: string }> = {
  k2think: {
    base_url: "https://www.k2think.ai/api",
    model: "MBZUAI-IFM/K2-Think-v2",
  },
  openai: { base_url: "https://api.openai.com/v1", model: "gpt-4o" },
  anthropic: {
    base_url: "https://api.anthropic.com",
    model: "claude-sonnet-4-20250514",
  },
  google: {
    base_url: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.0-flash",
  },
  openrouter: {
    base_url: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4o",
  },
  custom: { base_url: "http://localhost:11434/v1", model: "llama3.2" },
};

export default function SettingsPage() {
  const [config, setConfig] = useState<LlmConfig | null>(null);
  const [provider, setProvider] = useState("k2think");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const res = await fetch("/api/settings/llm");
      const data = (await res.json()) as LlmConfig & { error?: string };
      if (!res.ok) {
        setConfig({
          provider: data.provider || "k2think",
          providers: data.providers || Object.keys(PROVIDER_LABELS),
          mock_llm: true,
          api_key_set: false,
          api_key_masked: "(unavailable)",
          base_url: "",
          model: "",
          defaults: data.defaults || {},
          error: data.error || "Failed to load LLM settings",
        });
        setProvider(data.provider || "k2think");
        setBaseUrl("");
        setModel("");
        setApiKey("");
        setError(data.error || "Agents unavailable — settings cannot be loaded.");
        return;
      }
      setConfig(data);
      setProvider(data.provider || "k2think");
      setBaseUrl(data.base_url || "");
      setModel(data.model || "");
      setApiKey("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load LLM settings");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onProviderChange = (next: string) => {
    setProvider(next);
    const defaults = config?.defaults?.[next] || LOCAL_DEFAULTS[next];
    if (defaults) {
      setBaseUrl(defaults.base_url);
      setModel(defaults.model);
    } else {
      setBaseUrl("");
      setModel("");
    }
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const body: Record<string, string> = {
        provider,
        base_url: baseUrl,
        model,
      };
      if (apiKey.trim()) body.api_key = apiKey.trim();

      const res = await fetch("/api/settings/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Save failed");
      }
      setConfig(data);
      setApiKey("");
      setMessage("LLM settings saved. New generations will use this provider.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Settings"
        description="LLM provider and API keys"
        icon={Settings}
      />

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <CardTitle>LLM Provider</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Keys stay on your machine. Holocron never requires a cloud account.
                K2 Think is the default for demos.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
        {config && (
          <div className="flex flex-wrap gap-2">
            <Badge variant={config.mock_llm ? "warning" : "success"}>
              {config.mock_llm ? "Mock mode" : "Live key"}
            </Badge>
            {config.api_key_masked && (
              <Badge variant="default">Key {config.api_key_masked}</Badge>
            )}
            {config.error && <Badge variant="warning">Agents offline</Badge>}
          </div>
        )}

        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Provider</span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={provider}
              onChange={(e) => onProviderChange(e.target.value)}
            >
              {(config?.providers || Object.keys(PROVIDER_LABELS)).map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABELS[p] || p}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">API key</span>
            <Input
              type="password"
              placeholder={
                config?.api_key_set
                  ? "Leave blank to keep existing key"
                  : "Paste your API key"
              }
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Model</span>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Model id"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Base URL</span>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>
        </div>

        {message && (
          <p className="text-sm text-success flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {message}
          </p>
        )}
        {error && <p className="text-sm text-primary">{error}</p>}

        <Button onClick={save} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save"}
        </Button>
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        You can also configure providers from the CLI with{" "}
        <code className="font-mono text-sm">holocron setup</code>. Empty keys
        enable mock mode for local tours without an API key.
      </p>
    </div>
  );
}
