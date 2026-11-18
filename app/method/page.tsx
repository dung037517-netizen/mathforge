import type { Metadata } from "next";

import { MethodPage } from "@/components/practice/method-page";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How MathForge generates and verifies questions, estimates mastery with a hierarchical Bayesian model, and what its numbers do not mean.",
  alternates: { canonical: "/method" },
};

export default function Page() {
  return <MethodPage />;
}
