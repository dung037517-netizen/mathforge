/**
 * Mock tests in the format of the digital SAT Math section.
 *
 * Two timed modules. The first mixes easy, medium and hard questions. The
 * second is assembled after the first is submitted: a student who did well is
 * routed to a harder module, everyone else to an easier one — the same
 * multistage adaptive design the real test uses. The domain mix follows the
 * published content specification for the section.
 *
 * The score is an estimate. It is produced by this site's own response model,
 * has never been equated against official results, and is reported with a
 * range for that reason.
 */

import { estimateAbility, type ScoredResponse } from "@/lib/practice/irt";
import { createQuestion, isCorrect } from "@/lib/practice/question";
import { regenerate, templatesForDomain } from "@/lib/practice/registry";
import { mixSeed, Rng } from "@/lib/practice/rng";
import { findSkill } from "@/lib/practice/taxonomy";
import type {
  AnswerFormat,
  DomainId,
  Level,
  MockBlueprint,
  MockItem,
  MockKind,
  MockModuleResult,
  MockResponse,
  MockResult,
  MockSession,
  ModuleRoute,
  Response,
  ScoreEstimate,
  Template,
} from "@/types/practice";

export const SAT_DOMAINS: readonly DomainId[] = ["sat-algebra", "sat-advanced", "sat-data", "sat-geometry"];

export const BLUEPRINTS: Readonly<Record<MockKind, MockBlueprint>> = {
  full: {
    kind: "full",
    name: "Full-length Math section",
    questionsPerModule: 22,
    secondsPerModule: 35 * 60,
    domainQuota: { "sat-algebra": 7, "sat-advanced": 7, "sat-data": 4, "sat-geometry": 4 },
    numericPerModule: 5,
  },
  quick: {
    kind: "quick",
    name: "Half-length practice set",
    questionsPerModule: 11,
    secondsPerModule: 17 * 60 + 30,
    domainQuota: { "sat-algebra": 4, "sat-advanced": 3, "sat-data": 2, "sat-geometry": 2 },
    numericPerModule: 3,
  },
};

type Stage = "first" | ModuleRoute;

/** Share of easy, medium and hard questions in each kind of module. */
const LEVEL_MIX: Readonly<Record<Stage, readonly [number, number, number]>> = {
  first: [0.32, 0.41, 0.27],
  lower: [0.46, 0.41, 0.13],
  higher: [0.13, 0.41, 0.46],
};

/** Module-one ability at or above which the harder second module is given. */
export const ROUTING_THRESHOLD = 0.1;

function levelTargets(count: number, stage: Stage): Record<Level, number> {
  const [easy, medium] = LEVEL_MIX[stage];
  const easyCount = Math.round(count * easy);
  const mediumCount = Math.round(count * medium);
  return { 1: easyCount, 2: mediumCount, 3: count - easyCount - mediumCount };
}

interface Draft {
  readonly template: Template;
  readonly level: Level;
}

/**
 * Choose the templates and levels for one module.
 *
 * Hard and easy questions are scarcer in the bank than medium ones, so they
 * are placed first, drawing from whichever domains still have room; medium
 * questions then fill what is left. Every domain ends up with exactly its
 * quota, and no template is used twice in a test.
 */
function draftModule(
  blueprint: MockBlueprint,
  stage: Stage,
  usedTemplates: ReadonlySet<string>,
  rng: Rng,
): Draft[] {
  const used = new Set(usedTemplates);
  const room = new Map<DomainId, number>(
    SAT_DOMAINS.map((domain) => [domain, blueprint.domainQuota[domain] ?? 0]),
  );
  const targets = levelTargets(blueprint.questionsPerModule, stage);
  const drafts: Draft[] = [];

  const place = (template: Template, level: Level, domain: DomainId): void => {
    used.add(template.id);
    room.set(domain, (room.get(domain) ?? 0) - 1);
    drafts.push({ template, level });
  };

  /** Place up to `count` questions at a level; returns how many could not be placed. */
  const fill = (level: Level, count: number): number => {
    for (let placed = 0; placed < count; placed += 1) {
      const options = SAT_DOMAINS.flatMap((domain) => {
        const left = room.get(domain) ?? 0;
        if (left <= 0) return [];
        const pool = templatesForDomain(domain).filter(
          (template) => !used.has(template.id) && template.levels.includes(level),
        );
        return pool.length > 0 ? [{ domain, pool, left }] : [];
      });
      if (options.length === 0) return count - placed;
      // Favor the domains with the most room left, so every domain gets a mix of levels.
      const total = options.reduce((sum, option) => sum + option.left, 0);
      let roll = rng.float() * total;
      let chosen = options[options.length - 1];
      for (const option of options) {
        roll -= option.left;
        if (roll < 0) {
          chosen = option;
          break;
        }
      }
      place(rng.pick(chosen.pool), level, chosen.domain);
    }
    return 0;
  };

  const shortHard = fill(3, targets[3]);
  const shortEasy = fill(1, targets[1]);
  fill(2, targets[2] + shortHard + shortEasy);

  // If a domain still has room (its medium templates ran out), use whatever is left.
  for (const domain of SAT_DOMAINS) {
    while ((room.get(domain) ?? 0) > 0) {
      const pool = templatesForDomain(domain);
      const unused = pool.filter((template) => !used.has(template.id));
      const template = rng.pick(unused.length > 0 ? unused : pool);
      const level = [...template.levels].sort((a, b) => Math.abs(a - 2) - Math.abs(b - 2))[0];
      place(template, level, domain);
    }
  }
  return rng.shuffle(drafts);
}

