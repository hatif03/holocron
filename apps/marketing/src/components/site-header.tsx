import Link from "next/link";
import Image from "next/image";

const links = [
  { href: "/features", label: "Features" },
  { href: "/install", label: "Install" },
  { href: "/docs", label: "Docs" },
  { href: "/agents", label: "Agents" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image src="/holocron.svg" alt="" width={28} height={28} />
          Holocron
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/hatif03/holocron"
            className="text-muted-foreground transition-colors hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
        <Link
          href="/install"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          Get started
        </Link>
      </div>
    </header>
  );
}
