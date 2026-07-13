"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative inline-flex h-8 w-14 items-center rounded-sm bg-muted border border-border px-1 transition-colors"
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 text-accent-yellow ml-1" />
      <Moon className="h-4 w-4 text-accent-cyan ml-auto mr-1" />
      <span
        className={`absolute h-6 w-6 rounded-sm bg-background border border-primary/40 shadow transition-transform ${
          theme === "dark" ? "translate-x-6" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
