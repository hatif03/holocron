import { Network, FileText, Brain, Key, Database } from "lucide-react";

const features = [
  {
    icon: Network,
    title: "Research Graph",
    description:
      "Build a visual map of hypotheses, literature, methods, experiments, and findings. Connect nodes and generate papers from any end point.",
  },
  {
    icon: FileText,
    title: "Paper Generation",
    description:
      "Graph mode generates IMRaD LaTeX grounded in your research graph. Metadata mode offers a four-step wizard for quick drafts.",
  },
  {
    icon: Brain,
    title: "Supermemory Local",
    description:
      "Hybrid search over your ingested library complements Semantic Scholar and arXiv discovery at each pipeline phase.",
  },
  {
    icon: Key,
    title: "Bring Your Own Key",
    description:
      "K2 Think, OpenAI, Anthropic, Google, Groq, OpenRouter, or custom OpenAI-compatible endpoints. Keys stay in ~/.holocron/.env.",
  },
  {
    icon: Database,
    title: "Fully local stack",
    description:
      "Postgres, Python agents, Next.js UI, LaTeX service, and Supermemory run in Docker on your machine. No cloud account required.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold tracking-tight">Features</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Everything you need to go from research idea to publication-ready PDF — on your own
          hardware.
        </p>
        <div className="mt-12 space-y-8">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-4 rounded-lg border bg-card p-6">
              <Icon className="h-8 w-8 shrink-0 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="mt-2 text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
