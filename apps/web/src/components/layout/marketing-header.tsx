"use client";

import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
            <Image
              src="/holocron.png"
              alt="Holocron"
              width={24}
              height={24}
              className="h-6 w-6 object-contain"
            />
          </span>
          <span className="font-semibold">Holocron</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/research-graph">
            <Button size="sm">Open app</Button>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
