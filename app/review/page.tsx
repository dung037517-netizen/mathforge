import type { Metadata } from "next";

import { ReviewPage } from "@/components/practice/review-page";

export const metadata: Metadata = {
  title: "Review",
  description:
    "Your mistake notebook: every missed question returns on a spaced schedule with new numbers until you have mastered it.",
  alternates: { canonical: "/review" },
};

export default function Page() {
  return <ReviewPage />;
}
