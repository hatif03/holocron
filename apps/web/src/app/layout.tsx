import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { Instrument_Serif, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Holocron — AI Research Platform",
  description:
    "Map research as a living graph, then generate publication-ready papers with a multi-agent AI system.",
  icons: {
    icon: "/holocron.svg",
    apple: "/holocron.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const fontVars = {
    "--font-sans": "var(--font-jakarta), system-ui, sans-serif",
    "--font-display": "var(--font-instrument-serif), Georgia, serif",
    "--font-mono": "var(--font-jetbrains-mono), ui-monospace, monospace",
  } as CSSProperties;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn(
          plusJakarta.variable,
          instrumentSerif.variable,
          jetbrainsMono.variable,
          "h-svh overflow-hidden antialiased"
        )}
        style={fontVars}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
