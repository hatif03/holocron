import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>Holocron — local-first AI research platform. MIT License.</p>
        <div className="flex gap-4">
          <Link href="/install" className="hover:text-foreground">
            Install
          </Link>
          <Link href="/docs" className="hover:text-foreground">
            Docs
          </Link>
          <a
            href="https://github.com/hatif03/holocron"
            className="hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
