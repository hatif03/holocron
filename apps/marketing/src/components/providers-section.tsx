import { providers } from "@/lib/site-data";

export function ProvidersSection() {
  return (
    <section className="border-t px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="section-label mb-4">Bring your own key</p>
        <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Your keys. Your data. Your machine.
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Configure any supported LLM provider in Settings or via the CLI setup wizard. Keys stay in{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">~/.holocron/.env</code>.
        </p>

        <div className="mt-10 overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Provider</th>
                <th className="px-4 py-3 text-left font-semibold">Default model</th>
                <th className="hidden px-4 py-3 text-left font-semibold sm:table-cell">Notes</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.name} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.model}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
