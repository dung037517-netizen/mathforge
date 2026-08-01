import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { TooltipProvider } from "@/components/ui/tooltip";
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

export const metadata: Metadata = {
  title: {
    default: "MathForge — Actuarial & Probability Computing Workbench",
    template: "%s · MathForge",
  },
  description:
    "An interactive workbench for actuarial science and quantitative finance: step-by-step " +
    "symbolic calculus, dense linear algebra, parametric survival models, life contingencies, " +
    "and non-blocking Monte Carlo simulation — all computed client-side.",
  keywords: [
    "actuarial science",
    "survival models",
    "life contingencies",
    "Monte Carlo simulation",
    "symbolic differentiation",
    "linear algebra",
    "quantitative finance",
  ],
  authors: [{ name: "MathForge" }],
  openGraph: {
    title: "MathForge — Actuarial & Probability Computing Workbench",
    description:
      "Symbolic calculus, survival models, life contingencies and Monte Carlo simulation in the browser.",
    type: "website",
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
          href="#workbench"
          className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          Skip to the workbench
        </a>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
