import { describe, expect, it } from "vitest";

import {
  estimateAbility,
  itemInformation,
  itemParameters,
  masteryFromTheta,
  probabilityCorrect,
  THETA_GRID,
} from "@/lib/practice/irt";
import {
  computeMastery,
  computeTimeline,
  DAY_MS,
  decayWeight,
  HALF_LIFE_DAYS,
  rankSkills,
  unassessedSkills,
} from "@/lib/practice/mastery";
import {
  advanceToSecondModule,
  BLUEPRINTS,
  breakdown,
  buildFirstModule,
  buildSecondModule,
  estimateScore,
  finishMock,
  formatClock,
  routeFor,
  SAT_DOMAINS,
  startMock,
} from "@/lib/practice/mock";
import { isCorrect, matchesNumeric, parseEntry } from "@/lib/practice/question";
import {
  regenerate,
  summarizeBank,
  TEMPLATES,
  templatesForCourse,
  templatesForDomain,
  templatesForSkill,
  uncoveredSkills,
} from "@/lib/practice/registry";
import {
  addMiss,
  cardKey,
  describeDue,
  dueCards,
  FINAL_BOX,
  freshVariant,
  gradeCard,
  REVIEW_INTERVALS_DAYS,
} from "@/lib/practice/review";
import { mathFragments, parseRichText, proseOnly } from "@/lib/practice/rich-text";
import { mixSeed, Rng } from "@/lib/practice/rng";
import { buildSampleProgress } from "@/lib/practice/sample";
import {
  candidateSkills,
  diagnosticPlan,
  diagnosticQuestion,
  levelFor,
  nextPracticeQuestion,
  pickSkill,
} from "@/lib/practice/selection";
import {
  emptyProgress,
  exportProgress,
  importProgress,
  loadProgress,
  sanitizeProgress,
  saveProgress,
  STORAGE_KEY,
  type KeyValueStore,
} from "@/lib/practice/storage";
import { COURSES, findSkill, skillsInCourse } from "@/lib/practice/taxonomy";
import type {
  AttemptRecord,
  Level,
  MockModuleResult,
  MockResponse,
  MockSession,
  NumericAnswer,
  Response,
} from "@/types/practice";

const NOW = Date.UTC(2026, 10, 1, 12);

function attempt(skillId: string, correct: boolean, daysAgo = 0, level: Level = 2): AttemptRecord {
  return {
    templateId: "t",
    seed: 1,
    level,
    format: "choice",
    skillId,
    at: NOW - daysAgo * DAY_MS,
    correct,
    ms: 60_000,
    source: "practice",
  };
}

function numericKey(value: number, tolerance = 0): NumericAnswer {
  return { kind: "numeric", value, display: "", tolerance };
}

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

/* ------------------------------------------------------------------ */

describe("question bank coverage", () => {
  it("has at least one template for every skill", () => {
    expect(uncoveredSkills()).toEqual([]);
  });

  it("has at least two templates for most skills, so practice is not repetitive", () => {
    const thin = COURSES.flatMap((course) => skillsInCourse(course.id)).filter(
      (skill) => templatesForSkill(skill.id).length < 2,
    );
    expect(thin.map((skill) => skill.id)).toEqual([]);
  });

  it("has enough distinct SAT templates per domain to fill both modules of a full mock", () => {
    for (const domain of SAT_DOMAINS) {
      const needed = 2 * (BLUEPRINTS.full.domainQuota[domain] ?? 0);
      expect(templatesForDomain(domain).length, domain).toBeGreaterThanOrEqual(needed);
    }
  });

  it("reports the size of the bank from the bank itself", () => {
    const summary = summarizeBank();
    expect(summary.templates).toBe(TEMPLATES.length);
    expect(summary.templates).toBeGreaterThanOrEqual(100);
    expect(summarizeBank("sat").templates).toBe(templatesForCourse("sat").length);
    expect(summary.variants).toBeGreaterThan(summary.templates);
  });
});

