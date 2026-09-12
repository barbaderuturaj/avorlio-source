import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono, Hanken_Grotesk, Newsreader } from "next/font/google";
import { DemoToastProvider } from "@/components/shared/demo-toast-provider";
import { ThemeProvider } from "@/components/shared/theme-provider";
import {
  GoogleAnalytics,
  shouldRenderGoogleAnalytics,
} from "@/components/analytics/google-analytics";
import {
  MarketingStructuredData,
  shouldRenderMarketingStructuredData,
} from "@/components/analytics/structured-data";
import StyledJsxRegistry from "./styled-jsx-registry";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Seldon Studio rebrand (2026-06-12): Hanken Grotesk is the UI sans
// for the operator dashboard (see --font-sans in globals.css). Newsreader
// (italic) provides serif/display accents via the .font-display utility.
const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["italic", "normal"],
});

// SLICE 9 PR 2 C1: brand asset application. References go through
// /brand/ (extracted from the canonical asset bundle in the brand
// README). The legacy /logo.svg path is kept on disk for now (not
// removed in this commit) but no longer referenced from layout meta.
export const metadata: Metadata = {
  metadataBase: new URL("https://avorlio.com"),
  title: "Avorlio — AI Front Office for HVAC Companies",
  description:
    "Avorlio is a done-for-you AI Front Office for HVAC companies that captures and qualifies website leads, books appointments, and follows up automatically.",
  manifest: "/brand/manifest.webmanifest",
  icons: {
    icon: [{ url: "/brand/avorlio-favicon-v1.svg", type: "image/svg+xml" }],
    shortcut: "/brand/avorlio-favicon-v1.svg",
  },
  openGraph: {
    title: "AI Front Office - Capture leads and book appointments.",
    description:
      "Done-for-you AI Front Office for HVAC companies that captures, qualifies, books, and follows up with website leads.",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Front Office - Capture leads and book appointments.",
    description:
      "Deploy branded client workspaces, booking, CRM, intake, and agents from one repeatable agency delivery loop.",
    images: ["/brand/twitter-card.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // v1.40.14 — Google Analytics, host-aware. Only renders on
  // SeldonFrame-owned hosts (seldonframe.com, app.seldonframe.com).
  // Workspace subdomains and preview deploys get no GA injection
  // — see components/analytics/google-analytics.tsx for the
  // privacy rationale.
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const hostHeader = (await headers()).get("host") ?? "";
  const renderGA =
    Boolean(measurementId) && shouldRenderGoogleAnalytics(hostHeader);

  // SEO/GEO: marketing-only structured data. Renders Organization +
  // WebSite + SoftwareApplication JSON-LD on seldonframe.com only.
  // NOT on app.seldonframe.com (operator dashboard) or workspace
  // subdomains (per-workspace LocalBusiness schema is generated
  // separately per workspace). See structured-data.tsx for the
  // host-allowlist rationale.
  const renderMarketingSchema = shouldRenderMarketingStructuredData(hostHeader);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${hankenGrotesk.variable} ${newsreader.variable} antialiased`}
      >
        {/* StyledJsxRegistry flushes styled-jsx rules into the SSR <head> so the
            public landing-r1 surfaces paint fully styled (no FOUC). */}
        <StyledJsxRegistry>
          {renderGA && measurementId ? (
            <GoogleAnalytics measurementId={measurementId} />
          ) : null}
          {renderMarketingSchema ? <MarketingStructuredData /> : null}
          <ThemeProvider>
            <DemoToastProvider>{children}</DemoToastProvider>
          </ThemeProvider>
        </StyledJsxRegistry>
      </body>
    </html>
  );
}
