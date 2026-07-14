"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, FileCheck, Network } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:py-28">
        <div className="order-2 flex flex-col justify-center lg:order-1">
          <p
            className="mb-6 text-sm italic text-muted-foreground"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            AI research platform
          </p>

          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Map hypotheses,
            <br />
            literature, and
            <br />
            <span
              className="font-normal italic text-muted-foreground"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              experiments
            </span>
          </h1>

          <p className="mt-8 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            Holocron connects your research graph to a multi-agent pipeline that
            plans, writes, and reviews publication-ready papers.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="/research-graph">
              <Button size="lg" className="gap-2">
                <Network className="h-4 w-4" />
                Open Research Graph
              </Button>
            </Link>
            <Link href="/paper-generation">
              <Button variant="outline" size="lg" className="gap-2">
                <FileCheck className="h-4 w-4" />
                Generate Paper
              </Button>
            </Link>
            <Link
              href="/agents"
              className="inline-flex items-center gap-1 px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              View agents
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="order-1 flex items-center justify-center lg:order-2">
          <div className="relative w-full max-w-sm">
            <div className="aspect-[4/5] overflow-hidden rounded-2xl border bg-muted/40 p-8 shadow-sm">
              <div className="flex h-full flex-col items-center justify-center gap-6">
                <span className="flex h-24 w-24 items-center justify-center rounded-2xl bg-muted">
                  <Image
                    src="/holocron-icon.png"
                    alt="Holocron"
                    width={72}
                    height={72}
                    className="h-[4.5rem] w-[4.5rem] object-contain"
                    priority
                  />
                </span>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Research workbench
                  </p>
                  <p
                    className="mt-2 text-2xl italic text-foreground/80"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    Graph → Paper
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 hidden h-24 w-24 rounded-xl border bg-card p-4 shadow-sm lg:block">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Agents
              </p>
              <p className="mt-1 text-lg font-semibold">12+</p>
              <p className="text-xs text-muted-foreground">specialized roles</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
