import { AGENTS } from "@holocron/shared";
import { fetchAgentsHealth } from "@/lib/agents-client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageToolbar } from "@/components/layout/page-toolbar";
import { Bot, Radio, Clock } from "lucide-react";

export default async function AgentsPage() {
  let agents = AGENTS.map((a) => ({
    ...a,
    status: "online" as const,
    lastActive: "Just now",
  }));
  let supermemoryStatus = "unknown";
  let serviceOnline = false;

  try {
    const health = await fetchAgentsHealth();
    serviceOnline = true;
    supermemoryStatus = health.supermemory || "unknown";
    if (health.agents?.length) {
      agents = health.agents;
    }
  } catch {
    supermemoryStatus = "unreachable";
  }

  const smBadge =
    supermemoryStatus === "ok"
      ? { variant: "success" as const, label: "Supermemory connected" }
      : supermemoryStatus === "disabled"
        ? { variant: "default" as const, label: "Supermemory disabled" }
        : { variant: "default" as const, label: `Supermemory: ${supermemoryStatus}` };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageToolbar
        title="Agents"
        description="Service status"
        actions={
          <div className="flex gap-2">
            <Badge variant={smBadge.variant}>{smBadge.label}</Badge>
            <Badge variant={serviceOnline ? "success" : "default"}>
              {serviceOnline ? "● Online" : "○ Offline"}
            </Badge>
          </div>
        }
      />

      <div className="grid flex-1 gap-3 overflow-auto p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {agents.map((agent) => (
          <Card key={agent.id} className="p-4">
            <div className="mb-2 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{agent.name}</h3>
              </div>
              <Badge variant="success">Online</Badge>
            </div>
            <p className="mb-3 min-h-[36px] text-xs text-muted-foreground">
              {"description" in agent ? agent.description : ""}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Radio className="h-3 w-3" />
                {agent.endpoints} endpoint{agent.endpoints !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {"lastActive" in agent ? agent.lastActive : "Just now"}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
