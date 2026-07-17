"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { screenshots } from "@/lib/site-data";

const SLIDE_INTERVAL_MS = 4500;

export function ScreenshotShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = screenshots[active]!;

  const next = useCallback(() => {
    setActive((i) => (i + 1) % screenshots.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [paused, next]);

  return (
    <section id="screenshots" className="grid-bg border-t px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="section-label mb-4">Product tour</p>
        <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Every layer of the research workflow
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Dashboard, graph canvas, paper generation, agents, and reference discovery — all in one
          local stack.
        </p>

        <div className="mt-10 flex flex-wrap gap-2">
          {screenshots.map((shot, i) => (
            <button
              key={shot.id}
              type="button"
              onClick={() => setActive(i)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                active === i
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted"
              }`}
            >
              {shot.title}
            </button>
          ))}
        </div>

        <div
          className="mt-8 overflow-hidden rounded-2xl border bg-card shadow-2xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h3 className="font-semibold">{current.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{current.caption}</p>
            </div>
            <div className="hidden items-center gap-1.5 sm:flex" aria-hidden>
              {screenshots.map((shot, i) => (
                <span
                  key={shot.id}
                  className={`h-1.5 rounded-full transition-all ${
                    i === active ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="relative aspect-[16/10] w-full bg-muted/30">
            {screenshots.map((shot, i) => (
              <Image
                key={shot.id}
                src={shot.src}
                alt={shot.title}
                fill
                className={`object-cover object-top transition-opacity duration-700 ${
                  i === active ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                priority={i === 0}
                sizes="(max-width: 1200px) 100vw, 1152px"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
