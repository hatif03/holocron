import Link from "next/link";

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
        <h1 className="text-3xl font-bold tracking-tight">User Guide</h1>
        <p className="mt-3 text-muted-foreground">
          Quick start for Holocron v1. For developer docs, see the{" "}
          <a
            href="https://github.com/hatif03/holocron/tree/main/docs"
            className="text-primary hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            GitHub docs folder
          </a>
          .
        </p>
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
          .
        </p>
      </div>
    </div>
  );
}
