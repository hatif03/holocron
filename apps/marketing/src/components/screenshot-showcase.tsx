"use client";

import { useState } from "react";
import Image from "next/image";
import { screenshots } from "@/lib/site-data";

export function ScreenshotShowcase() {
  const [active, setActive] = useState(0);
  const current = screenshots[active]!;

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

        <div className="mt-8 overflow-hidden rounded-2xl border bg-card shadow-2xl">
          <div className="border-b px-6 py-4">
            <h3 className="font-semibold">{current.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{current.caption}</p>
          </div>
          <Image
            src={current.src}
            alt={current.title}
            width={1920}
            height={1080}
            className="w-full"
            priority={active === 0}
          />
        </div>
      </div>
    </section>
  );
}
