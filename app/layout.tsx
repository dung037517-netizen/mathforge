import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { TooltipProvider } from "@/components/ui/tooltip";
import { SITE_URL } from "@/lib/site";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme";

import "./globals.css";

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

const TITLE = "MathForge — SAT/AP Math Practice Platform";
const DESCRIPTION =
  "Free practice for SAT Math, AP Calculus and AP Statistics. A short diagnostic finds your weak " +
  "skills, adaptive practice works on them with step-by-step worked solutions, a review notebook " +
  "brings back every mistake, and timed mock tests follow the digital SAT format.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · MathForge",
  },
  description: DESCRIPTION,
  applicationName: "MathForge",
  authors: [{ name: "Dung Nguyen", url: "https://github.com/dung037517-netizen" }],
  creator: "Dung Nguyen",
  keywords: [
    "SAT math practice",
    "digital SAT mock test",
    "AP Calculus AB",
    "AP Calculus BC",
    "AP Statistics",
    "step-by-step solutions",
    "adaptive practice",
    "diagnostic test",
    "spaced repetition",
    "item response theory",
    "actuarial science",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description:
      "Diagnose, practice and review SAT and AP math: adaptive questions with step-by-step " +
      "solutions, a mistake notebook and digital-SAT-style mock tests.",
    url: SITE_URL,
    siteName: "MathForge",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description:
      "Diagnose, practice and review SAT and AP math, with step-by-step solutions and mock tests.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b13",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Applies a stored light-theme preference before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <a
          href="#main"
          className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          Skip to the main content
        </a>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