describe("typed-answer grading", () => {
  it("parses integers, decimals and fractions the way the answer box does", () => {
    expect(parseEntry("12")?.value).toBe(12);
    expect(parseEntry(" -3.50 ")?.value).toBe(-3.5);
    expect(parseEntry("−7")?.value).toBe(-7);
    expect(parseEntry("3/4")?.value).toBe(0.75);
    expect(parseEntry("-5/2")?.value).toBe(-2.5);
    expect(parseEntry(".25")?.value).toBe(0.25);
    expect(parseEntry("1,250")?.value).toBe(1250);
  });

  it("rejects text, units, mixed numbers and division by zero", () => {
    for (const bad of ["", "abc", "12 cm", "1 1/2", "3/0", "5%", "1e3", "--4", "2/3/4"]) {
      expect(parseEntry(bad), bad).toBeNull();
    }
  });

  it("accepts an exact value in any equivalent form", () => {
    const key = numericKey(0.75);
    for (const text of ["3/4", "0.75", ".75", "6/8", "0.750"]) {
      const entry = parseEntry(text);
      expect(entry !== null && matchesNumeric(entry, key), text).toBe(true);
    }
  });

  it("accepts a rounded or truncated decimal only with at least three decimal places", () => {
    const key = numericKey(2 / 3);
    const accepts = (text: string): boolean => {
      const entry = parseEntry(text);
      return entry !== null && matchesNumeric(entry, key);
    };
    expect(accepts("2/3")).toBe(true);
    expect(accepts("0.667")).toBe(true);
    expect(accepts("0.666")).toBe(true);
    expect(accepts("0.6667")).toBe(true);
    expect(accepts("0.67")).toBe(false);
    expect(accepts("0.7")).toBe(false);
    expect(accepts("0.668")).toBe(false);
  });

  it("uses an explicit tolerance when a question asks for a rounded answer", () => {
    const key = numericKey(0.48649, 0.0006);
    const entry = parseEntry("0.486");
    const far = parseEntry("0.49");
    expect(entry !== null && matchesNumeric(entry, key)).toBe(true);
    expect(far !== null && matchesNumeric(far, key)).toBe(false);
  });

  it("grades regenerated questions consistently", () => {
    const template = templatesForSkill("sat-linear-equations")[0];
    const choice = regenerate({ templateId: template.id, seed: 5, level: 1, format: "choice" });
    const typed = regenerate({ templateId: template.id, seed: 5, level: 1, format: "numeric" });
    expect(choice).not.toBeNull();
    expect(typed).not.toBeNull();
    if (choice === null || typed === null) return;
    if (choice.answer.kind !== "choice" || typed.answer.kind !== "numeric") throw new Error("unexpected format");
    expect(isCorrect(choice, { kind: "choice", index: choice.answer.correctIndex })).toBe(true);
    expect(isCorrect(choice, { kind: "choice", index: (choice.answer.correctIndex + 1) % 4 })).toBe(false);
    expect(isCorrect(choice, null)).toBe(false);
    expect(isCorrect(typed, { kind: "numeric", text: String(typed.answer.value) })).toBe(true);
    expect(isCorrect(typed, { kind: "numeric", text: String(typed.answer.value + 1) })).toBe(false);
    expect(isCorrect(typed, { kind: "numeric", text: "" })).toBe(false);
  });
});

describe("rich text", () => {
  it("separates prose, inline maths and display maths", () => {
    const parsed = parseRichText("Solve $x^2 = 4$ for $x$.\n\n$$x = \\pm 2$$\n\nBoth work.");
    expect(parsed.errors).toEqual([]);
    expect(parsed.blocks.map((block) => block.kind)).toEqual(["paragraph", "display", "paragraph"]);
    expect(mathFragments("a $b$ c $$d$$").map((fragment) => fragment.display)).toEqual([false, true]);
  });

  it("treats an escaped dollar sign as money, not maths", () => {
    const parsed = parseRichText("It costs \\$5 and then \\$12.");
    expect(parsed.errors).toEqual([]);
    expect(proseOnly("It costs \\$5 and then \\$12.")).toBe("It costs $5 and then $12.");
  });

  it("reports unbalanced delimiters instead of guessing", () => {
    expect(parseRichText("Broken $x + 1").errors).toHaveLength(1);
    expect(parseRichText("Empty $$ here").errors.length).toBeGreaterThan(0);
  });
});

