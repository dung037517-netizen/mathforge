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

const TITLE = "MathForge — SAT/AP Calculus Learning Platform";
const DESCRIPTION =
  "An interactive learning platform for SAT and AP Calculus AB/BC and AP Statistics. Symbolic " +
  "differentiation and integration with complete step-by-step derivations, interactive graphing, " +
  "linear algebra, and a Central Limit Theorem simulator — computed entirely in the browser by a " +
  "dependency-free engine, with every topic linked to the actuarial technique it becomes.";
const SITE_URL = "https://mathforge-blush.vercel.app";

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
    "AP Calculus AB",
    "AP Calculus BC",
    "AP Statistics",
    "SAT math",
    "step-by-step derivatives",
    "definite integrals",
    "Central Limit Theorem",
    "Monte Carlo simulation",
    "actuarial science",
    "survival models",
    "life contingencies",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description:
      "Step-by-step AP Calculus and Statistics, solved in the browser by a dependency-free engine " +
      "— with every topic linked to the actuarial technique it becomes.",
    url: SITE_URL,
    siteName: "MathForge",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description:
      "Step-by-step AP Calculus and Statistics, solved in the browser by a dependency-free engine.",
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
