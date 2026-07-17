import Link from "next/link";
import { DEMO_VIDEO_URL, GITHUB_URL } from "@/lib/site-data";

export function SiteFooter() {
  return (
    <footer className="border-t py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold">Holocron</p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Local-first AI research platform. Source available under PolyForm Noncommercial
              License 1.0.0.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm sm:grid-cols-3">
            <Link href="/install" className="text-muted-foreground hover:text-foreground">
              Install
            </Link>
            <Link href="/features" className="text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="/docs" className="text-muted-foreground hover:text-foreground">
              Docs
            </Link>
            <a
              href={DEMO_VIDEO_URL}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              Demo video
            </a>
            <a
              href={`${GITHUB_URL}/blob/main/CONTRIBUTING.md`}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              Contributing
            </a>
            <a
              href={`${GITHUB_URL}/blob/main/LICENSE`}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              License
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              GitHub
            </a>
          </div>
        </div>
        <p className="mt-10 border-t pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Holocron Contributors · PolyForm Noncommercial License 1.0.0
        </p>
      </div>
    </footer>
  );
}