describe("item response model", () => {
  it("makes harder questions less likely to be answered correctly", () => {
    for (const theta of [-2, 0, 2]) {
      const easy = probabilityCorrect(theta, itemParameters(1, "numeric"));
      const medium = probabilityCorrect(theta, itemParameters(2, "numeric"));
      const hard = probabilityCorrect(theta, itemParameters(3, "numeric"));
      expect(easy).toBeGreaterThan(medium);
      expect(medium).toBeGreaterThan(hard);
    }
  });

  it("gives multiple choice a guessing floor and typed answers none", () => {
    expect(probabilityCorrect(-8, itemParameters(2, "choice"))).toBeCloseTo(0.25, 3);
    expect(probabilityCorrect(-8, itemParameters(2, "numeric"))).toBeCloseTo(0, 3);
    expect(probabilityCorrect(8, itemParameters(3, "choice"))).toBeCloseTo(1, 3);
  });

  it("is increasing in ability", () => {
    const item = itemParameters(2, "choice");
    for (let index = 1; index < THETA_GRID.length; index += 1) {
      expect(probabilityCorrect(THETA_GRID[index], item)).toBeGreaterThan(
        probabilityCorrect(THETA_GRID[index - 1], item),
      );
    }
  });

  it("is most informative near an item's difficulty", () => {
    const item = itemParameters(2, "numeric");
    expect(itemInformation(0, item)).toBeGreaterThan(itemInformation(2, item));
    expect(itemInformation(0, item)).toBeGreaterThan(itemInformation(-2, item));
  });

  it("returns the prior when there is no evidence", () => {
    const estimate = estimateAbility([], 0, 1);
    expect(estimate.theta).toBeCloseTo(0, 6);
    expect(estimate.sd).toBeCloseTo(1, 2);
  });

  it("moves with the evidence and becomes more certain", () => {
    const right = { level: 2 as Level, format: "choice" as const, correct: true };
    const wrong = { ...right, correct: false };
    const few = estimateAbility([right, right, right]);
    const many = estimateAbility(Array.from({ length: 30 }, () => right));
    const mixed = estimateAbility([right, wrong, right, wrong]);
    expect(few.theta).toBeGreaterThan(0);
    expect(many.theta).toBeGreaterThan(few.theta);
    expect(many.sd).toBeLessThan(few.sd);
    expect(estimateAbility([wrong, wrong, wrong]).theta).toBeLessThan(0);
    expect(Math.abs(mixed.theta)).toBeLessThan(few.theta);
  });

  it("credits a hard question more than an easy one", () => {
    const hard = estimateAbility([{ level: 3, format: "numeric", correct: true }]);
    const easy = estimateAbility([{ level: 1, format: "numeric", correct: true }]);
    expect(hard.theta).toBeGreaterThan(easy.theta);
  });

  it("maps average ability to a mastery of one half", () => {
    expect(masteryFromTheta(0)).toBeCloseTo(0.5, 10);
    expect(masteryFromTheta(2)).toBeGreaterThan(0.85);
    expect(masteryFromTheta(-2)).toBeLessThan(0.15);
  });
});

