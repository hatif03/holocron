import Link from "next/link";
import { Play } from "lucide-react";
import { DEMO_VIDEO_URL, DOCS_URL } from "@/lib/site-data";

const steps = [
  {
    title: "Install and start",
    body: "Follow the install guide, then run npx holocron-research@latest start. The browser opens to localhost:3000.",
  },
  {
    title: "Create a research work",
    body: "Open Research Graph → New Work. Give your project a title and description.",
  },
  {
    title: "Build your graph",
    body: "Add idea, literature, method, experiment, and result nodes. Connect them on the canvas.",
  },
  {
    title: "Generate a paper",
    body: "From Paper Generation, start a metadata wizard or generate from your graph end node. Watch the process log.",
  },
  {
    title: "Manage references",
    body: "Import BibTeX or search Semantic Scholar. References link to literature nodes in your graph.",
  },
  {
    title: "Configure LLM",
    body: "Open Settings to set your provider and API key. K2 Think is recommended for demos.",
  },
];

export default function DocsPage() {
  return (
    <div className="px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <p className="section-label mb-4">User guide</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">Getting started</h1>
        <p className="mt-3 text-muted-foreground">
          Quick start for Holocron. For developer docs, see the{" "}
          <a href={DOCS_URL} className="text-primary hover:underline" target="_blank" rel="noreferrer">
            GitHub docs folder
          </a>
          .
        </p>

        <a
          href={DEMO_VIDEO_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm font-medium transition hover:bg-muted"
        >
          <Play className="h-4 w-4 text-primary" />
          Watch the demo video
        </a>

        <ol className="mt-10 space-y-8">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold">
                {i + 1}
              </span>
              <div>
                <h2 className="font-semibold">{step.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-12 text-sm text-muted-foreground">
          Need help installing? See the{" "}
          <Link href="/install" className="text-primary hover:underline">
            install guide
          </Link>
          . Want to contribute? See{" "}
          <a
            href="https://github.com/hatif03/holocron/blob/main/CONTRIBUTING.md"
            className="text-primary hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            CONTRIBUTING.md
          </a>
          .
        </p>
      </div>
    </div>
  );
}
