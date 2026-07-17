import { faqs } from "@/lib/site-data";

export function FaqSection() {
  return (
    <section id="faq" className="grid-bg border-t px-4 py-20">
      <div className="mx-auto max-w-3xl">
        <p className="section-label mb-4">FAQ</p>
        <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Common questions
        </h2>

        <div className="mt-10 space-y-4">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border bg-card px-5 py-4 open:shadow-sm"
            >
              <summary className="cursor-pointer list-none font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span className="text-primary transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