describe("mastery report", () => {
  const skill = "sat-linear-equations";
  const sibling = "sat-linear-functions";

  it("reports every skill as unknown before any answers", () => {
    const report = computeMastery([], "sat", NOW);
    expect(report.course.band).toBe("unknown");
    expect(report.course.value).toBeCloseTo(0.5, 1);
    expect(unassessedSkills(report, "sat")).toHaveLength(skillsInCourse("sat").length);
    expect(rankSkills(report, "sat")).toEqual([]);
  });

  it("halves the weight of an answer every half-life", () => {
    expect(decayWeight(0)).toBe(1);
    expect(decayWeight(HALF_LIFE_DAYS * DAY_MS)).toBeCloseTo(0.5, 12);
    expect(decayWeight(2 * HALF_LIFE_DAYS * DAY_MS)).toBeCloseTo(0.25, 12);
  });

  it("rises with correct answers and falls with incorrect ones", () => {
    const strong = computeMastery(Array.from({ length: 8 }, () => attempt(skill, true)), "sat", NOW);
    const weak = computeMastery(Array.from({ length: 8 }, () => attempt(skill, false)), "sat", NOW);
    expect(strong.skills[skill].value).toBeGreaterThan(0.7);
    expect(weak.skills[skill].value).toBeLessThan(0.3);
    expect(strong.skills[skill].low).toBeLessThan(strong.skills[skill].value);
    expect(strong.skills[skill].high).toBeGreaterThan(strong.skills[skill].value);
    expect(strong.skills[skill].attempts).toBe(8);
    expect(strong.skills[skill].correct).toBe(8);
  });

  it("weights recent answers more than old ones", () => {
    const improving = [
      ...Array.from({ length: 6 }, () => attempt(skill, false, 90)),
      ...Array.from({ length: 6 }, () => attempt(skill, true, 0)),
    ];
    const declining = [
      ...Array.from({ length: 6 }, () => attempt(skill, true, 90)),
      ...Array.from({ length: 6 }, () => attempt(skill, false, 0)),
    ];
    const up = computeMastery(improving, "sat", NOW).skills[skill].value;
    const down = computeMastery(declining, "sat", NOW).skills[skill].value;
    expect(up).toBeGreaterThan(0.6);
    expect(down).toBeLessThan(0.4);
  });

  it("shrinks a thinly observed skill toward the rest of its domain", () => {
    const siblingStrong = Array.from({ length: 12 }, () => attempt(sibling, true));
    const alone = computeMastery([attempt(skill, false)], "sat", NOW).skills[skill];
    const pooled = computeMastery([...siblingStrong, attempt(skill, false)], "sat", NOW).skills[skill];
    // One wrong answer counts for less when the student is strong on related skills.
    expect(pooled.value).toBeGreaterThan(alone.value);
    // But evidence about the skill itself still wins once there is enough of it.
    const lots = Array.from({ length: 14 }, () => attempt(skill, false));
    const overwhelmed = computeMastery([...siblingStrong, ...lots], "sat", NOW).skills[skill];
    expect(overwhelmed.value).toBeLessThan(0.35);
  });

  it("does not let a domain borrow from its own answers when setting its prior", () => {
    const answers = Array.from({ length: 10 }, () => attempt(skill, true));
    const report = computeMastery(answers, "sat", NOW);
    expect(report.domains["sat-algebra"].value).toBeGreaterThan(report.domains["sat-geometry"].value);
    // Other domains move only a little: they see the algebra result through the prior.
    expect(report.domains["sat-geometry"].band).toBe("unknown");
  });

  it("ignores answers from other courses", () => {
    const calculus = Array.from({ length: 10 }, () => attempt("calc-limits", true));
    const report = computeMastery(calculus, "sat", NOW);
    expect(report.course.attempts).toBe(0);
    expect(computeMastery(calculus, "ap-calculus", NOW).course.attempts).toBe(10);
  });

  it("ranks assessed skills weakest first", () => {
    const answers = [
      ...Array.from({ length: 6 }, () => attempt(skill, true)),
      ...Array.from({ length: 6 }, () => attempt(sibling, false)),
    ];
    const ranked = rankSkills(computeMastery(answers, "sat", NOW), "sat");
    expect(ranked.map((entry) => entry.skill.id)).toEqual([sibling, skill]);
  });

  it("builds one timeline point per day of practice", () => {
    const answers = [
      attempt(skill, false, 10),
      attempt(skill, false, 10),
      attempt(skill, true, 5),
      attempt(skill, true, 5),
      attempt(skill, true, 0),
    ];
    const timeline = computeTimeline(answers, "sat");
    expect(timeline).toHaveLength(3);
    expect(timeline.map((point) => point.answered)).toEqual([2, 2, 1]);
    expect(timeline[2].course).toBeGreaterThan(timeline[0].course);
    expect(timeline[0].day < timeline[1].day && timeline[1].day < timeline[2].day).toBe(true);
    expect(computeTimeline([], "sat")).toEqual([]);
  });
});

