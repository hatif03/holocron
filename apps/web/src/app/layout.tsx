import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    "--font-body": "var(--font-inter), system-ui, sans-serif",
    "--font-mono": "var(--font-jetbrains-mono), ui-monospace, monospace",
    "--font-serif": "var(--font-inter), system-ui, sans-serif",
  } as CSSProperties;

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen antialiased`}
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
