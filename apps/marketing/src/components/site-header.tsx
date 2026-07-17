"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { GITHUB_URL } from "@/lib/site-data";

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#demo", label: "Demo" },
  { href: "/install", label: "Install" },
  { href: "/docs", label: "Docs" },
  { href: "/agents", label: "Agents" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-900/40 bg-[var(--hero-bg)]/95 text-[var(--hero-fg)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/holocron.svg" alt="" width={28} height={28} className="text-emerald-400" />
          <span className="font-display text-lg font-semibold text-white">Holocron</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={isHome && link.href.startsWith("/#") ? link.href : link.href.replace("/#", "/")}
              className="text-emerald-100/70 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <a
            href={GITHUB_URL}
            className="text-emerald-100/70 transition-colors hover:text-white"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
        <Link
          href="/install"
          className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
        >
          Get started
        </Link>
      </div>
    </header>
  );
}