function buildModule(
  kind: MockKind,
  seed: number,
  stage: Stage,
  usedTemplates: ReadonlySet<string>,
): MockItem[] {
  const blueprint = BLUEPRINTS[kind];
  const rng = new Rng(mixSeed(`mock:${kind}:${stage}`, seed));
  const drafts = draftModule(blueprint, stage, usedTemplates, rng);

  // Typed answers go to templates that support them, spread through the module.
  const typedCapable = rng.shuffle(
    drafts.map((draft, index) => ({ index, ok: draft.template.formats.includes("numeric") })).filter((entry) => entry.ok),
  );
  const typed = new Set(typedCapable.slice(0, blueprint.numericPerModule).map((entry) => entry.index));

  const items = drafts.map((draft, index): MockItem => {
    const format: AnswerFormat = typed.has(index) ? "numeric" : "choice";
    const question = createQuestion(
      draft.template,
      draft.level,
      format,
      mixSeed(`${kind}:${stage}:${index}`, seed) % 0x7fffffff,
    );
    return {
      templateId: question.templateId,
      seed: question.seed,
      level: question.level,
      format: question.format,
      skillId: question.skillId,
    };
  });

  // Easier questions first, as on the real test.
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.level - b.item.level || a.index - b.index)
    .map((entry) => entry.item);
}

export function buildFirstModule(kind: MockKind, seed: number): MockItem[] {
  return buildModule(kind, seed, "first", new Set());
}

export function buildSecondModule(
  kind: MockKind,
  seed: number,
  route: ModuleRoute,
  first: readonly MockItem[],
): MockItem[] {
  return buildModule(kind, seed, route, new Set(first.map((item) => item.templateId)));
}

function scored(items: readonly MockItem[], responses: readonly MockResponse[]): ScoredResponse[] {
  return items.map((item, index) => ({
    level: item.level,
    format: item.format,
    correct: responses[index]?.correct ?? false,
  }));
}

/** Which second module a student is routed to after the first. */
export function routeFor(items: readonly MockItem[], responses: readonly MockResponse[]): ModuleRoute {
  return estimateAbility(scored(items, responses)).theta >= ROUTING_THRESHOLD ? "higher" : "lower";
}

/** Points on the 200–800 scale per unit of ability. */
const SCALE_SLOPE = 105;
const SCALE_CENTER = 500;
const SCORE_PRIOR_SD = 1.5;

function toScale(theta: number): number {
  const raw = SCALE_CENTER + SCALE_SLOPE * theta;
  return Math.min(800, Math.max(200, Math.round(raw / 10) * 10));
}

/**
 * Estimated section score from every response on the test. Unanswered
 * questions count as incorrect, as they do on the real test.
 */
