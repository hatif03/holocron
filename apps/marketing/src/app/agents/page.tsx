import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { agents, DEMO_VIDEO_URL } from "@/lib/site-data";

export default function AgentsPage() {
  return (
    <div className="px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <p className="section-label mb-4">Agents</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">Agent Pipeline</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          Holocron orchestrates specialized agents locally. Supermemory profile, search, and store
          run at each phase.
        </p>

        <a
          href={DEMO_VIDEO_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          See agents in action in the demo video →
        </a>

        <div className="my-10 overflow-hidden rounded-2xl border shadow-lg">
          <Image
            src="/screenshots/agents-dashboard.png"
            alt="Agents dashboard"
            width={1400}
            height={900}
            className="w-full"
          />
        </div>

        <div className="overflow-x-auto rounded-2xl border bg-card p-4">
          <Image src="/pipeline.svg" alt="Pipeline" width={800} height={120} className="min-w-[600px]" />
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <div key={agent.name} className="card-maximal">
              <h3 className="font-semibold text-primary">{agent.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{agent.role}</p>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <Link
            href="/install"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
