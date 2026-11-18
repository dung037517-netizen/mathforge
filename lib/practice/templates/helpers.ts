/**
 * Small constructors shared by every template file.
 */

import { fracTex, m, numTex, reduce, tidy } from "@/lib/practice/format";
import type { Distractor, Option, PracticeRng, WorkedStep } from "@/types/practice";

/** A numeric option, typeset as a plain number unless LaTeX is supplied. */
export function opt(value: number, tex?: string): Option {
  return { display: m(tex ?? numTex(value)), value };
}

/** A numeric option shown as a reduced fraction. */
export function optFrac(n: number, d: number): Option {
  const reduced = reduce(n, d);
  return { display: m(fracTex(reduced.n, reduced.d)), value: reduced.n / reduced.d };
}

/**
 * A fraction as it first appears in a solution, followed by its lowest terms
 * when the two differ: "\\dfrac{6}{8} = \\dfrac{3}{4}".
 */
export function fracStepTex(n: number, d: number): string {
  const reduced = reduce(n, d);
  const raw = `\\dfrac{${n}}{${d}}`;
  if (reduced.n === n && reduced.d === d) return raw;
  if (reduced.d === 1) return `${raw} = ${numTex(reduced.n)}`;
  return `${raw} = \\dfrac{${reduced.n}}{${reduced.d}}`;
}

/** An option that is a statement or an expression rather than a number. */
export function optText(display: string): Option {
  return { display };
}

/** A wrong numeric answer and the mistake that produces it. */
export function wrong(value: number, why: string, tex?: string): Distractor {
  return { display: m(tex ?? numTex(value)), value, why };
}

export function wrongFrac(n: number, d: number, why: string): Distractor {
  if (d === 0) return { display: m("\\text{undefined}"), why };
  const reduced = reduce(n, d);
  return { display: m(fracTex(reduced.n, reduced.d)), value: reduced.n / reduced.d, why };
}

export function wrongText(display: string, why: string): Distractor {
  return { display, why };
}

const SLIP =
  "An arithmetic slip. Substituting this value back into the problem shows that it does not fit.";

/**
 * Fallback distractors: small slips either side of the answer. Templates list
 * their named misconceptions first and append these, so a seed where two
 * misconceptions happen to coincide still yields four distinct choices.
 */
export function slips(answer: number, size = 1): Distractor[] {
  return [answer + size, answer - size, answer + 2 * size, answer - 2 * size].map((value) =>
    wrong(tidy(value), SLIP),
  );
}

/** Slips for a fractional answer: the numerator is off by one or two. */
export function slipsFrac(n: number, d: number): Distractor[] {
  return [n + 1, n - 1, n + 2, n - 2].map((numerator) => wrongFrac(numerator, d, SLIP));
}

export function step(title: string, body: string): WorkedStep {
  return { title, body };
}

/** First names used in word problems. */
export const NAMES: readonly string[] = [
  "Maya",
  "Liam",
  "Sofia",
  "Noah",
  "Aisha",
  "Diego",
  "Hana",
  "Omar",
  "Priya",
  "Lucas",
  "Mei",
  "Ethan",
  "Zara",
  "Minh",
  "Elena",
  "Kofi",
];

export function pickName(rng: PracticeRng): string {
  return rng.pick(NAMES);
}

/** Two different names. */
export function pickTwoNames(rng: PracticeRng): readonly [string, string] {
  const shuffled = rng.shuffle(NAMES);
  return [shuffled[0], shuffled[1]];
}

/** Pick an integer in [min, max] that is not in `excluded`. */
export function intExcept(
  rng: PracticeRng,
  min: number,
  max: number,
  excluded: readonly number[],
): number {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const value = rng.int(min, max);
    if (!excluded.includes(value)) return value;
  }
  for (let value = min; value <= max; value += 1) {
    if (!excluded.includes(value)) return value;
  }
  return min;
}

/** Positive or negative integer with magnitude in [min, max]. */
export function signedInt(rng: PracticeRng, min: number, max: number): number {
  return rng.sign() * rng.int(min, max);
}
