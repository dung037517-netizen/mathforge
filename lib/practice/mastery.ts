/**
 * From a history of answers to a mastery report.
 *
 * Three ideas, each borrowed from how actuaries treat thin data:
 *
 *  1. Recency. An answer's weight halves every {@link HALF_LIFE_DAYS} days, so
 *     the report follows what a student can do now rather than averaging over
 *     everything they have ever done.
 *
 *  2. Credibility. Ability is modeled at three nested levels — the course, its
 *     domains, and the skills inside each domain:
 *
 *         θ_course ~ N(0, σ_c²)
 *         θ_domain | θ_course ~ N(θ_course, σ_d²)
 *         θ_skill  | θ_domain ~ N(θ_domain,  σ_s²)
 *
 *     A skill with only a few answers is therefore not judged on those answers
 *     alone: it borrows strength from the rest of its domain, and the domain
 *     from the rest of the course, in exact proportion to how little is known
 *     about it. This is the partial pooling behind a credibility-weighted
 *     premium, and it is computed here exactly (on a grid) by passing
 *     messages up and down the tree.
 *
 *  3. Honest uncertainty. Every estimate carries a posterior standard
 *     deviation, and a skill with too little evidence is reported as unknown
 *     rather than given a number.
 */

import {
  addScaled,
  emptyRow,
  expectation,
  itemParameters,
  logLikelihoodRow,
  masteryFromTheta,
  scaleRow,
  summarize,
  THETA_GRID,
} from "@/lib/practice/irt";
import { DOMAINS, SKILLS, getCourse, skillsInCourse } from "@/lib/practice/taxonomy";
import type {
  AttemptRecord,
  CourseId,
  DomainId,
  Mastery,
  MasteryBand,
  MasteryReport,
  Skill,
  TimelinePoint,
} from "@/types/practice";

export const HALF_LIFE_DAYS = 30;
export const DAY_MS = 86_400_000;

/** Prior spread of overall ability, on the logit scale. */
export const COURSE_SD = 1.2;
/** How far a domain typically sits from the course as a whole. */
export const DOMAIN_SD = 0.7;
/** How far a skill typically sits from its domain. */
export const SKILL_SD = 0.6;
/** Below this much decayed evidence an estimate is reported as unknown. */
export const MIN_EVIDENCE = 1.5;

export function decayWeight(elapsedMs: number): number {
  if (elapsedMs <= 0) return 1;
  return 0.5 ** (elapsedMs / (HALF_LIFE_DAYS * DAY_MS));
}

export function masteryBand(value: number, evidence: number): MasteryBand {
  if (evidence < MIN_EVIDENCE) return "unknown";
  if (value < 0.45) return "needs-work";
  if (value < 0.65) return "developing";
  if (value < 0.8) return "proficient";
  return "strong";
}

export const BAND_LABELS: Readonly<Record<MasteryBand, string>> = {
  unknown: "Not enough data",
  "needs-work": "Needs work",
  developing: "Developing",
  proficient: "Proficient",
  strong: "Strong",
};

/* ------------------------------------------------------------------ */
/* Evidence                                                            */
/* ------------------------------------------------------------------ */

interface Evidence {
  /** Decayed log-likelihood of the skill's answers at each grid point. */
  readonly logLikelihood: Float64Array;
  evidence: number;
  attempts: number;
  correct: number;
  lastAt: number | null;
}

function noEvidence(): Evidence {
  return { logLikelihood: emptyRow(), evidence: 0, attempts: 0, correct: 0, lastAt: null };
}

interface CourseEvidence {
  readonly skills: Map<string, Evidence>;
  /** The clock the accumulated weights are expressed at. */
  asOf: number;
}

const SKILL_DOMAIN: ReadonlyMap<string, DomainId> = new Map(
  SKILLS.map((skill) => [skill.id, skill.domain]),
);

function createEvidence(course: CourseId, asOf: number): CourseEvidence {
  const skills = new Map<string, Evidence>();
  for (const skill of skillsInCourse(course)) skills.set(skill.id, noEvidence());
  return { skills, asOf };
}

/** Move the clock forward, discounting everything accumulated so far. */
function advance(state: CourseEvidence, to: number): void {
  if (to <= state.asOf) return;
  const factor = decayWeight(to - state.asOf);
  for (const entry of state.skills.values()) {
    if (entry.evidence === 0) continue;
    scaleRow(entry.logLikelihood, factor);
    entry.evidence *= factor;
  }
  state.asOf = to;
}

function absorb(state: CourseEvidence, attempt: AttemptRecord): void {
  const entry = state.skills.get(attempt.skillId);
  if (entry === undefined) return;
  const weight = decayWeight(state.asOf - attempt.at);
  addScaled(
    entry.logLikelihood,
    logLikelihoodRow(itemParameters(attempt.level, attempt.format), attempt.correct),
    weight,
  );
  entry.evidence += weight;
  entry.attempts += 1;
  if (attempt.correct) entry.correct += 1;
  entry.lastAt = entry.lastAt === null ? attempt.at : Math.max(entry.lastAt, attempt.at);
}

