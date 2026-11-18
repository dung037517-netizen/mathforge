import type { Metadata } from "next";
import { Suspense } from "react";

import { PracticePage } from "@/components/practice/practice-page";

export const metadata: Metadata = {
  title: "Practice",
  description:
    "Adaptive practice for SAT Math, AP Calculus and AP Statistics: questions chosen from your weakest skills, each with a step-by-step solution.",
  alternates: { canonical: "/practice" },
};

export default function Page() {
  // The page reads its focus from the query string, which is only known in the browser.
  return (
    <Suspense fallback={null}>
      <PracticePage />
    </Suspense>
  );
}
