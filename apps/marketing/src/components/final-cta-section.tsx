import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DEMO_VIDEO_URL, GITHUB_URL } from "@/lib/site-data";

export function FinalCtaSection() {
  return (
    <section className="gradient-hero relative overflow-hidden px-4 py-20">
      <div className="dot-bg absolute inset-0 opacity-20" aria-hidden />
      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Start mapping research that writes itself
        </h2>
        <p className="mt-4 text-emerald-100/80">
          Install Holocron locally, bring your own LLM key, and generate publication-ready papers
          from your research graph.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/install"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
          >
            Install now
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-medium transition hover:bg-white/10"
          >
            View on GitHub
          </a>
          <a
            href={DEMO_VIDEO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-medium transition hover:bg-white/10"
          >
            Watch demo
          </a>
        </div>
      </div>
    </section>
  );
}
