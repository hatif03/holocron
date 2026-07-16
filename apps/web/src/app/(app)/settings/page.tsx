"use client";



import { useEffect, useState } from "react";

import {

  Settings,

  KeyRound,

  Save,

  Sparkles,

  HardDrive,

  RotateCcw,

} from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import { PageHeader } from "@/components/layout/page-header";
import { ScrollArea } from "@/components/ui/scroll-area";

import { DependenciesPanel } from "@/components/setup/DependenciesPanel";

import { SettingsSkeleton } from "@/components/ui/settings-skeleton";

import { restartOnboarding } from "@/components/onboarding/SetupWalkthrough";



interface LlmConfig {

  provider: string;

  base_url: string;

  model: string;

  api_key_set: boolean;

  api_key_masked: string;

  mock_llm: boolean;

  providers: string[];

  defaults: Record<string, { base_url: string; model: string }>;

  model_options?: Record<string, string[]>;

  recommended_provider?: string;

  keys_set?: Record<string, boolean>;

  keys_masked?: Record<string, string>;

  error?: string;

}



interface AppKeys {

  semanticScholarApiKeySet: boolean;

  semanticScholarApiKeyMasked: string;

  supermemoryApiKeySet: boolean;

  supermemoryApiKeyMasked: string;

}



interface StorageInfo {
  storagePath: string;
  worksFormatted: string;
  generationsFormatted: string;
  uploadsFormatted: string;
  referencesFormatted?: string;
  totalFormatted: string;
  generationCount?: number;
  persisted?: boolean;
  message?: string;
}



const PROVIDER_LABELS: Record<string, string> = {

  k2think: "K2 Think (recommended)",

  groq: "Groq",

  openai: "OpenAI",

  anthropic: "Anthropic",

  google: "Google Gemini",

  openrouter: "OpenRouter",

  custom: "Custom (OpenAI-compatible)",

};



const KEY_PROVIDERS = ["k2think", "groq", "openai", "anthropic", "google", "openrouter"] as const;



const LOCAL_DEFAULTS: Record<string, { base_url: string; model: string }> = {

  k2think: {
    base_url: "https://api.k2think.ai/v1",
    model: "MBZUAI-IFM/K2-Think-v2",
  },

  groq: { base_url: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },

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



const MODEL_OPTIONS: Record<string, string[]> = {

  k2think: ["MBZUAI-IFM/K2-Think-v2"],

  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],

  openai: ["gpt-4o", "gpt-4o-mini", "o3-mini"],

  anthropic: ["claude-sonnet-4-20250514", "claude-haiku-3-5"],

  google: ["gemini-2.0-flash", "gemini-2.0-pro"],

  openrouter: ["openai/gpt-4o", "anthropic/claude-sonnet-4"],

  custom: [],

};



