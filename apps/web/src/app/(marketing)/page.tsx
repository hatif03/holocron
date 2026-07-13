"use client";

import Link from "next/link";
import Image from "next/image";
import { Network, FileCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <section className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:py-28">
        <div className="mb-8 flex justify-center">
          <Image
            src="/holocron.png"
            alt="Holocron"
            width={64}
            height={64}
            className="h-16 w-16 object-contain"
            priority
          />
        </div>

        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Holocron
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Map hypotheses, literature, and experiments on a living research graph
          — then generate publication-ready papers with a multi-agent AI system.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/research-graph">
            <Button size="lg" className="gap-2">
              <Network className="h-5 w-5" />
              Research Graph
            </Button>
          </Link>
          <Link href="/paper-generation">
            <Button variant="secondary" size="lg" className="gap-2">
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
