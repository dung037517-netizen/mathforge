/**
 * The mistake notebook.
 *
 * Every missed question becomes a card. Cards come back on a widening
 * schedule (a Leitner system): a card answered correctly moves up a box and
 * waits longer; a card answered incorrectly returns to the first box. A card
 * that survives every box is resolved and leaves the notebook.
 *
 * A card is reviewed with a fresh variant of the same template — the same
 * idea with new numbers — so a student cannot pass it by remembering the
 * answer to the question they got wrong.
 */

import { DAY_MS } from "@/lib/practice/mastery";
import { questionKey } from "@/lib/practice/question";
import { mixSeed } from "@/lib/practice/rng";
import type { QuestionRef, ReviewCard } from "@/types/practice";

/** Days a card waits in each box before it is due again. */
export const REVIEW_INTERVALS_DAYS: readonly number[] = [0, 1, 3, 7, 14];

/** A card answered correctly in the last box is resolved. */
export const FINAL_BOX = REVIEW_INTERVALS_DAYS.length - 1;

export function cardKey(ref: QuestionRef): string {
  return questionKey(ref);
}

/** File a missed question, or send an existing card back to the first box. */
export function addMiss(
  cards: readonly ReviewCard[],
  ref: QuestionRef & { readonly skillId: string },
  now: number,
): ReviewCard[] {
  const key = cardKey(ref);
  const existing = cards.find((card) => cardKey(card) === key);
  if (existing !== undefined) {
    return cards.map((card) =>
      card === existing ? { ...card, box: 0, dueAt: now, lapses: card.lapses + 1 } : card,
    );
  }
  return [
    ...cards,
    {
      templateId: ref.templateId,
      seed: ref.seed,
      level: ref.level,
      format: ref.format,
      skillId: ref.skillId,
      box: 0,
      dueAt: now,
      addedAt: now,
      lapses: 0,
    },
  ];
}

export interface GradeOutcome {
  readonly cards: ReviewCard[];
  /** True when the card was answered correctly in the last box and removed. */
  readonly resolved: boolean;
  /** The box the card is in after grading, or null if it was resolved. */
  readonly box: number | null;
}

/** Apply the result of reviewing one card. */
export function gradeCard(
  cards: readonly ReviewCard[],
  key: string,
  correct: boolean,
  now: number,
): GradeOutcome {
  const card = cards.find((entry) => cardKey(entry) === key);
  if (card === undefined) return { cards: [...cards], resolved: false, box: null };
  if (!correct) {
    return {
      cards: cards.map((entry) =>
        entry === card ? { ...entry, box: 0, dueAt: now + DAY_MS / 24, lapses: entry.lapses + 1 } : entry,
      ),
      resolved: false,
      box: 0,
    };
  }
  if (card.box >= FINAL_BOX) {
    return { cards: cards.filter((entry) => entry !== card), resolved: true, box: null };
  }
  const box = card.box + 1;
  return {
    cards: cards.map((entry) =>
      entry === card ? { ...entry, box, dueAt: now + REVIEW_INTERVALS_DAYS[box] * DAY_MS } : entry,
    ),
    resolved: false,
    box,
  };
}

/** Cards due now, most overdue first. */
export function dueCards(cards: readonly ReviewCard[], now: number): ReviewCard[] {
  return cards.filter((card) => card.dueAt <= now).sort((a, b) => a.dueAt - b.dueAt);
}

/** When the next card becomes due, or null if the notebook is empty. */
export function nextDueAt(cards: readonly ReviewCard[]): number | null {
  if (cards.length === 0) return null;
  return Math.min(...cards.map((card) => card.dueAt));
}

/** The same template, level and format with new numbers. */
export function freshVariant(card: ReviewCard, salt: number): QuestionRef {
  return {
    templateId: card.templateId,
    level: card.level,
    format: card.format,
    seed: mixSeed(`review:${card.templateId}:${card.seed}`, salt) % 0x7fffffff,
  };
}

/** "today", "tomorrow", "in 6 days" — for the notebook list. */
export function describeDue(dueAt: number, now: number): string {
  if (dueAt <= now) return "due now";
  const days = Math.ceil((dueAt - now) / DAY_MS);
  if (days <= 1) return "due tomorrow";
  return `due in ${days} days`;
}
