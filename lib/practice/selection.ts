/**
 * Choosing what a student sees next.
 *
 * Practice is adaptive in two ways. The skill is chosen by Thompson sampling —
 * draw one plausible ability for every skill from its posterior and practice
 * the one that comes out lowest — which spends most questions on weak skills
 * while still visiting skills the report is unsure about. The difficulty is
 * then matched to the student's estimated ability on that skill, aiming for a
 * question they should get right roughly two times in three.
 */

import { createQuestion } from "@/lib/practice/question";
import { templatesForSkill } from "@/lib/practice/registry";
import { mixSeed, Rng } from "@/lib/practice/rng";
import { getCourse, skillsInCourse, skillsInDomain } from "@/lib/practice/taxonomy";
import type {
  AnswerFormat,
  CourseId,
  DomainId,
  Level,
  MasteryReport,
  Question,
  Template,
} from "@/types/practice";

export type PracticeFocus =
  | { readonly kind: "smart" }
  | { readonly kind: "domain"; readonly domain: DomainId }
  | { readonly kind: "skill"; readonly skill: string };

/** The level a student of ability θ should be stretched by, not defeated by. */
export function levelFor(theta: number): Level {
  if (theta < -0.45) return 1;
  if (theta < 0.75) return 2;
  return 3;
}

export function candidateSkills(course: CourseId, focus: PracticeFocus): readonly string[] {
  if (focus.kind === "skill") return [focus.skill];
  if (focus.kind === "domain") return skillsInDomain(focus.domain).map((skill) => skill.id);
  return skillsInCourse(course).map((skill) => skill.id);
}

/** Thompson sampling over the candidate skills: weakest plausible skill wins. */
export function pickSkill(
  candidates: readonly string[],
  report: MasteryReport,
  rng: Rng,
  avoid: readonly string[] = [],
): string {
  const pool = candidates.filter((skill) => templatesForSkill(skill).length > 0);
  if (pool.length === 0) return candidates[0];
  const eligible = pool.length > avoid.length ? pool.filter((skill) => !avoid.includes(skill)) : pool;
  let best = eligible[0];
  let lowest = Number.POSITIVE_INFINITY;
  for (const skill of eligible) {
    const mastery = report.skills[skill];
    const draw = mastery === undefined ? rng.normal() : mastery.theta + mastery.sd * rng.normal();
    if (draw < lowest) {
      lowest = draw;
      best = skill;
    }
  }
  return best;
}

/** A template for the skill, preferring ones not seen recently. */
export function pickTemplate(
  skill: string,
  level: Level,
  rng: Rng,
  recentTemplates: readonly string[] = [],
): Template | null {
  const all = templatesForSkill(skill);
  if (all.length === 0) return null;
  const atLevel = all.filter((template) => template.levels.includes(level));
  const base = atLevel.length > 0 ? atLevel : all;
  const fresh = base.filter((template) => !recentTemplates.includes(template.id));
  return rng.pick(fresh.length > 0 ? fresh : base);
}

export interface NextQuestionInput {
  readonly course: CourseId;
  readonly focus: PracticeFocus;
  readonly report: MasteryReport;
  /** Fresh entropy for this pick. */
  readonly seed: number;
  /** Template ids of the last few questions, oldest first. */
  readonly recentTemplates?: readonly string[];
  /** Skills of the last couple of questions, to avoid immediate repeats. */
  readonly recentSkills?: readonly string[];
}

/** Share of practice questions asked as typed answers when the template allows it. */
const TYPED_SHARE = 0.25;

export function nextPracticeQuestion(input: NextQuestionInput): Question | null {
  const rng = new Rng(mixSeed("practice", input.seed));
  const candidates = candidateSkills(input.course, input.focus);
  const skill = pickSkill(
    candidates,
    input.report,
    rng,
    input.focus.kind === "skill" ? [] : (input.recentSkills ?? []),
  );
  const mastery = input.report.skills[skill];
  const matched = levelFor(mastery?.theta ?? 0);
  // Mostly the matched level, sometimes a neighbor, so the estimate keeps moving.
  const roll = rng.float();
  const level: Level =
    roll < 0.7 ? matched : roll < 0.85 ? (Math.max(1, matched - 1) as Level) : (Math.min(3, matched + 1) as Level);
  const template = pickTemplate(skill, level, rng, input.recentTemplates ?? []);
  if (template === null) return null;
  const format: AnswerFormat =
    template.formats.includes("numeric") && rng.bool(TYPED_SHARE) ? "numeric" : "choice";
  return createQuestion(template, level, format, input.seed);
}

/* ------------------------------------------------------------------ */
/* Diagnostic                                                          */
/* ------------------------------------------------------------------ */

const MIN_DIAGNOSTIC_LENGTH = 12;

/**
 * The skills a diagnostic visits, in order: every skill of the course once,
 * domain by domain, then extra questions until the test is long enough to say
 * something. The order within the plan is shuffled per seed.
 */
export function diagnosticPlan(course: CourseId, seed: number): string[] {
  const rng = new Rng(mixSeed(`diagnostic:${course}`, seed));
  const plan: string[] = [];
  for (const domain of getCourse(course).domains) {
    plan.push(...rng.shuffle(skillsInDomain(domain).map((skill) => skill.id)));
  }
  const extras = rng.shuffle(plan);
  let cursor = 0;
  while (plan.length < MIN_DIAGNOSTIC_LENGTH && extras.length > 0) {
    plan.push(extras[cursor % extras.length]);
    cursor += 1;
  }
  return plan;
}

/** The question at one position of a diagnostic, matched to the running ability. */
export function diagnosticQuestion(
  plan: readonly string[],
  index: number,
  theta: number,
  seed: number,
  usedTemplates: readonly string[],
): Question | null {
  const skill = plan[index];
  if (skill === undefined) return null;
  const rng = new Rng(mixSeed(`diagnostic-item:${index}`, seed));
  const level = levelFor(theta);
  const template = pickTemplate(skill, level, rng, usedTemplates);
  if (template === null) return null;
  return createQuestion(template, level, "choice", mixSeed(`${skill}:${index}`, seed) % 0x7fffffff);
}
