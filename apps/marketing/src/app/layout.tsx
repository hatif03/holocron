import type { Metadata } from "next";
import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://holocron-tawny.vercel.app"),
  title: "Holocron — Local AI Research Platform",
  description:
    "Map research as a living graph. Generate publication-ready papers with a multi-agent pipeline. Runs locally on your machine.",
  openGraph: {
    title: "Holocron — Local AI Research Platform",
    description:
      "Research graph + multi-agent paper generation. BYOK. Source available (non-commercial).",
    type: "website",
    images: [{ url: "/holocron-light.png", width: 800, height: 200, alt: "Holocron" }],
  },
  icons: { icon: "/holocron.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${instrument.variable} font-sans`}>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
