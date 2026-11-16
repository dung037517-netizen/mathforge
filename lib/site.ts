/**
 * Site-wide constants: one place for the name, the links and the navigation.
 */

export const SITE_NAME = "MathForge";
export const SITE_TAGLINE = "SAT/AP Math Practice Platform";
export const SITE_URL = "https://mathforge-blush.vercel.app";
export const REPOSITORY_URL = "https://github.com/dung037517-netizen/mathforge";
export const FINHUB_URL = "https://finhubtracker-maudung.vercel.app";
export const AUTHOR_NAME = "Dung Nguyen";
export const AUTHOR_URL = "https://github.com/dung037517-netizen";

export interface NavItem {
  readonly href: string;
  readonly label: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/diagnostic", label: "Diagnose" },
  { href: "/practice", label: "Practice" },
  { href: "/review", label: "Review" },
  { href: "/mock", label: "Mock test" },
  { href: "/progress", label: "Progress" },
  { href: "/lab", label: "Lab" },
];

/** College Board requires this wording wherever its marks are used. */
export const TRADEMARK_NOTICE =
  "SAT® and AP® are trademarks registered by the College Board, which is not affiliated with, " +
  "and does not endorse, this site.";
