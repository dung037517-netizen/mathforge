import type { Metadata } from "next";

import { DiagnosticPage } from "@/components/practice/diagnostic-page";

export const metadata: Metadata = {
  title: "Diagnose",
  description:
    "A short adaptive diagnostic for SAT Math, AP Calculus or AP Statistics that estimates your mastery of every skill.",
  alternates: { canonical: "/diagnostic" },
};

export default function Page() {
  return <DiagnosticPage />;
}
