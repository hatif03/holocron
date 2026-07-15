import Image from "next/image";

const agents = [
  { name: "Planner", role: "Outline + literature discovery (Semantic Scholar / arXiv)" },
  { name: "Writer", role: "Graph-grounded IMRaD LaTeX section generation" },
  { name: "Reviewer", role: "Logic, style, length, and citation coverage loop" },
  { name: "Citation Verifier", role: "Ensures all bib keys and literature nodes are cited" },
  { name: "Typesetter", role: "Self-healing LaTeX compilation to PDF" },
  { name: "VLM Review", role: "Visual PDF layout detection" },
  { name: "Commander", role: "Pipeline orchestrator across all phases" },
  { name: "Metadata", role: "Simple-mode paper from metadata fields" },
];

export default function AgentsPage() {
  return (
    <div className="px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold tracking-tight">Agent Pipeline</h1>
        <p className="mt-3 text-muted-foreground">
          Holocron orchestrates specialized agents locally. Supermemory profile, search, and store
          run at each phase.
        </p>
        <div className="my-10 overflow-x-auto rounded-lg border bg-card p-4">
          <Image src="/pipeline.svg" alt="Pipeline" width={800} height={120} className="min-w-[600px]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {agents.map((agent) => (
            <div key={agent.name} className="rounded-lg border p-4">
              <h3 className="font-semibold text-primary">{agent.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{agent.role}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
