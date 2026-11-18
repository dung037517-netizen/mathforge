import katex from "katex";
import { describe, expect, it } from "vitest";

import { checkAudit } from "@/lib/practice/audit";
import { buildQuestion } from "@/lib/practice/question";
import { TEMPLATES } from "@/lib/practice/registry";
import { mathFragments, parseRichText, proseOnly } from "@/lib/practice/rich-text";
import { findSkill } from "@/lib/practice/taxonomy";
import type { AnswerFormat, Level, Question, Template } from "@/types/practice";

const SEEDS = Array.from({ length: 30 }, (_, index) => index + 1);

/** Typesetting glitches that compile but read wrongly. */
const MATH_GLITCHES: readonly [RegExp, string][] = [
  [/\+\s*-/, "plus followed by minus"],
  [/-\s*-/, "double minus"],
  [/\+\s*\+/, "double plus"],
  [/(?<![\d.}_])1[a-zA-Z](?![a-zA-Z])/, "coefficient of 1 written out"],
  [/(?<![\d.])0[a-zA-Z](?![a-zA-Z])/, "term with a zero coefficient"],
  [/\(\s*\)/, "empty parentheses"],
  [/\{\}/, "empty group"],
  [/NaN|Infinity|undefined(?!\})|\[object/, "leaked non-number"],
  [/\d\.\d{7,}/, "floating-point dust"],
];

const PROSE_GLITCHES: readonly [RegExp, string][] = [
  [/\\[a-zA-Z]+/, "LaTeX command outside maths"],
  [/NaN|Infinity|undefined|\[object/, "leaked non-number"],
  [/\d\.\d{7,}/, "floating-point dust"],
  [/[_^{}]/, "maths markup outside maths"],
];

function texts(question: Question): string[] {
  const all: string[] = [question.stem];
  if (question.hint !== undefined) all.push(question.hint);
  for (const step of question.steps) all.push(step.title, step.body);
  if (question.answer.kind === "choice") {
    all.push(...question.answer.choices);
    for (const rationale of question.answer.rationales) {
      if (rationale !== null) all.push(rationale);
    }
  } else {
    all.push(question.answer.display);
  }
  if (question.table !== undefined) {
    all.push(...question.table.headers, ...question.table.rows.flat());
    if (question.table.caption !== undefined) all.push(question.table.caption);
  }
  if (question.insight !== undefined) all.push(question.insight);
  return all;
}

function problems(question: Question): string[] {
  const found: string[] = [];
  for (const text of texts(question)) {
    const parsed = parseRichText(text);
    for (const error of parsed.errors) found.push(`${error} in: ${text}`);
    for (const fragment of mathFragments(text)) {
      try {
        katex.renderToString(fragment.tex, {
          displayMode: fragment.display,
          throwOnError: true,
          strict: "error",
        });
      } catch (error) {
        found.push(`KaTeX: ${error instanceof Error ? error.message : "failed"} in: ${fragment.tex}`);
      }
      for (const [pattern, label] of MATH_GLITCHES) {
        if (pattern.test(fragment.tex)) found.push(`${label} in: ${fragment.tex}`);
      }
    }
    const prose = proseOnly(text);
    for (const [pattern, label] of PROSE_GLITCHES) {
      if (pattern.test(prose)) found.push(`${label} in: ${text}`);
    }
  }

  if (question.answer.kind === "choice") {
    const { choices, correctIndex, rationales } = question.answer;
    if (choices.length !== 4) found.push(`expected 4 choices, got ${choices.length}`);
    if (new Set(choices.map((choice) => choice.replace(/\s+/g, ""))).size !== choices.length) {
      found.push(`duplicate choices: ${choices.join(" | ")}`);
    }
    if (correctIndex < 0 || correctIndex >= choices.length) found.push("key out of range");
    rationales.forEach((rationale, index) => {
      if (index === correctIndex && rationale !== null) found.push("the key carries a rationale");
      if (index !== correctIndex && (rationale === null || rationale.length < 12)) {
        found.push(`choice ${index} has no misconception rationale`);
      }
    });
  } else if (!Number.isFinite(question.answer.value)) {
    found.push("typed answer is not finite");
  }

  if (question.audit !== undefined) {
    if (question.numericValue === undefined) {
      found.push("audit present but the answer is not a number");
    } else {
      const result = checkAudit(question.audit, question.numericValue);
      if (!result.ok) found.push(`audit failed: answer ${question.numericValue}; ${result.detail}`);
    }
  }
  if (question.steps.length < 2) found.push("fewer than two worked steps");
  return found;
}

function variants(template: Template): { level: Level; format: AnswerFormat }[] {
  return template.levels.flatMap((level) => template.formats.map((format) => ({ level, format })));
}

describe("question bank structure", () => {
  it("uses unique template ids", () => {
    const ids = TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("attaches every template to a known skill", () => {
    for (const template of TEMPLATES) {
      expect(findSkill(template.skillId), template.id).not.toBeNull();
      expect(template.levels.length, template.id).toBeGreaterThan(0);
      expect(template.formats, template.id).toContain("choice");
    }
  });
});

describe("generated questions", () => {
  for (const template of TEMPLATES) {
    it(`${template.id}: well-formed, typeset cleanly and audited for every seed`, () => {
      const failures: string[] = [];
      for (const { level, format } of variants(template)) {
        const signatures = new Set<string>();
        for (const seed of SEEDS) {
          const ref = { templateId: template.id, seed, level, format };
          let question: Question;
          try {
            question = buildQuestion(template, ref);
          } catch (error) {
            failures.push(`L${level}/${format}/seed ${seed}: ${error instanceof Error ? error.message : "threw"}`);
            continue;
          }
          signatures.add(question.stem + JSON.stringify(question.table ?? null));
          for (const problem of problems(question)) {
            failures.push(`L${level}/${format}/seed ${seed}: ${problem}`);
          }
          expect(buildQuestion(template, ref)).toEqual(question);
        }
        if (signatures.size < 8) {
          failures.push(`L${level}/${format}: only ${signatures.size} distinct questions in ${SEEDS.length} seeds`);
        }
      }
      expect(failures.slice(0, 12)).toEqual([]);
    });
  }
});
