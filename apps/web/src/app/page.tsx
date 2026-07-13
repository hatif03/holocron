"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Network, FileCheck, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui";

const CRAWL_KEY = "holocron-crawl-seen";

export default function HomePage() {
  const [showCrawl, setShowCrawl] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CRAWL_KEY)) {
        setShowCrawl(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function dismissCrawl() {
    setShowCrawl(false);
    try {
      localStorage.setItem(CRAWL_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="hero-grid relative overflow-hidden min-h-[calc(100vh-4rem)]">
      <div className="starfield" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-background pointer-events-none" />

      {showCrawl && (
        <div className="absolute inset-x-0 top-4 z-20 flex justify-center px-4">
          <div className="relative max-w-lg w-full rounded-sm border border-accent-yellow/30 bg-background/90 backdrop-blur-md px-5 py-4 shadow-[0_0_30px_rgba(255,232,31,0.12)]">
            <button
              type="button"
              onClick={dismissCrawl}
              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-sm text-accent-cyan mb-2">
              A long time ago, in a lab far, far away…
            </p>
            <p className="font-display text-accent-yellow text-sm leading-relaxed tracking-wide uppercase">
              Knowledge waits inside the Holocron. Map your research. Command the
              agents. Forge publication-ready papers.
            </p>
            <Button size="sm" variant="ghost" className="mt-3" onClick={dismissCrawl}>
              Enter
            </Button>
          </div>
        </div>
      )}

      <section className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:py-28">
        <div className="mb-8 flex justify-center">
          <Image
            src="/holocron.png"
            alt="Holocron"
            width={140}
            height={140}
            className="holocron-pulse h-[120px] w-[120px] sm:h-[140px] sm:w-[140px] object-contain"
            priority
          />
        </div>

        <p className="mb-3 font-display text-xs tracking-[0.35em] uppercase text-accent-cyan">
          Research Command Platform
        </p>

        <h1 className="font-display text-4xl font-bold tracking-wide text-accent-yellow sm:text-6xl uppercase">
          Holocron
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Map hypotheses, literature, and experiments on a living research graph
          — then generate publication-ready papers with a multi-agent AI crew.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/research-graph">
            <Button variant="gradient" size="lg" className="gap-2">
              <Network className="h-5 w-5" />
              Research Graph
            </Button>
          </Link>
          <Link href="/paper-generation">
            <Button variant="cyan" size="lg" className="gap-2">
              <FileCheck className="h-5 w-5" />
              Generate Paper
            </Button>
          </Link>
          <Link href="/agents">
            <Button variant="ghost" size="lg" className="gap-2">
              Agents
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
