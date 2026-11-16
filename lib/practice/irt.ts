/**
 * Item response theory: the measurement model behind mastery and mock scores.
 *
 * Each question is treated as a three-parameter logistic item,
 *
 *     P(correct | θ) = c + (1 − c) / (1 + e^(−a(θ − b))),
 *
 * where θ is the student's ability, b the item's difficulty, a how sharply it
 * separates students, and c the chance of guessing it. Ability is estimated on
 * a fixed grid by Bayes' rule, which keeps every calculation exact, cheap and
 * easy to test.
 *
 * The item parameters are set by design (level and answer format), not fitted
 * to response data: the site has no server and collects none. The methodology
 * page says so plainly.
 */

import type { AbilityEstimate, AnswerFormat, ItemParameters, Level } from "@/types/practice";

export const THETA_MIN = -4;
export const THETA_MAX = 4;
export const THETA_STEP = 0.1;

/** The ability grid: −4.0, −3.9, …, 4.0. */
export const THETA_GRID: readonly number[] = Array.from(
  { length: Math.round((THETA_MAX - THETA_MIN) / THETA_STEP) + 1 },
  (_, index) => Math.round((THETA_MIN + index * THETA_STEP) * 10) / 10,
);

const DIFFICULTY: Readonly<Record<Level, number>> = { 1: -1.1, 2: 0, 3: 1.1 };

/** Discrimination shared by every item. */
export const DISCRIMINATION = 1.15;

/** Guessing floor for a four-option multiple-choice question. */
export const CHOICE_GUESS = 0.25;

export function itemParameters(level: Level, format: AnswerFormat): ItemParameters {
  return { a: DISCRIMINATION, b: DIFFICULTY[level], c: format === "choice" ? CHOICE_GUESS : 0 };
}

export function logistic(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function probabilityCorrect(theta: number, item: ItemParameters): number {
  return item.c + (1 - item.c) * logistic(item.a * (theta - item.b));
}

/** Fisher information of a 3PL item at ability θ. */
export function itemInformation(theta: number, item: ItemParameters): number {
  const p = probabilityCorrect(theta, item);
  if (p <= 0 || p >= 1) return 0;
  const ratio = (p - item.c) / (1 - item.c);
  return (item.a * item.a * ratio * ratio * (1 - p)) / p;
}

const rowCache = new Map<string, Float64Array>();

/** log P(response | θ) at every grid point, cached per item and outcome. */
export function logLikelihoodRow(item: ItemParameters, correct: boolean): Float64Array {
  const key = `${item.a}|${item.b}|${item.c}|${correct ? 1 : 0}`;
  const cached = rowCache.get(key);
  if (cached !== undefined) return cached;
  const row = new Float64Array(THETA_GRID.length);
  for (let index = 0; index < THETA_GRID.length; index += 1) {
    const p = probabilityCorrect(THETA_GRID[index], item);
    row[index] = Math.log(Math.max(1e-12, correct ? p : 1 - p));
  }
  rowCache.set(key, row);
  return row;
}

/** Unnormalized log density of N(mean, sd²) on the grid. */
export function normalLogPrior(mean: number, sd: number): Float64Array {
  const row = new Float64Array(THETA_GRID.length);
  for (let index = 0; index < THETA_GRID.length; index += 1) {
    const z = (THETA_GRID[index] - mean) / sd;
    row[index] = -0.5 * z * z;
  }
  return row;
}

export function emptyRow(): Float64Array {
  return new Float64Array(THETA_GRID.length);
}

/** target += weight × source, in place. */
export function addScaled(target: Float64Array, source: Float64Array, weight = 1): void {
  for (let index = 0; index < target.length; index += 1) target[index] += weight * source[index];
}

export function scaleRow(target: Float64Array, factor: number): void {
  for (let index = 0; index < target.length; index += 1) target[index] *= factor;
}

/** Normalized posterior weights from unnormalized log values. */
export function normalize(logValues: Float64Array): Float64Array {
  let peak = Number.NEGATIVE_INFINITY;
  for (const value of logValues) if (value > peak) peak = value;
  const weights = new Float64Array(logValues.length);
  let total = 0;
  for (let index = 0; index < logValues.length; index += 1) {
    weights[index] = Math.exp(logValues[index] - peak);
    total += weights[index];
  }
  for (let index = 0; index < weights.length; index += 1) weights[index] /= total;
  return weights;
}

/** Posterior mean and standard deviation of θ. */
export function summarize(weights: Float64Array): { theta: number; sd: number } {
  let mean = 0;
  for (let index = 0; index < weights.length; index += 1) mean += weights[index] * THETA_GRID[index];
  let variance = 0;
  for (let index = 0; index < weights.length; index += 1) {
    const deviation = THETA_GRID[index] - mean;
    variance += weights[index] * deviation * deviation;
  }
  return { theta: mean, sd: Math.sqrt(Math.max(variance, 0)) };
}

/** Posterior expectation of a function of θ. */
export function expectation(weights: Float64Array, fn: (theta: number) => number): number {
  let total = 0;
  for (let index = 0; index < weights.length; index += 1) total += weights[index] * fn(THETA_GRID[index]);
  return total;
}

export interface ScoredResponse {
  readonly level: Level;
  readonly format: AnswerFormat;
  readonly correct: boolean;
}

/**
 * Expected a posteriori ability from a set of responses under a normal prior.
 * With no responses the estimate is the prior itself.
 */
export function estimateAbility(
  responses: readonly ScoredResponse[],
  priorMean = 0,
  priorSd = 1,
): AbilityEstimate {
  const logPosterior = normalLogPrior(priorMean, priorSd);
  for (const response of responses) {
    addScaled(logPosterior, logLikelihoodRow(itemParameters(response.level, response.format), response.correct));
  }
  const { theta, sd } = summarize(normalize(logPosterior));
  return { theta, sd, evidence: responses.length };
}

/**
 * Mastery scale: the probability of answering a standard-level question
 * correctly without guessing. θ = 0 maps to 50%.
 */
export function masteryFromTheta(theta: number): number {
  return logistic(DISCRIMINATION * theta);
}
