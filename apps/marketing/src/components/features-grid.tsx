import { features } from "@/lib/site-data";

export function FeaturesGrid() {
  return (
    <section id="features" className="border-t px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="section-label mb-4">Capabilities</p>
        <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          What Holocron does
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          A complete local research environment — from literature discovery to publication-ready PDF.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="card-maximal group">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 transition group-hover:bg-primary/10" />
              <p className="stat-number">{feature.stat}</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {feature.statLabel}
              </p>
              <h3 className="mt-4 text-xl font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