describe("adaptive selection", () => {
  it("matches difficulty to ability", () => {
    expect(levelFor(-1.5)).toBe(1);
    expect(levelFor(0)).toBe(2);
    expect(levelFor(1.5)).toBe(3);
  });

  it("spends most questions on the weakest skill", () => {
    const answers = [
      ...Array.from({ length: 12 }, () => attempt("sat-quadratics", false)),
      ...skillsInCourse("sat")
        .filter((skill) => skill.id !== "sat-quadratics")
        .flatMap((skill) => Array.from({ length: 6 }, () => attempt(skill.id, true))),
    ];
    const report = computeMastery(answers, "sat", NOW);
    const candidates = candidateSkills("sat", { kind: "smart" });
    const counts = new Map<string, number>();
    for (let seed = 1; seed <= 300; seed += 1) {
      const pick = pickSkill(candidates, report, new Rng(seed));
      counts.set(pick, (counts.get(pick) ?? 0) + 1);
    }
    const quadratics = counts.get("sat-quadratics") ?? 0;
    expect(quadratics).toBeGreaterThan(150);
    // ...but not all of them: other skills are still visited.
    expect(quadratics).toBeLessThan(300);
  });

  it("respects a domain or skill focus", () => {
    expect(candidateSkills("sat", { kind: "skill", skill: "sat-circles" })).toEqual(["sat-circles"]);
    const geometry = candidateSkills("sat", { kind: "domain", domain: "sat-geometry" });
    expect(geometry.every((skill) => findSkill(skill)?.domain === "sat-geometry")).toBe(true);
    const report = computeMastery([], "sat", NOW);
    for (let seed = 1; seed <= 25; seed += 1) {
      const question = nextPracticeQuestion({ course: "sat", focus: { kind: "domain", domain: "sat-geometry" }, report, seed });
      expect(question).not.toBeNull();
      expect(findSkill(question?.skillId ?? "")?.domain).toBe("sat-geometry");
    }
  });

  it("is reproducible for a given seed", () => {
    const report = computeMastery([], "ap-statistics", NOW);
    const input = { course: "ap-statistics" as const, focus: { kind: "smart" as const }, report, seed: 77 };
    expect(nextPracticeQuestion(input)).toEqual(nextPracticeQuestion(input));
  });

  it("plans a diagnostic that visits every skill", () => {
    for (const course of COURSES) {
      const plan = diagnosticPlan(course.id, 3);
      const skills = skillsInCourse(course.id).map((skill) => skill.id);
      expect(plan.length).toBeGreaterThanOrEqual(Math.max(12, skills.length));
      for (const skill of skills) expect(plan, `${course.id}:${skill}`).toContain(skill);
      const question = diagnosticQuestion(plan, 0, 0, 3, []);
      expect(question?.skillId).toBe(plan[0]);
      expect(question?.format).toBe("choice");
    }
    expect(diagnosticQuestion(["sat-circles"], 5, 0, 1, [])).toBeNull();
  });
});

