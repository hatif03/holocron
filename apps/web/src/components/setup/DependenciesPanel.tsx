"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceBadge, type ServiceStatus } from "./ServiceBadge";

export type SetupStatus = {
  web?: boolean;
  agents: boolean;
  supermemory: boolean;
  latex: boolean;
  database: boolean;
  supermemoryKeyConfigured?: boolean;
  supermemoryIntegration?: string;
  mockLlm?: boolean;
  details?: {
    database?: { url: string; port: number };
    agents?: { url: string; port: number };
    supermemory?: { url: string; port: number; keyConfigured?: boolean };
    latex?: { url: string; port: number };
    web?: { url: string; port: number };
  };
};

function smStatus(
  reachable: boolean,
  keyConfigured: boolean | undefined,
  integration: string | undefined
): ServiceStatus {
  if (!reachable) return "down";
  if (!keyConfigured) return "warn";
  if (integration && integration !== "ok") return "warn";
  return "ok";
}

function smDetail(
  reachable: boolean,
  keyConfigured: boolean | undefined,
  integration: string | undefined
): string | undefined {
  if (!reachable) return "Not reachable — run npm run start:local or holocron start";
  if (!keyConfigured) return "API key not configured — bootstrap on start";
  if (integration === "disabled") return "Reachable but agents integration disabled";
  if (integration === "unreachable") return "Agents cannot reach Supermemory";
  if (integration === "ok") return "Connected and integrated with agents";
  return undefined;
}

export function DependenciesPanel() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/setup/status");
      if (res.ok) setStatus(await res.json());
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const allOk =
    status?.database &&
    status?.agents &&
    status?.supermemory &&
    status?.latex &&
    status?.supermemoryIntegration === "ok";

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Server className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <CardTitle>Dependencies</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Required services for research graphs, memory, and paper generation.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-1.5">Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-6">
        {loading && !status ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking services…
          </p>
        ) : (
          <>
            <ServiceBadge
              status={status?.database ? "ok" : "down"}
              label="Database (Postgres :5432)"
              detail={
                status?.database
                  ? "Connected"
                  : "Unavailable — ensure Docker stack is running"
              }
            />
            <ServiceBadge
              status={status?.agents ? "ok" : "down"}
              label="Agents service (:8000)"
              detail={
                status?.agents
                  ? status.mockLlm
                    ? "Online (mock LLM mode)"
                    : "Online with live LLM key"
                  : "Offline — holocron doctor or npm run start:local"
              }
            />
            <ServiceBadge
              status={smStatus(
                !!status?.supermemory,
                status?.supermemoryKeyConfigured,
                status?.supermemoryIntegration
              )}
              label="Supermemory Local (:6767)"
              detail={smDetail(
                !!status?.supermemory,
                status?.supermemoryKeyConfigured,
                status?.supermemoryIntegration
              )}
            />
            <ServiceBadge
              status={status?.latex ? "ok" : "down"}
              label="LaTeX service (:8081)"
              detail={
                status?.latex
                  ? "Ready for PDF compilation"
                  : "Unavailable — required for PDF output"
              }
            />
            {!allOk && (
              <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Start the stack with{" "}
                <code className="text-foreground">npm run start:local</code> (dev) or{" "}
                <code className="text-foreground">holocron start</code> (npm install).
                Run <code className="text-foreground">holocron doctor</code> to check
                prerequisites.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
