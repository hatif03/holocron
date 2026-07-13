"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { Settings } from "lucide-react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/research-graph", label: "Research Graph" },
  { href: "/paper-generation", label: "Paper Generation" },
  { href: "/references", label: "References" },
  { href: "/agents", label: "Agents" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image
            src="/holocron.png"
            alt="Holocron"
            width={32}
            height={32}
            className="h-8 w-8 object-contain transition-transform group-hover:scale-105"
            priority
          />
          <span className="font-display text-lg font-bold tracking-wider text-accent-yellow uppercase">
            Holocron
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-sm px-4 py-2 text-sm font-medium tracking-wide transition-colors",
                  active
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-sm border border-transparent text-muted-foreground transition-colors hover:text-accent-cyan hover:border-accent-cyan/40",
              pathname.startsWith("/settings") &&
                "text-accent-cyan border-accent-cyan/40 bg-accent-cyan/10"
            )}
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
