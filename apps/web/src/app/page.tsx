import Link from "next/link";
import { Network, FileCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="hero-grid relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100/40 via-purple-100/30 to-pink-100/40 dark:from-blue-950/30 dark:via-purple-950/20 dark:to-pink-950/20 pointer-events-none" />

      <section className="relative mx-auto max-w-4xl px-4 py-24 text-center sm:py-32">
        <div className="mb-6 inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          AI-Powered Research Platform
        </div>

        <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-6xl">
          From Research to Publication,{" "}
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Automated.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          AcademicHub combines intelligent reference management, visual research
          mapping, and a multi-agent AI system to generate publication-ready
          academic papers.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/research-graph">
            <Button variant="gradient" size="lg" className="gap-2">
              <Network className="h-5 w-5" />
              Research Graph
            </Button>
          </Link>
          <Link href="/paper-generation">
            <Button variant="outline" size="lg" className="gap-2">
              <FileCheck className="h-5 w-5" />
              Generate Paper
            </Button>
          </Link>
          <Link href="/agents">
            <Button variant="ghost" size="lg" className="gap-2">
              Learn More
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