export default function SettingsPage() {

  const [config, setConfig] = useState<LlmConfig | null>(null);

  const [provider, setProvider] = useState("k2think");

  const [apiKey, setApiKey] = useState("");

  const [baseUrl, setBaseUrl] = useState("");

  const [model, setModel] = useState("");

  const [providerKeys, setProviderKeys] = useState<Record<string, string>>({});

  const [appKeys, setAppKeys] = useState<AppKeys | null>(null);

  const [ssKey, setSsKey] = useState("");

  const [smKey, setSmKey] = useState("");

  const [storage, setStorage] = useState<StorageInfo | null>(null);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);



  const load = async () => {

    setError(null);

    try {

      const [llmRes, keysRes, storageRes] = await Promise.all([

        fetch("/api/settings/llm"),

        fetch("/api/settings/keys"),

        fetch("/api/setup/storage"),

      ]);

      const data = (await llmRes.json()) as LlmConfig & { error?: string };

      if (!llmRes.ok) {

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

        setError(data.error || "Agents unavailable — settings cannot be loaded.");

      } else {

        setConfig(data);

        setProvider(data.provider || "k2think");

        setBaseUrl(data.base_url || "");

        setModel(data.model || "");

      }

      setApiKey("");

      if (keysRes.ok) setAppKeys(await keysRes.json());

      if (storageRes.ok) setStorage(await storageRes.json());

    } catch (e) {

      setError(e instanceof Error ? e.message : "Failed to load settings");

    }

  };



  useEffect(() => {

    load();

  }, []);



  const modelOptions =

    config?.model_options?.[provider] || MODEL_OPTIONS[provider] || [];



  const onProviderChange = (next: string) => {

    setProvider(next);

    const defaults = config?.defaults?.[next] || LOCAL_DEFAULTS[next];

    if (defaults) {

      setBaseUrl(defaults.base_url);

      setModel(defaults.model);

    }

  };



  const save = async () => {

    setSaving(true);

    setMessage(null);

    setError(null);

    try {

      const body: Record<string, unknown> = {

        provider,

        base_url: baseUrl,

        model,

      };

      if (apiKey.trim()) body.api_key = apiKey.trim();



      const keysPayload: Record<string, string> = {};

      for (const [p, k] of Object.entries(providerKeys)) {

        if (k.trim()) keysPayload[p] = k.trim();

      }

      if (Object.keys(keysPayload).length) body.keys = keysPayload;



      const res = await fetch("/api/settings/llm", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify(body),

      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Save failed");

      setConfig(data);

      setApiKey("");

      setProviderKeys({});

      setMessage("LLM settings saved.");

    } catch (e) {

      setError(e instanceof Error ? e.message : "Save failed");

    } finally {

      setSaving(false);

    }

  };



  const saveAppKeys = async () => {

    const body: Record<string, string> = {};

    if (ssKey.trim()) body.semanticScholarApiKey = ssKey.trim();

    if (smKey.trim()) body.supermemoryApiKey = smKey.trim();

    if (!Object.keys(body).length) return;

    const res = await fetch("/api/settings/keys", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify(body),

    });

    if (res.ok) {

      setSsKey("");

      setSmKey("");

      setAppKeys(await res.json());

      setMessage("Optional keys saved locally.");

    }

  };



  const clearGenerations = async () => {

    if (!confirm("Delete all generated paper artifacts? Works and settings are kept.")) return;

    await fetch("/api/setup/storage?target=generations", { method: "DELETE" });

    await load();

    setMessage("Generation cache cleared.");

  };



  return (

    <div className="flex h-full min-h-0 flex-col">
      {!config ? (
        <SettingsSkeleton />
      ) : (
      <ScrollArea className="flex-1 min-h-0">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">

      <PageHeader

        title="Settings"

        description="LLM provider, API keys, and local storage"

        icon={Settings}

      />



      <div className="mb-6">

        <DependenciesPanel />

      </div>



      <Card>

        <CardHeader className="border-b">

          <div className="flex items-start gap-3">

            <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

            <div>

              <CardTitle>LLM Provider</CardTitle>

              <p className="mt-1 text-sm text-muted-foreground">

                K2 Think is recommended for Holocron paper generation. Choose any

                provider below — keys are stored locally on your machine.

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

                <Badge variant="default">Active {config.api_key_masked}</Badge>

              )}

              {config.error && <Badge variant="warning">Agents offline</Badge>}

            </div>

          )}



          <label className="block space-y-1.5">

            <span className="text-sm font-medium">Active provider</span>

            <select

              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"

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

            <span className="text-sm font-medium">Model</span>

            {modelOptions.length > 0 ? (

              <select

                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"

                value={model}

                onChange={(e) => setModel(e.target.value)}

              >

                {modelOptions.map((m) => (

                  <option key={m} value={m}>

                    {m}

                  </option>

                ))}

              </select>

            ) : (

              <Input value={model} onChange={(e) => setModel(e.target.value)} />

            )}

          </label>



          <label className="block space-y-1.5">

            <span className="text-sm font-medium">API key (active provider)</span>

            <Input

              type="password"

              placeholder={

                config?.api_key_set ? "Leave blank to keep existing" : "Paste API key"

              }

              value={apiKey}

              onChange={(e) => setApiKey(e.target.value)}

              autoComplete="off"

            />

          </label>



          <label className="block space-y-1.5">

            <span className="text-sm font-medium">Base URL</span>

            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />

          </label>



          <Button onClick={save} disabled={saving} className="gap-2">

            <Save className="h-4 w-4" />

            {saving ? "Saving…" : "Save LLM settings"}

          </Button>

        </CardContent>

      </Card>



      <Card className="mt-6">

        <CardHeader>

          <CardTitle className="text-base">API keys (all providers)</CardTitle>

        </CardHeader>

        <CardContent className="space-y-4">

          {KEY_PROVIDERS.map((p) => (

            <label key={p} className="block space-y-1">

              <span className="flex items-center gap-2 text-sm font-medium">

                {PROVIDER_LABELS[p]}

                {config?.keys_set?.[p] && (

                  <Badge variant="success" className="text-xs">

                    {config.keys_masked?.[p] || "set"}

                  </Badge>

                )}

              </span>

              <Input

                type="password"

                placeholder="Paste key to store locally"

                value={providerKeys[p] || ""}

                onChange={(e) =>

                  setProviderKeys((prev) => ({ ...prev, [p]: e.target.value }))

                }

                autoComplete="off"

              />

            </label>

          ))}

          <p className="text-xs text-muted-foreground">

            Save with the button above — keys merge into local storage without

            overwriting blank fields.

          </p>

        </CardContent>

      </Card>



      <Card className="mt-6">

        <CardHeader>

          <CardTitle className="text-base">Optional service keys</CardTitle>

        </CardHeader>

        <CardContent className="space-y-4 text-sm">

          <label className="block space-y-1">

            <span className="font-medium">

              Semantic Scholar

              {appKeys?.semanticScholarApiKeySet && (

                <span className="ml-2 text-muted-foreground">

                  ({appKeys.semanticScholarApiKeyMasked})

                </span>

              )}

            </span>

            <Input

              type="password"

              placeholder="Optional — richer reference search"

              value={ssKey}

              onChange={(e) => setSsKey(e.target.value)}

            />

          </label>

          <label className="block space-y-1">

            <span className="font-medium">

              Supermemory

              {appKeys?.supermemoryApiKeySet && (

                <span className="ml-2 text-muted-foreground">

                  ({appKeys.supermemoryApiKeyMasked})

                </span>

              )}

            </span>

            <Input

              type="password"

              placeholder="Optional — local service usually needs none"

              value={smKey}

              onChange={(e) => setSmKey(e.target.value)}

            />

          </label>

          <Button variant="outline" size="sm" onClick={saveAppKeys}>

            Save optional keys

          </Button>

        </CardContent>

      </Card>



      <Card className="mt-6">

        <CardHeader>

          <div className="flex items-center gap-2">

            <HardDrive className="h-4 w-4" />

            <CardTitle className="text-base">Local storage</CardTitle>

          </div>

        </CardHeader>

        <CardContent className="space-y-3 text-sm text-muted-foreground">

          <p>

            All data stays on this machine under{" "}

            <code className="text-xs text-foreground">{storage?.storagePath || "./storage"}</code>.
            {storage?.message && (
              <span className="block mt-1 text-xs text-muted-foreground">{storage.message}</span>
            )}

          </p>

          {storage && (

            <ul className="space-y-1">

              <li>Works & assets: {storage.worksFormatted}</li>

              <li>Generations: {storage.generationsFormatted}</li>

              <li>References: {storage.referencesFormatted || "—"}</li>

              <li>Uploads: {storage.uploadsFormatted}</li>

              <li className="font-medium text-foreground">Total: {storage.totalFormatted}</li>

            </ul>

          )}

          <Button variant="outline" size="sm" onClick={clearGenerations}>

            Clear generation cache

          </Button>

        </CardContent>

      </Card>



      <Card className="mt-6">

        <CardHeader>

          <CardTitle className="text-base">Setup walkthrough</CardTitle>

        </CardHeader>

        <CardContent>

          <Button variant="outline" size="sm" className="gap-2" onClick={restartOnboarding}>

            <RotateCcw className="h-4 w-4" />

            Restart setup walkthrough

          </Button>

        </CardContent>

      </Card>



      {message && (

        <p className="mt-4 text-sm text-success flex items-center gap-2">

          <Sparkles className="h-4 w-4" />

          {message}

        </p>

      )}

      {error && <p className="mt-4 text-sm text-primary">{error}</p>}



      <p className="mt-6 text-xs text-muted-foreground">

        Or run <code className="font-mono">npm run start:local</code> /{" "}

        <code className="font-mono">holocron start</code> for one-command local setup.

      </p>
        </div>
      </ScrollArea>
      )}
    </div>

  );

}

