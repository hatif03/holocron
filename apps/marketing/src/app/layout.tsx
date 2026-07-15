import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Holocron — Local AI Research Platform",
  description:
    "Map research as a living graph. Generate publication-ready papers with a multi-agent pipeline. Runs locally on your machine.",
  openGraph: {
    title: "Holocron — Local AI Research Platform",
    description: "Research graph + multi-agent paper generation. BYOK. Runs locally.",
    type: "website",
  },
  icons: { icon: "/holocron.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