export function estimateScore(modules: readonly MockModuleResult[]): ScoreEstimate {
  const responses = modules.flatMap((part) => scored(part.items, part.responses));
  const { theta, sd } = estimateAbility(responses, 0, SCORE_PRIOR_SD);
  const right = responses.filter((response) => response.correct).length;
  // As on the real test, a perfect paper earns the top of the scale and a
  // blank one the bottom, whatever the model's prior would say.
  const score =
    responses.length > 0 && right === responses.length ? 800 : right === 0 ? 200 : toScale(theta);
  const spread = Math.max(20, Math.ceil((SCALE_SLOPE * sd) / 10) * 10);
  return {
    score,
    low: Math.max(200, score - spread),
    high: Math.min(800, score + spread),
    theta,
    sd,
  };
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

function blank<T>(length: number, value: T): T[] {
  return Array.from({ length }, () => value);
}

export function startMock(kind: MockKind, seed: number, now: number): MockSession {
  const first = buildFirstModule(kind, seed);
  return {
    id: `mock-${now.toString(36)}-${seed.toString(36)}`,
    kind,
    seed,
    startedAt: now,
    moduleIndex: 0,
    route: null,
    modules: [first],
    answers: [blank<Response | null>(first.length, null)],
    flags: [blank(first.length, false)],
    timeSpent: [blank(first.length, 0)],
    secondsLeft: BLUEPRINTS[kind].secondsPerModule,
    savedAt: now,
    firstModule: null,
  };
}

/** Grade the current module of a session. */
export function gradeModule(session: MockSession, moduleIndex: number): MockModuleResult {
  const items = session.modules[moduleIndex];
  const answers = session.answers[moduleIndex];
  const flags = session.flags[moduleIndex];
  const times = session.timeSpent[moduleIndex];
  const responses = items.map((item, index): MockResponse => {
    const question = regenerate(item);
    const response = answers[index] ?? null;
    return {
      response,
      correct: question !== null && isCorrect(question, response),
      ms: times[index] ?? 0,
      flagged: flags[index] ?? false,
    };
  });
  const secondsUsed = BLUEPRINTS[session.kind].secondsPerModule - Math.max(0, session.secondsLeft);
  return { items, responses, secondsUsed };
}

/** Submit module one: grade it, route the student and assemble module two. */
export function advanceToSecondModule(session: MockSession, now: number): MockSession {
  const first = gradeModule(session, 0);
  const route = routeFor(first.items, first.responses);
  const second = buildSecondModule(session.kind, session.seed, route, first.items);
  return {
    ...session,
    moduleIndex: 1,
    route,
    modules: [session.modules[0], second],
    answers: [session.answers[0], blank<Response | null>(second.length, null)],
    flags: [session.flags[0], blank(second.length, false)],
    timeSpent: [session.timeSpent[0], blank(second.length, 0)],
    secondsLeft: BLUEPRINTS[session.kind].secondsPerModule,
    savedAt: now,
    firstModule: first,
  };
}

/** Submit module two and score the whole test. */
export function finishMock(session: MockSession, now: number): MockResult | null {
  if (session.firstModule === null || session.route === null) return null;
  const second = gradeModule(session, 1);
  const modules: [MockModuleResult, MockModuleResult] = [session.firstModule, second];
  return {
    id: session.id,
    kind: session.kind,
    seed: session.seed,
    startedAt: session.startedAt,
    finishedAt: now,
    route: session.route,
    modules,
    estimate: estimateScore(modules),
  };
}

/* ------------------------------------------------------------------ */
/* Reporting                                                           */
/* ------------------------------------------------------------------ */

export interface Tally {
  readonly correct: number;
  readonly total: number;
}

export interface MockBreakdown {
  readonly overall: Tally;
  readonly domains: Readonly<Record<string, Tally>>;
  readonly skills: Readonly<Record<string, Tally>>;
  readonly unanswered: number;
  /** Median time per question, in seconds. */
  readonly medianSeconds: number;
}

function bump(map: Record<string, { correct: number; total: number }>, key: string, correct: boolean): void {
  const entry = map[key] ?? { correct: 0, total: 0 };
  entry.total += 1;
  if (correct) entry.correct += 1;
  map[key] = entry;
}

export function breakdown(result: MockResult): MockBreakdown {
  const domains: Record<string, { correct: number; total: number }> = {};
  const skills: Record<string, { correct: number; total: number }> = {};
  let correct = 0;
  let total = 0;
  let unanswered = 0;
  const times: number[] = [];
  for (const part of result.modules) {
    part.items.forEach((item, index) => {
      const response = part.responses[index];
      const right = response?.correct ?? false;
      total += 1;
      if (right) correct += 1;
      if (response === undefined || response.response === null) unanswered += 1;
      else times.push(response.ms / 1000);
      bump(skills, item.skillId, right);
      const domain = findSkill(item.skillId)?.domain;
      if (domain !== undefined) bump(domains, domain, right);
    });
  }
  times.sort((a, b) => a - b);
  const medianSeconds =
    times.length === 0
      ? 0
      : times.length % 2 === 1
        ? times[(times.length - 1) / 2]
        : (times[times.length / 2 - 1] + times[times.length / 2]) / 2;
  return { overall: { correct, total }, domains, skills, unanswered, medianSeconds };
}

/** "34:59" from a number of seconds. */
export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${String(safe % 60).padStart(2, "0")}`;
}
