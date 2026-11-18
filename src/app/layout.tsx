import type { Metadata } from "next";
import { Motion } from "@/components/Motion";
import { FilmGrain } from "@/components/FilmGrain";
import { CursorSmear } from "@/components/CursorSmear";
import "@fontsource/anton/latin-400.css";

import { FitTitle } from "@/components/FitTitle";
import "./globals.css";

export const metadata: Metadata = {
  title: "SYAWALI PUTRA — Aspiring Developer",
  description: "A personal portfolio documenting Syawali Putra’s progress while exploring programming, artificial intelligence, and technology.",
  icons: { icon: "/images/favicon.svg" },
  openGraph: { title: "SYAWALI PUTRA — Aspiring Developer", description: "A personal portfolio documenting Syawali Putra’s progress while exploring programming, artificial intelligence, and technology.", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a>{children}<Motion /><FitTitle /><CursorSmear /><FilmGrain /></body></html>;
}