/* ------------------------------------------------------------------ */
/* Inference on the tree                                               */
/* ------------------------------------------------------------------ */

const SIZE = THETA_GRID.length;

/** K[i][j] ∝ N(grid_i; grid_j, sd²): how belief spreads between two levels. */
function gaussianKernel(sd: number): Float64Array {
  const kernel = new Float64Array(SIZE * SIZE);
  for (let i = 0; i < SIZE; i += 1) {
    for (let j = 0; j < SIZE; j += 1) {
      const z = (THETA_GRID[i] - THETA_GRID[j]) / sd;
      kernel[i * SIZE + j] = Math.exp(-0.5 * z * z);
    }
  }
  return kernel;
}

const DOMAIN_KERNEL = gaussianKernel(DOMAIN_SD);
const SKILL_KERNEL = gaussianKernel(SKILL_SD);

const COURSE_PRIOR: Float64Array = (() => {
  const prior = new Float64Array(SIZE);
  for (let i = 0; i < SIZE; i += 1) {
    const z = THETA_GRID[i] / COURSE_SD;
    prior[i] = Math.exp(-0.5 * z * z);
  }
  return prior;
})();

/** Scale a non-negative vector so its largest entry is 1 (keeps products finite). */
function rescale(vector: Float64Array): Float64Array {
  let peak = 0;
  for (const value of vector) if (value > peak) peak = value;
  if (peak > 0) for (let i = 0; i < vector.length; i += 1) vector[i] /= peak;
  return vector;
}

/** Pass a belief through a kernel: out[i] = Σ_j K[i][j] · v[j]. */
function spread(kernel: Float64Array, vector: Float64Array): Float64Array {
  const out = new Float64Array(SIZE);
  for (let i = 0; i < SIZE; i += 1) {
    let total = 0;
    const offset = i * SIZE;
    for (let j = 0; j < SIZE; j += 1) total += kernel[offset + j] * vector[j];
    out[i] = total;
  }
  return rescale(out);
}

function product(vectors: readonly Float64Array[]): Float64Array {
  const out = new Float64Array(SIZE).fill(1);
  for (const vector of vectors) {
    for (let i = 0; i < SIZE; i += 1) out[i] *= vector[i];
    rescale(out);
  }
  return out;
}

function likelihoodOf(entry: Evidence): Float64Array {
  let peak = Number.NEGATIVE_INFINITY;
  for (const value of entry.logLikelihood) if (value > peak) peak = value;
  const out = new Float64Array(SIZE);
  for (let i = 0; i < SIZE; i += 1) out[i] = Math.exp(entry.logLikelihood[i] - peak);
  return out;
}

function toWeights(belief: Float64Array): Float64Array {
  let total = 0;
  for (const value of belief) total += value;
  const weights = new Float64Array(SIZE);
  for (let i = 0; i < SIZE; i += 1) weights[i] = belief[i] / total;
  return weights;
}

interface Totals {
  readonly evidence: number;
  readonly attempts: number;
  readonly correct: number;
  readonly lastAt: number | null;
}

function totalsOf(entries: readonly Evidence[]): Totals {
  let evidence = 0;
  let attempts = 0;
  let correct = 0;
  let lastAt: number | null = null;
  for (const entry of entries) {
    evidence += entry.evidence;
    attempts += entry.attempts;
    correct += entry.correct;
    if (entry.lastAt !== null) lastAt = lastAt === null ? entry.lastAt : Math.max(lastAt, entry.lastAt);
  }
  return { evidence, attempts, correct, lastAt };
}

function toMastery(belief: Float64Array, totals: Totals): Mastery {
  const weights = toWeights(belief);
  const { theta, sd } = summarize(weights);
  const value = expectation(weights, masteryFromTheta);
  return {
    theta,
    sd,
    evidence: totals.evidence,
    value,
    low: masteryFromTheta(theta - sd),
    high: masteryFromTheta(theta + sd),
    band: masteryBand(value, totals.evidence),
    attempts: totals.attempts,
    correct: totals.correct,
    lastAt: totals.lastAt,
  };
}

interface DomainNode {
  readonly id: DomainId;
  readonly skills: readonly Skill[];
  readonly entries: readonly Evidence[];
  /** exp(log-likelihood) of each skill's own answers. */
  readonly likelihoods: readonly Float64Array[];
  /** Message from each skill up to the domain. */
  readonly skillUp: readonly Float64Array[];
  /** Product of the skill messages: everything the domain's answers say about it. */
  readonly inside: Float64Array;
  /** Message from the domain up to the course. */
  readonly up: Float64Array;
}

