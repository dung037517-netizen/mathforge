/**
 * A simulated student, for showing what the reports look like.
 *
 * Nothing here is real usage data. The responses are drawn from the same
 * response model the site scores with, for an imaginary student whose
 * ability on each skill starts below average and improves with practice.
 * Wherever this data is shown, the page says that it is simulated.
 */

import { itemParameters, probabilityCorrect } from "@/lib/practice/irt";
import { DAY_MS } from "@/lib/practice/mastery";
import {
  BLUEPRINTS,
  buildFirstModule,
  buildSecondModule,
  estimateScore,
  routeFor,
} from "@/lib/practice/mock";
import { regenerate, templatesForSkill } from "@/lib/practice/registry";
import { addMiss, gradeCard, cardKey } from "@/lib/practice/review";
import { mixSeed, Rng } from "@/lib/practice/rng";
import { levelFor } from "@/lib/practice/selection";
import { emptyProgress } from "@/lib/practice/storage";
import { skillsInCourse } from "@/lib/practice/taxonomy";
import type {
  AttemptRecord,
  CourseId,
  MockItem,
  MockModuleResult,
  MockResponse,
  MockResult,
  ProgressState,
  Question,
  Response,
  ReviewCard,
} from "@/types/practice";

const SAMPLE_SEED = 20260214;
const DAYS = 35;

function simulatedResponse(question: Question, correct: boolean, rng: Rng): Response {
  if (question.answer.kind === "choice") {
    if (correct) return { kind: "choice", index: question.answer.correctIndex };
    const wrong = [0, 1, 2, 3].filter((index) => question.answer.kind === "choice" && index !== question.answer.correctIndex);
    return { kind: "choice", index: rng.pick(wrong) };
  }
  const value = question.answer.value;
  const typed = correct ? value : value + rng.pick([-2, -1, 1, 2]);
  return { kind: "numeric", text: String(Math.round(typed * 1000) / 1000) };
}

