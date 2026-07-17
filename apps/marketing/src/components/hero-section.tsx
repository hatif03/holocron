import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Play } from "lucide-react";
import { DEMO_VIDEO_URL, INSTALL_CMD } from "@/lib/site-data";

export function HeroSection() {
  return (
    <section className="gradient-hero relative overflow-hidden px-4 py-20 md:py-28">
      <div
        className="glow-orb animate-pulse-glow -left-32 top-0 h-96 w-96 bg-[var(--glow)]"
        aria-hidden
      />
      <div
        className="glow-orb animate-pulse-glow -right-32 bottom-0 h-80 w-80 bg-[var(--glow)]"
        aria-hidden
      />
      <div className="dot-bg absolute inset-0 opacity-30" aria-hidden />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <div className="mb-8 flex items-center gap-3">
            <Image
              src="/holocron.svg"
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 opacity-90"
            />
            <span className="font-display text-4xl tracking-tight text-white md:text-5xl">
              Holocron
            </span>
          </div>
          <p className="section-label mb-6 border-emerald-400/30 bg-emerald-950/40 text-emerald-200">
            Source available · BYOK · Local-first
          </p>
          <h1 className="font-display text-4xl leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
            Research graphs that write papers
          </h1>
          <p className="mt-6 max-w-lg text-lg text-emerald-100/80">
            Holocron maps hypotheses, literature, and experiments as a living graph — then runs a
            multi-agent pipeline to plan, write, and review publication-ready LaTeX on your machine.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/install"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
            >
              Install Holocron
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={DEMO_VIDEO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium backdrop-blur transition hover:bg-white/10"
            >
              <Play className="h-4 w-4" />
              Watch demo
            </a>
          </div>
          <pre className="hero-terminal mt-8 max-w-md">{INSTALL_CMD}</pre>
        </div>

        <div className="relative">
          <div className="animate-float rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <Image
              src="/pipeline.svg"
              alt="Agent pipeline diagram"
              width={800}
              height={120}
              className="w-full brightness-0 invert opacity-90"
            />
            <p className="mt-4 text-center text-xs text-emerald-200/70">
              Planner → Writer → Reviewer → Citation Verifier → Typesetter → VLM Review
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
