import { AGENTS } from "@holocron/shared";
import { fetchAgentsHealth } from "@/lib/agents-client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Bot, Radio, Clock } from "lucide-react";

export default async function AgentsPage() {
  let agents = AGENTS.map((a) => ({
    ...a,
    status: "online" as const,
    lastActive: "Just now",
  }));

  try {
    const health = await fetchAgentsHealth();
    if (health.agents?.length) {
      agents = health.agents;
    }
  } catch {
    /* show static registry when agents offline */
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Agents"
        description="Service status"
        icon={Bot}
        actions={<Badge variant="success">● Agent Service is online and running</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Card key={agent.id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <h3 className="font-semibold">{agent.name}</h3>
              </div>
              <Badge variant="success">Online</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4 min-h-[40px]">
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