function buildTree(state: CourseEvidence, course: CourseId): DomainNode[] {
  const courseSkills = skillsInCourse(course);
  return getCourse(course).domains.map((id) => {
    const skills = courseSkills.filter((skill) => skill.domain === id);
    const entries = skills.map((skill) => state.skills.get(skill.id) ?? noEvidence());
    const likelihoods = entries.map(likelihoodOf);
    const skillUp = likelihoods.map((likelihood) => spread(SKILL_KERNEL, likelihood));
    const inside = product(skillUp);
    return { id, skills, entries, likelihoods, skillUp, inside, up: spread(DOMAIN_KERNEL, inside) };
  });
}

function report(state: CourseEvidence, course: CourseId, includeSkills: boolean): MasteryReport {
  const tree = buildTree(state, course);
  const courseBelief = product([COURSE_PRIOR, ...tree.map((node) => node.up)]);
  const courseMastery = toMastery(courseBelief, totalsOf(tree.flatMap((node) => node.entries)));

  const domains: Record<string, Mastery> = {};
  const skills: Record<string, Mastery> = {};

  tree.forEach((node, index) => {
    // What the rest of the course says about this domain.
    const others = tree.filter((_, other) => other !== index).map((other) => other.up);
    const down = spread(DOMAIN_KERNEL, product([COURSE_PRIOR, ...others]));
    domains[node.id] = toMastery(product([down, node.inside]), totalsOf(node.entries));
    if (!includeSkills) return;

    node.skills.forEach((skill, position) => {
      // What the rest of the domain (and, through it, the course) says about this skill.
      const siblings = node.skillUp.filter((_, other) => other !== position);
      const context = spread(SKILL_KERNEL, product([down, ...siblings]));
      skills[skill.id] = toMastery(product([context, node.likelihoods[position]]), totalsOf([node.entries[position]]));
    });
  });

  return { course: courseMastery, domains, skills };
}

function relevant(attempts: readonly AttemptRecord[], course: CourseId): AttemptRecord[] {
  const domains = new Set<DomainId>(getCourse(course).domains);
  return attempts
    .filter((attempt) => {
      const domain = SKILL_DOMAIN.get(attempt.skillId);
      return domain !== undefined && domains.has(domain);
    })
    .sort((a, b) => a.at - b.at);
}

/** The mastery report for one course as of `now`. */
export function computeMastery(
  attempts: readonly AttemptRecord[],
  course: CourseId,
  now: number,
): MasteryReport {
  const state = createEvidence(course, now);
  for (const attempt of relevant(attempts, course)) {
    if (attempt.at <= now) absorb(state, attempt);
  }
  return report(state, course, true);
}

/** Local calendar day of a timestamp, as `YYYY-MM-DD`. */
export function dayKey(at: number): string {
  const date = new Date(at);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Mastery at the end of every day on which the student practiced, so progress
 * can be charted. Each point is what the report would have said that evening.
 */
export function computeTimeline(
  attempts: readonly AttemptRecord[],
  course: CourseId,
): TimelinePoint[] {
  const ordered = relevant(attempts, course);
  if (ordered.length === 0) return [];
  const state = createEvidence(course, ordered[0].at);
  const points: TimelinePoint[] = [];

  let index = 0;
  while (index < ordered.length) {
    const key = dayKey(ordered[index].at);
    let answered = 0;
    let correct = 0;
    let last = ordered[index].at;
    while (index < ordered.length && dayKey(ordered[index].at) === key) {
      const attempt = ordered[index];
      advance(state, attempt.at);
      absorb(state, attempt);
      answered += 1;
      if (attempt.correct) correct += 1;
      last = attempt.at;
      index += 1;
    }
    const snapshot = report(state, course, false);
    const domains: Record<string, number> = {};
    for (const [domainId, mastery] of Object.entries(snapshot.domains)) domains[domainId] = mastery.value;
    points.push({ day: key, at: last, course: snapshot.course.value, domains, answered, correct });
  }
  return points;
}

export interface RankedSkill {
  readonly skill: Skill;
  readonly mastery: Mastery;
}

/** Skills with enough evidence, weakest first. */
export function rankSkills(masteryReport: MasteryReport, course: CourseId): RankedSkill[] {
  return skillsInCourse(course)
    .map((skill) => ({ skill, mastery: masteryReport.skills[skill.id] }))
    .filter((entry): entry is RankedSkill => entry.mastery !== undefined && entry.mastery.band !== "unknown")
    .sort((a, b) => a.mastery.value - b.mastery.value);
}

/** Skills the student has not yet answered enough questions on. */
export function unassessedSkills(masteryReport: MasteryReport, course: CourseId): Skill[] {
  return skillsInCourse(course).filter((skill) => masteryReport.skills[skill.id]?.band === "unknown");
}

/** Domains of a course in display order. */
export function domainsOf(course: CourseId): readonly DomainId[] {
  return getCourse(course).domains;
}

export function domainName(id: DomainId): string {
  return DOMAINS.find((domain) => domain.id === id)?.name ?? id;
}