/** Build the sample student's history, ending just before `now`. */
export function buildSampleProgress(now: number, course: CourseId = "sat"): ProgressState {
  const rng = new Rng(SAMPLE_SEED);
  const skills = skillsInCourse(course);
  const start = now - DAYS * DAY_MS;

  // Each skill has its own starting point and its own rate of improvement.
  const ability = new Map<string, number>();
  const growth = new Map<string, number>();
  for (const skill of skills) {
    ability.set(skill.id, -0.9 + 0.5 * rng.normal());
    growth.set(skill.id, 0.05 + 0.05 * rng.float());
  }
  // A couple of deliberately weak skills, so the report has something to say.
  const weak = rng.shuffle(skills).slice(0, 3);
  for (const skill of weak) {
    ability.set(skill.id, (ability.get(skill.id) ?? 0) - 0.9);
    growth.set(skill.id, 0.015);
  }

  const attempts: AttemptRecord[] = [];
  let cards: ReviewCard[] = [];
  let resolved = 0;
  const mocks: MockResult[] = [];

  const answer = (question: Question, at: number, source: AttemptRecord["source"], ms: number): boolean => {
    const theta = ability.get(question.skillId) ?? 0;
    const correct = rng.bool(probabilityCorrect(theta, itemParameters(question.level, question.format)));
    const attempt: AttemptRecord = {
      templateId: question.templateId,
      seed: question.seed,
      level: question.level,
      format: question.format,
      skillId: question.skillId,
      at,
      correct,
      ms,
      source,
    };
    attempts.push(attempt);
    if (!correct) cards = addMiss(cards, attempt, at);
    ability.set(question.skillId, theta + (growth.get(question.skillId) ?? 0));
    return correct;
  };

  const pickQuestion = (skillId: string, salt: number): Question | null => {
    const templates = templatesForSkill(skillId);
    if (templates.length === 0) return null;
    const template = rng.pick(templates);
    const level = levelFor((ability.get(skillId) ?? 0) + 0.3 * rng.normal());
    return regenerate({
      templateId: template.id,
      seed: mixSeed(`sample:${skillId}`, salt) % 0x7fffffff,
      level,
      format: template.formats.includes("numeric") && rng.bool(0.25) ? "numeric" : "choice",
    });
  };

  const sitMock = (at: number, salt: number): void => {
    if (course !== "sat") return;
    const seed = mixSeed("sample-mock", salt) % 0x7fffffff;
    const sit = (items: readonly MockItem[], offset: number): MockModuleResult => {
      const responses: MockResponse[] = items.map((item) => {
        const question = regenerate(item);
        if (question === null) return { response: null, correct: false, ms: 0, flagged: false };
        const ms = Math.round(45_000 + 60_000 * rng.float());
        const correct = answer(question, at + offset, "mock", ms);
        return { response: simulatedResponse(question, correct, rng), correct, ms, flagged: rng.bool(0.08) };
      });
      return { items: [...items], responses, secondsUsed: BLUEPRINTS.full.secondsPerModule - rng.int(20, 240) };
    };
    const firstItems = buildFirstModule("full", seed);
    const first = sit(firstItems, 0);
    const route = routeFor(first.items, first.responses);
    const second = sit(buildSecondModule("full", seed, route, firstItems), 40 * 60_000);
    mocks.push({
      id: `sample-mock-${salt}`,
      kind: "full",
      seed,
      startedAt: at,
      finishedAt: at + 75 * 60_000,
      route,
      modules: [first, second],
      estimate: estimateScore([first, second]),
    });
  };

  let salt = 1;
  for (let day = 0; day < DAYS; day += 1) {
    const morning = start + day * DAY_MS + 17 * 3_600_000;
    if (day === 0) {
      // Day one: the diagnostic, one question per skill.
      skills.forEach((skill, index) => {
        const question = pickQuestion(skill.id, salt);
        salt += 1;
        if (question !== null) answer(question, morning + index * 70_000, "diagnostic", 55_000 + rng.int(0, 40_000));
      });
      continue;
    }
    if (day === 12 || day === 30) {
      sitMock(morning, day);
      continue;
    }
    if (rng.bool(0.3)) continue; // a day off

    // Review whatever is due, then practice the weaker skills.
    const due = cards.filter((card) => card.dueAt <= morning).slice(0, 5);
    due.forEach((card, index) => {
      const question = regenerate({ ...card, seed: mixSeed(`sample-review:${card.templateId}`, salt) % 0x7fffffff });
      salt += 1;
      if (question === null) return;
      const theta = (ability.get(card.skillId) ?? 0) + 0.35;
      const correct = rng.bool(probabilityCorrect(theta, itemParameters(question.level, question.format)));
      attempts.push({
        templateId: question.templateId,
        seed: question.seed,
        level: question.level,
        format: question.format,
        skillId: question.skillId,
        at: morning + index * 80_000,
        correct,
        ms: 50_000 + rng.int(0, 50_000),
        source: "review",
      });
      const outcome = gradeCard(cards, cardKey(card), correct, morning + index * 80_000);
      cards = outcome.cards;
      if (outcome.resolved) resolved += 1;
      ability.set(card.skillId, (ability.get(card.skillId) ?? 0) + 0.03);
    });

    const count = rng.int(6, 12);
    for (let index = 0; index < count; index += 1) {
      const ranked = [...skills].sort((a, b) => (ability.get(a.id) ?? 0) - (ability.get(b.id) ?? 0));
      const skill = rng.bool(0.65) ? ranked[rng.int(0, Math.min(5, ranked.length - 1))] : rng.pick(skills);
      const question = pickQuestion(skill.id, salt);
      salt += 1;
      if (question !== null) answer(question, morning + (index + 6) * 85_000, "practice", 40_000 + rng.int(0, 70_000));
    }
  }

  attempts.sort((a, b) => a.at - b.at);
  const answeredOnDayOne = attempts.filter((attempt) => attempt.source === "diagnostic");
  return {
    ...emptyProgress(start, course),
    attempts,
    cards,
    mocks,
    diagnostics: [
      {
        course,
        at: start + 17 * 3_600_000,
        answered: answeredOnDayOne.length,
        correct: answeredOnDayOne.filter((attempt) => attempt.correct).length,
      },
    ],
    resolved,
  };
}
