import type { Metadata } from "next";

import { MockPage } from "@/components/practice/mock-page";

export const metadata: Metadata = {
  title: "Mock test",
  description:
    "A timed, two-module adaptive Math section in the format of the digital SAT, with an estimated score and a full review.",
  alternates: { canonical: "/mock" },
};

export default function Page() {
  return <MockPage />;
}
