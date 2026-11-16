/**
 * Turning a template into a concrete question, and grading a response to it.
 */

import { mixSeed, Rng } from "@/lib/practice/rng";
import type {
  AnswerFormat,
  ChoiceAnswer,
  Distractor,
  Draft,
  Level,
  NumericAnswer,
  Option,
  Question,
  QuestionRef,
  Response,
  Template,
} from "@/types/practice";

/** Raised when a template cannot produce a well-formed question for a seed. */
export class QuestionBuildError extends Error {
  constructor(templateId: string, seed: number, reason: string) {
    super(`Template "${templateId}" (seed ${seed}): ${reason}`);
    this.name = "QuestionBuildError";
  }
}

const VALUE_EPSILON = 1e-9;

function normalize(display: string): string {
  return display.replace(/\s+/g, "");
}

function sameOption(a: Option, b: Option): boolean {
  if (normalize(a.display) === normalize(b.display)) return true;
  if (a.value !== undefined && b.value !== undefined) {
    return Math.abs(a.value - b.value) <= VALUE_EPSILON * Math.max(1, Math.abs(a.value));
  }
  return false;
}

/** The nearest level the template actually offers. */
export function resolveLevel(template: Template, level: Level): Level {
  if (template.levels.includes(level)) return level;
  return [...template.levels].sort(
    (a, b) => Math.abs(a - level) - Math.abs(b - level) || a - b,
  )[0];
}

/** Typed answers are only offered where the answer is a single number. */
export function resolveFormat(template: Template, format: AnswerFormat): AnswerFormat {
  return template.formats.includes(format) ? format : "choice";
}

function layoutChoices(
  templateId: string,
  seed: number,
  draft: Draft,
  rng: Rng,
): ChoiceAnswer {
  const wrong: Distractor[] = [];
  for (const candidate of draft.distractors) {
    if (wrong.length === 3) break;
    if (candidate.value !== undefined && !Number.isFinite(candidate.value)) continue;
    if (sameOption(candidate, draft.answer)) continue;
    if (wrong.some((kept) => sameOption(kept, candidate))) continue;
    wrong.push(candidate);
  }
  if (wrong.length < 3) {
    throw new QuestionBuildError(
      templateId,
      seed,
      `only ${wrong.length} distinct distractors were available`,
    );
  }

  const tagged: { option: Option; correct: boolean; why: string | null }[] = [
    { option: draft.answer, correct: true, why: null },
    ...wrong.map((option) => ({ option, correct: false, why: option.why ?? null })),
  ];

  // Numeric options are listed in increasing order, as on the real test;
  // anything else is shuffled. Either way the position of the key carries no
  // information.
  const allNumeric = tagged.every((entry) => entry.option.value !== undefined);
  const ordered = allNumeric
    ? [...tagged].sort((a, b) => (a.option.value ?? 0) - (b.option.value ?? 0))
    : rng.shuffle(tagged);

  return {
    kind: "choice",
    choices: ordered.map((entry) => entry.option.display),
    correctIndex: ordered.findIndex((entry) => entry.correct),
    rationales: ordered.map((entry) => entry.why),
  };
}

/**
 * Build the exact question a reference describes. Deterministic: the same
 * reference always yields the same question, on the server and in the browser.
 */
export function buildQuestion(template: Template, ref: QuestionRef): Question {
  const level = resolveLevel(template, ref.level);
  const format = resolveFormat(template, ref.format);
  const rng = new Rng(mixSeed(`${template.id}:${level}`, ref.seed));
  const draft = template.build({ rng, level });

  if (draft.stem.trim().length === 0) {
    throw new QuestionBuildError(template.id, ref.seed, "empty stem");
  }
  if (draft.steps.length === 0) {
    throw new QuestionBuildError(template.id, ref.seed, "no worked solution");
  }
  if (draft.answer.value !== undefined && !Number.isFinite(draft.answer.value)) {
    throw new QuestionBuildError(template.id, ref.seed, "non-finite answer");
  }

  let answer: ChoiceAnswer | NumericAnswer;
  if (format === "numeric") {
    if (draft.answer.value === undefined) {
      throw new QuestionBuildError(template.id, ref.seed, "typed answer without a value");
    }
    answer = {
      kind: "numeric",
      value: draft.answer.value,
      display: draft.answer.display,
      tolerance: draft.tolerance ?? 0,
    };
  } else {
    answer = layoutChoices(template.id, ref.seed, draft, rng);
  }

  return {
    id: questionKey({ templateId: template.id, seed: ref.seed, level, format }),
    templateId: template.id,
    seed: ref.seed,
    level,
    format,
    skillId: template.skillId,
    title: template.title,
    stem: draft.stem,
    table: draft.table,
    answer,
    steps: draft.steps,
    hint: draft.hint,
    audit: draft.audit,
    insight: draft.insight,
    numericValue: draft.answer.value,
  };
}