describe("mock test", () => {
  const seed = 4242;

  it("assembles modules to the blueprint", () => {
    for (const kind of ["full", "quick"] as const) {
      const blueprint = BLUEPRINTS[kind];
      const first = buildFirstModule(kind, seed);
      expect(first).toHaveLength(blueprint.questionsPerModule);
      for (const domain of SAT_DOMAINS) {
        const count = first.filter((item) => findSkill(item.skillId)?.domain === domain).length;
        expect(count, `${kind}:${domain}`).toBe(blueprint.domainQuota[domain]);
      }
      expect(first.filter((item) => item.format === "numeric")).toHaveLength(blueprint.numericPerModule);
      expect(new Set(first.map((item) => item.templateId)).size).toBe(first.length);
      const levels = first.map((item) => item.level);
      expect([...levels].sort((a, b) => a - b)).toEqual(levels);
      for (const item of first) expect(regenerate(item), item.templateId).not.toBeNull();
    }
  });

  it("does not repeat a template across the two modules of a full test", () => {
    const first = buildFirstModule("full", seed);
    for (const route of ["lower", "higher"] as const) {
      const second = buildSecondModule("full", seed, route, first);
      const all = [...first, ...second].map((item) => item.templateId);
      expect(new Set(all).size, route).toBe(all.length);
    }
  });

  it("makes the higher second module harder than the lower one", () => {
    const first = buildFirstModule("full", seed);
    const mean = (route: "lower" | "higher"): number => {
      const second = buildSecondModule("full", seed, route, first);
      return second.reduce((total, item) => total + item.level, 0) / second.length;
    };
    expect(mean("higher")).toBeGreaterThan(mean("lower") + 0.4);
  });

  function graded(items: ReturnType<typeof buildFirstModule>, share: number): MockModuleResult {
    const cutoff = Math.round(items.length * share);
    const responses: MockResponse[] = items.map((_, index) => ({
      response: { kind: "choice", index: 0 },
      correct: index < cutoff,
      ms: 60_000,
      flagged: false,
    }));
    return { items, responses, secondsUsed: 1200 };
  }

  it("routes strong first modules to the harder second module", () => {
    const first = buildFirstModule("full", seed);
    expect(routeFor(first, graded(first, 0.9).responses)).toBe("higher");
    expect(routeFor(first, graded(first, 0.3).responses)).toBe("lower");
  });

  it("scores on the 200–800 scale, monotonically in the number correct", () => {
    const first = buildFirstModule("full", seed);
    const scoreAt = (share: number): number => {
      const one = graded(first, share);
      const route = routeFor(one.items, one.responses);
      const two = graded(buildSecondModule("full", seed, route, first), share);
      return estimateScore([one, two]).score;
    };
    const scores = [0, 0.2, 0.4, 0.6, 0.8, 1].map(scoreAt);
    expect(scores[0]).toBe(200);
    expect(scores[5]).toBe(800);
    for (let index = 1; index < scores.length; index += 1) {
      expect(scores[index]).toBeGreaterThanOrEqual(scores[index - 1]);
    }
    expect(scores[3]).toBeGreaterThan(scores[1]);
    for (const score of scores) expect(score % 10).toBe(0);
  });

  it("reports a score range that contains the score", () => {
    const first = buildFirstModule("full", seed);
    const one = graded(first, 0.6);
    const two = graded(buildSecondModule("full", seed, "higher", first), 0.5);
    const estimate = estimateScore([one, two]);
    expect(estimate.low).toBeLessThan(estimate.score);
    expect(estimate.high).toBeGreaterThan(estimate.score);
    expect(estimate.high - estimate.low).toBeGreaterThanOrEqual(40);
    expect(estimate.low).toBeGreaterThanOrEqual(200);
    expect(estimate.high).toBeLessThanOrEqual(800);
  });

  it("runs a whole session: answer, route, finish, break down", () => {
    let session: MockSession = startMock("quick", seed, NOW);
    expect(session.modules).toHaveLength(1);
    expect(finishMock(session, NOW)).toBeNull();

    const answerAll = (current: MockSession, moduleIndex: number): MockSession => {
      const answers = current.modules[moduleIndex].map((item): Response | null => {
        const question = regenerate(item);
        if (question === null) return null;
        return question.answer.kind === "choice"
          ? { kind: "choice", index: question.answer.correctIndex }
          : { kind: "numeric", text: String(question.answer.value) };
      });
      const all = current.answers.map((row, index) => (index === moduleIndex ? answers : row));
      return { ...current, answers: all, secondsLeft: 300 };
    };

    session = advanceToSecondModule(answerAll(session, 0), NOW + 1000);
    expect(session.moduleIndex).toBe(1);
    expect(session.route).toBe("higher");
    expect(session.firstModule?.responses.every((response) => response.correct)).toBe(true);

    const result = finishMock(answerAll(session, 1), NOW + 2000);
    expect(result).not.toBeNull();
    if (result === null) return;
    expect(result.estimate.score).toBe(800);
    const summary = breakdown(result);
    expect(summary.overall).toEqual({ correct: 22, total: 22 });
    expect(summary.unanswered).toBe(0);
    expect(Object.keys(summary.domains).sort()).toEqual([...SAT_DOMAINS].sort());
  });

  it("counts a blank answer as incorrect", () => {
    const session = startMock("quick", seed, NOW);
    const next = advanceToSecondModule(session, NOW);
    expect(next.firstModule?.responses.every((response) => !response.correct)).toBe(true);
    expect(next.route).toBe("lower");
  });

  it("formats the clock", () => {
    expect(formatClock(2100)).toBe("35:00");
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(-4)).toBe("0:00");
  });
});

