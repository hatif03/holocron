import Image from "next/image";
import { agents } from "@/lib/site-data";

export function PipelineSection() {
  return (
    <section id="agents" className="dot-bg border-t px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="section-label mb-4">Multi-agent pipeline</p>
        <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Nine agents. One orchestrated workflow.
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Supermemory profile, search, and store run at each phase. GraphContract tracks which nodes
          must appear in which sections.
        </p>

        <div className="my-10 overflow-x-auto rounded-2xl border bg-card p-6 shadow-lg">
          <Image src="/pipeline.svg" alt="Pipeline" width={800} height={120} className="min-w-[600px]" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <div key={agent.name} className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold text-primary">{agent.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{agent.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
