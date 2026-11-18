import type { Metadata } from "next";

import { ProgressPage } from "@/components/practice/progress-page";

export const metadata: Metadata = {
  title: "Progress",
  description:
    "Estimated mastery for every skill, with uncertainty, tracked over time and stored only in your browser.",
  alternates: { canonical: "/progress" },
};

export default function Page() {
  return <ProgressPage />;
}