describe("mistake notebook", () => {
  const ref = { templateId: "quad-roots", seed: 9, level: 2 as Level, format: "choice" as const, skillId: "sat-quadratics" };

  it("files a miss once and resets the card on a repeat miss", () => {
    const once = addMiss([], ref, NOW);
    expect(once).toHaveLength(1);
    expect(once[0].box).toBe(0);
    const promoted = gradeCard(once, cardKey(ref), true, NOW).cards;
    const again = addMiss(promoted, ref, NOW + DAY_MS);
    expect(again).toHaveLength(1);
    expect(again[0].box).toBe(0);
    expect(again[0].lapses).toBe(1);
  });

  it("moves a card up one box per correct review, on a widening schedule", () => {
    let cards = addMiss([], ref, NOW);
    let clock = NOW;
    for (let box = 1; box <= FINAL_BOX; box += 1) {
      const outcome = gradeCard(cards, cardKey(ref), true, clock);
      expect(outcome.resolved).toBe(false);
      expect(outcome.box).toBe(box);
      cards = outcome.cards;
      expect(cards[0].dueAt).toBe(clock + REVIEW_INTERVALS_DAYS[box] * DAY_MS);
      expect(dueCards(cards, clock)).toHaveLength(REVIEW_INTERVALS_DAYS[box] === 0 ? 1 : 0);
      clock = cards[0].dueAt;
      expect(dueCards(cards, clock)).toHaveLength(1);
    }
    const last = gradeCard(cards, cardKey(ref), true, clock);
    expect(last.resolved).toBe(true);
    expect(last.cards).toEqual([]);
  });

  it("sends a card back to the first box after a wrong review", () => {
    let cards = addMiss([], ref, NOW);
    cards = gradeCard(cards, cardKey(ref), true, NOW).cards;
    cards = gradeCard(cards, cardKey(ref), true, NOW).cards;
    const outcome = gradeCard(cards, cardKey(ref), false, NOW);
    expect(outcome.box).toBe(0);
    expect(outcome.cards[0].lapses).toBe(1);
    expect(gradeCard(cards, "missing", true, NOW).cards).toEqual(cards);
  });

  it("reviews with the same template and new numbers", () => {
    const card = addMiss([], ref, NOW)[0];
    const variant = freshVariant(card, 1);
    expect(variant.templateId).toBe(card.templateId);
    expect(variant.level).toBe(card.level);
    expect(variant.seed).not.toBe(card.seed);
    expect(freshVariant(card, 2).seed).not.toBe(variant.seed);
    expect(regenerate(variant)).not.toBeNull();
  });

  it("describes due dates in words", () => {
    expect(describeDue(NOW - 1, NOW)).toBe("due now");
    expect(describeDue(NOW + DAY_MS / 2, NOW)).toBe("due tomorrow");
    expect(describeDue(NOW + 5 * DAY_MS, NOW)).toBe("due in 5 days");
  });
});