/**
 * Build a new question, stepping the seed forward if a particular seed happens
 * to produce a degenerate draft. The returned question records the seed that
 * was actually used, so it can always be regenerated exactly.
 */
export function createQuestion(
  template: Template,
  level: Level,
  format: AnswerFormat,
  seed: number,
): Question {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const candidate = (seed + attempt) % 0x7fffffff;
    try {
      return buildQuestion(template, { templateId: template.id, seed: candidate, level, format });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new QuestionBuildError(template.id, seed, "could not build a question");
}

/** Stable identity for a question: template, seed, level and format. */
export function questionKey(ref: QuestionRef): string {
  return `${ref.templateId}@${ref.seed}@${ref.level}@${ref.format === "numeric" ? "n" : "c"}`;
}

/* ------------------------------------------------------------------ */
/* Grading                                                             */
/* ------------------------------------------------------------------ */

export interface ParsedEntry {
  readonly value: number;
  /** Digits typed after the decimal point; 0 for integers and fractions. */
  readonly decimals: number;
  readonly isFraction: boolean;
}

/**
 * Parse a typed answer the way the SAT's answer box does: an integer, a
 * decimal, or a single fraction, with an optional leading minus sign. Mixed
 * numbers, units, percent signs and stray text are rejected rather than
 * guessed at.
 */
export function parseEntry(text: string): ParsedEntry | null {
  const cleaned = text.trim().replace(/−/g, "-").replace(/(\d),(?=\d{3}\b)/g, "$1");
  if (cleaned.length === 0) return null;

  const fraction = /^(-?)(\d+)\s*\/\s*(\d+)$/.exec(cleaned);
  if (fraction !== null) {
    const denominator = Number.parseInt(fraction[3], 10);
    if (denominator === 0) return null;
    const magnitude = Number.parseInt(fraction[2], 10) / denominator;
    return { value: fraction[1] === "-" ? -magnitude : magnitude, decimals: 0, isFraction: true };
  }

  const decimal = /^(-?)(\d*)(?:\.(\d*))?$/.exec(cleaned);
  if (decimal === null) return null;
  const whole = decimal[2];
  const fractional = decimal[3] ?? "";
  if (whole.length === 0 && fractional.length === 0) return null;
  const magnitude = Number.parseFloat(`${whole.length > 0 ? whole : "0"}.${fractional || "0"}`);
  if (!Number.isFinite(magnitude)) return null;
  return {
    value: decimal[1] === "-" ? -magnitude : magnitude,
    decimals: fractional.length,
    isFraction: false,
  };
}

function roundTo(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.round((value + Math.sign(value) * 1e-12) * scale) / scale;
}

function truncateTo(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.trunc(value * scale + Math.sign(value) * 1e-9) / scale;
}

/**
 * Decide whether a typed number matches the key.
 *
 * An exact match always counts. A decimal that has been rounded or truncated
 * counts only if at least three decimal places were typed — the same rule the
 * SAT applies, so 2/3 may be entered as 0.666 or 0.667 but not as 0.67.
 * Templates that ask for a rounded answer supply an explicit tolerance instead.
 */
export function matchesNumeric(entry: ParsedEntry, key: NumericAnswer): boolean {
  const scale = Math.max(1, Math.abs(key.value));
  if (Math.abs(entry.value - key.value) <= 1e-9 * scale) return true;
  if (key.tolerance > 0) return Math.abs(entry.value - key.value) <= key.tolerance + 1e-12;
  if (entry.isFraction || entry.decimals < 3) return false;
  const rounded = roundTo(key.value, entry.decimals);
  const truncated = truncateTo(key.value, entry.decimals);
  return (
    Math.abs(entry.value - rounded) <= 1e-9 * scale ||
    Math.abs(entry.value - truncated) <= 1e-9 * scale
  );
}

/** True when the response is the correct answer to the question. */
export function isCorrect(question: Question, response: Response | null): boolean {
  if (response === null) return false;
  if (question.answer.kind === "choice") {
    return response.kind === "choice" && response.index === question.answer.correctIndex;
  }
  if (response.kind !== "numeric") return false;
  const entry = parseEntry(response.text);
  return entry !== null && matchesNumeric(entry, question.answer);
}

/** Whether a response has been given at all (a blank box is not an answer). */
export function isAnswered(response: Response | null): boolean {
  if (response === null) return false;
  return response.kind === "choice" ? response.index >= 0 : response.text.trim().length > 0;
}
