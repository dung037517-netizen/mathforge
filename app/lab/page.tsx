import type { Metadata } from "next";

import { LabPage } from "@/components/math/lab-page";

export const metadata: Metadata = {
  title: "Lab",
  description:
    "A step-by-step calculus solver, probability distributions, survival models and a Monte Carlo laboratory, built on a hand-written math engine.",
  alternates: { canonical: "/lab" },
};

export default function Page() {
  return <LabPage />;
}