describe("saved progress", () => {
  it("round-trips through storage", () => {
    const store = memoryStore();
    const state = { ...emptyProgress(NOW), attempts: [attempt("sat-circles", true)], resolved: 2 };
    expect(saveProgress(store, state)).toBe(true);
    expect(loadProgress(store, NOW)).toEqual(state);
  });

  it("starts empty when nothing is saved or storage is unavailable", () => {
    expect(loadProgress(null, NOW)).toEqual(emptyProgress(NOW));
    expect(loadProgress(memoryStore(), NOW)).toEqual(emptyProgress(NOW));
    expect(saveProgress(null, emptyProgress(NOW))).toBe(false);
  });

  it("survives corrupted or foreign data", () => {
    const store = memoryStore();
    store.data.set(STORAGE_KEY, "{not json");
    expect(loadProgress(store, NOW)).toEqual(emptyProgress(NOW));
    store.data.set(STORAGE_KEY, JSON.stringify({ version: 99 }));
    expect(loadProgress(store, NOW)).toEqual(emptyProgress(NOW));
    expect(sanitizeProgress(null, NOW)).toBeNull();
    expect(sanitizeProgress([], NOW)).toBeNull();
  });

  it("drops malformed records and keeps the valid ones", () => {
    const good = attempt("sat-circles", true);
    const cleaned = sanitizeProgress(
      {
        version: 1,
        course: "not-a-course",
        attempts: [good, { ...good, level: 9 }, { ...good, correct: "yes" }, "junk", null],
        cards: [{ templateId: "x", seed: 1, level: 2, format: "choice", skillId: "s", dueAt: NOW, box: 99 }, { seed: 1 }],
        mocks: [{ id: "broken" }],
        activeMock: { id: "broken" },
        resolved: -4,
      },
      NOW,
    );
    expect(cleaned).not.toBeNull();
    expect(cleaned?.course).toBe("sat");
    expect(cleaned?.attempts).toEqual([good]);
    expect(cleaned?.cards).toHaveLength(1);
    expect(cleaned?.cards[0].box).toBe(8);
    expect(cleaned?.mocks).toEqual([]);
    expect(cleaned?.activeMock).toBeNull();
    expect(cleaned?.resolved).toBe(0);
  });

  it("keeps a mock session and a mock result intact", () => {
    const session = advanceToSecondModule(startMock("quick", 7, NOW), NOW);
    const result = finishMock(session, NOW + 5);
    const state = { ...emptyProgress(NOW), activeMock: session, mocks: result === null ? [] : [result] };
    const restored = sanitizeProgress(JSON.parse(JSON.stringify(state)) as unknown, NOW);
    expect(restored).toEqual(state);
  });

  it("exports and imports a backup, and explains a bad file", () => {
    const state = { ...emptyProgress(NOW), attempts: [attempt("sat-circles", false)] };
    const imported = importProgress(exportProgress(state, NOW), NOW);
    expect(imported.ok && imported.state).toEqual(state);
    expect(importProgress("nope", NOW)).toEqual({ ok: false, error: "That file is not valid JSON." });
    expect(importProgress("{}", NOW).ok).toBe(false);
    expect(importProgress(JSON.stringify({ app: "mathforge", data: { version: 2 } }), NOW).ok).toBe(false);
  });
});

describe("simulated sample student", () => {
  const sample = buildSampleProgress(NOW);

  it("is deterministic", () => {
    expect(buildSampleProgress(NOW)).toEqual(sample);
  });

  it("looks like five weeks of study", () => {
    expect(sample.attempts.length).toBeGreaterThan(200);
    expect(sample.mocks).toHaveLength(2);
    expect(sample.diagnostics).toHaveLength(1);
    expect(sample.cards.length).toBeGreaterThan(0);
    expect(sample.attempts.every((entry) => entry.at < NOW)).toBe(true);
    const sources = new Set(sample.attempts.map((entry) => entry.source));
    expect([...sources].sort()).toEqual(["diagnostic", "mock", "practice", "review"]);
  });

  it("produces a report with strengths and weaknesses", () => {
    const report = computeMastery(sample.attempts, "sat", NOW);
    const ranked = rankSkills(report, "sat");
    expect(ranked.length).toBeGreaterThan(10);
    expect(ranked[ranked.length - 1].mastery.value - ranked[0].mastery.value).toBeGreaterThan(0.2);
    const timeline = computeTimeline(sample.attempts, "sat");
    expect(timeline.length).toBeGreaterThan(15);
    expect(timeline[timeline.length - 1].course).toBeGreaterThan(timeline[0].course);
  });

  it("survives a save and load", () => {
    expect(sanitizeProgress(JSON.parse(JSON.stringify(sample)) as unknown, NOW)).toEqual(sample);
  });

  it("uses seeds that regenerate every question", () => {
    for (const entry of sample.attempts.slice(0, 80)) expect(regenerate(entry), entry.templateId).not.toBeNull();
    expect(mixSeed("a", 1)).not.toBe(mixSeed("a", 2));
  });
});
