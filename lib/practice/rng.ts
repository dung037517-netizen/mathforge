/**
 * Seeded randomness for question generation.
 *
 * Every question is a pure function of (template, seed, level, format). That
 * is what lets the review notebook store four small values instead of a whole
 * problem, and what lets the test suite replay thousands of generated
 * questions and audit each answer key.
 */

import { SeededRandom } from "@/lib/math-engine";
import type { PracticeRng } from "@/types/practice";

/** FNV-1a over a string — spreads template ids across the seed space. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Mix a template id and a seed into one 32-bit stream seed. */
export function mixSeed(key: string, seed: number): number {
  let h = (hashString(key) ^ Math.imul(seed | 0, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0 || 1;
}

export class Rng implements PracticeRng {
  private readonly source: SeededRandom;

  constructor(seed: number) {
    this.source = new SeededRandom(seed);
  }

  /** Uniform on [0, 1). */
  float(): number {
    return this.source.next();
  }

  /** Uniform integer on the inclusive range [min, max]. */
  int(min: number, max: number): number {
    const low = Math.ceil(Math.min(min, max));
    const high = Math.floor(Math.max(min, max));
    return low + Math.floor(this.source.next() * (high - low + 1));
  }

  /** Uniform non-zero integer on [min, max]. */
  nonZero(min: number, max: number): number {
    for (let attempt = 0; attempt < 64; attempt += 1) {
      const value = this.int(min, max);
      if (value !== 0) return value;
    }
    return max !== 0 ? max : 1;
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)];
  }

  /** Fisher–Yates, returning a new array. */
  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = this.int(0, index);
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
  }

  bool(probability = 0.5): boolean {
    return this.source.next() < probability;
  }

  sign(): 1 | -1 {
    return this.source.next() < 0.5 ? 1 : -1;
  }

  /** Standard normal draw, for the simulated-student sample data. */
  normal(): number {
    return this.source.nextNormal();
  }
}

/** A fresh 31-bit seed from the platform's entropy source. */
export function randomSeed(): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] >>> 1;
  }
  return Math.floor(Math.random() * 0x7fffffff);
}
