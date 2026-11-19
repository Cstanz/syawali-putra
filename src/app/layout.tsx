import type { Metadata } from "next";
import localFont from "next/font/local";
import { DeferredEffects } from "@/components/DeferredEffects";

import { FitTitle } from "@/components/FitTitle";
import "./globals.css";

const anton = localFont({
  src: "../../node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2",
  display: "swap",
  weight: "400",
  variable: "--font-anton",
});

export const metadata: Metadata = {
  title: "SYAWALI PUTRA — Aspiring Developer",
  description: "A personal portfolio documenting Syawali Putra’s progress while exploring programming, artificial intelligence, and technology.",
  icons: { icon: "/images/favicon.svg" },
  openGraph: { title: "SYAWALI PUTRA — Aspiring Developer", description: "A personal portfolio documenting Syawali Putra’s progress while exploring programming, artificial intelligence, and technology.", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={anton.variable}><body><a className="skip-link" href="#main">Skip to content</a>{children}<FitTitle /><DeferredEffects /></body></html>;
}
