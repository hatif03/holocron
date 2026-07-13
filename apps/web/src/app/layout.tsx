import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { Orbitron, Exo_2 } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

const exo2 = Exo_2({
  subsets: ["latin"],
  variable: "--font-exo2",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Holocron — AI Research Platform",
  description:
    "Map research as a living graph, then generate publication-ready papers with a multi-agent AI system.",
  icons: {
    icon: "/holocron.png",
    apple: "/holocron.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const fontVars = {
    "--font-display": "var(--font-orbitron), system-ui, sans-serif",
    "--font-body": "var(--font-exo2), system-ui, sans-serif",
    "--font-serif": "var(--font-orbitron), system-ui, sans-serif",
  } as CSSProperties;

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${orbitron.variable} ${exo2.variable} min-h-screen antialiased`}
        style={fontVars}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Navbar />
          <main className="page-enter">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
