import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DOCTOR_CMD, INSTALL_CMD, installSteps } from "@/lib/site-data";

export function InstallCtaSection() {
  return (
    <section id="install" className="border-t px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="section-label mb-4">Get started</p>
        <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Running in four steps
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Node.js and Docker are the only prerequisites. No Python, Postgres, or manual setup.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {installSteps.map((item) => (
            <div key={item.step} className="card-maximal">
              <span className="font-display text-3xl font-bold text-primary/30">{item.step}</span>
              <h3 className="mt-2 font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Verify</p>
            <pre className="code-block">{DOCTOR_CMD}</pre>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Start</p>
            <pre className="code-block">{INSTALL_CMD}</pre>
          </div>
        </div>

        <div className="mt-8">
          <Link
            href="/install"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Full install guide
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
