import { DEMO_VIDEO_EMBED, DEMO_VIDEO_URL } from "@/lib/site-data";

export function DemoVideoSection() {
  return (
    <section id="demo" className="border-t px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <p className="section-label mb-4">See it in action</p>
        <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Watch the full walkthrough
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          From research graph to multi-agent paper generation — see Holocron run locally with
          Supermemory recall, process logs, and PDF output.
        </p>
        <div className="mt-10 overflow-hidden rounded-2xl border bg-card shadow-xl">
          <div className="relative aspect-video w-full">
            <iframe
              src={DEMO_VIDEO_EMBED}
              title="Holocron demo video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <a href={DEMO_VIDEO_URL} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            Open on YouTube →
          </a>
        </p>
      </div>
    </section>
  );
}
