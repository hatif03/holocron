import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { features, screenshots } from "@/lib/site-data";

const featureImages: Record<string, string> = {
  "Research Graph": "/screenshots/research-graph-canvas.png",
  "Discover & Ask": "/screenshots/references-discover.png",
  "Paper Generation": "/screenshots/paper-generation-detail.png",
  "Supermemory Local": "/screenshots/paper-generation-detail.png",
  "Bring Your Own Key": "/screenshots/agents-dashboard.png",
  "Fully Local Stack": "/screenshots/research-graph-works.png",
};

export default function FeaturesPage() {
  return (
    <div className="px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <p className="section-label mb-4">Features</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">Everything in Holocron</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          From research ideation to publication-ready PDF — on your own hardware, with your own LLM
          keys.
        </p>

        <div className="mt-16 space-y-20">
          {features.map((feature, i) => {
            const image = featureImages[feature.title] ?? screenshots[0]!.src;
            const reversed = i % 2 === 1;
            return (
              <div
                key={feature.title}
                className={`grid items-center gap-10 lg:grid-cols-2 ${reversed ? "lg:[direction:rtl]" : ""}`}
              >
                <div className={reversed ? "lg:[direction:ltr]" : ""}>
                  <p className="stat-number">{feature.stat}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {feature.statLabel}
                  </p>
                  <h2 className="mt-4 font-display text-2xl font-bold">{feature.title}</h2>
                  <p className="mt-3 text-muted-foreground">{feature.description}</p>
                </div>
                <div
                  className={`overflow-hidden rounded-2xl border shadow-lg ${reversed ? "lg:[direction:ltr]" : ""}`}
                >
                  <Image src={image} alt={feature.title} width={1200} height={800} className="w-full" />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <Link
            href="/install"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Install Holocron
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
