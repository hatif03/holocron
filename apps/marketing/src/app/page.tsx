import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Network, FileText, Shield, Cpu } from "lucide-react";

export default function HomePage() {
  return (
    <>
      <section className="gradient-hero px-4 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-4 text-sm font-medium text-primary">Local-first · BYOK · Open source</p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              Research graphs that write papers
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Holocron maps hypotheses, literature, and experiments as a living graph — then
              runs a multi-agent pipeline to plan, write, and review publication-ready LaTeX.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/install"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
              >
                Install Holocron
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/features"
                className="inline-flex items-center rounded-md border px-5 py-2.5 text-sm font-medium"
              >
                See features
              </Link>
            </div>
            <pre className="code-block mt-8 max-w-md">npx holocron-research@latest start</pre>
          </div>
          <div className="relative rounded-xl border bg-card p-6 shadow-lg">
            <Image
              src="/pipeline.svg"
              alt="Agent pipeline diagram"
              width={800}
              height={120}
              className="w-full"
            />
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Planner → Writer → Reviewer → Citation Verifier → Typesetter → VLM Review
            </p>
          </div>
        </div>
      </section>

      <section className="border-t px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Network,
              title: "Research Graph",
              desc: "Visual canvas for ideas, literature, methods, and results.",
            },
            {
              icon: FileText,
              title: "Paper Generation",
              desc: "IMRaD LaTeX from your graph with venue templates.",
            },
            {
              icon: Shield,
              title: "Your keys, your data",
              desc: "BYOK LLM providers. Everything runs on localhost.",
            },
            {
              icon: Cpu,
              title: "Multi-agent pipeline",
              desc: "Planner, Writer, Reviewer, and more — orchestrated locally.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-lg border bg-card p-5">
              <Icon className="mb-3 h-8 w-8 text-primary" />
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
