import { writeFileSync } from "node:fs";

import { describe, it } from "vitest";

import { computeMastery, computeTimeline, rankSkills } from "@/lib/practice/mastery";
import { buildQuestion } from "@/lib/practice/question";
import { TEMPLATES } from "@/lib/practice/registry";
import { dueCards } from "@/lib/practice/review";
import { buildSampleProgress } from "@/lib/practice/sample";

/**
 * Developer aids, skipped in normal runs.
 *
 *   PREVIEW=quad PREVIEW_OUT=/tmp/preview.txt npx vitest run tests/practice-preview.test.ts
 *
 * prints generated questions so an author can read them the way a student
 * would. PREVIEW is a substring of the template ids to print ("all" prints the
 * whole bank; "sample" summarizes the simulated student instead).
 */
const filter = process.env.PREVIEW ?? "";
const seed = Number.parseInt(process.env.PREVIEW_SEED ?? "7", 10);

function emit(lines: readonly string[]): void {
  const output = lines.join("\n");
  if (process.env.PREVIEW_OUT !== undefined) writeFileSync(process.env.PREVIEW_OUT, output);
  else console.log(output);
}

describe.skipIf(filter === "" || filter === "sample")("question preview", () => {
  it("prints the selected templates", () => {
    const lines: string[] = [];
    for (const template of TEMPLATES) {
      if (filter !== "all" && !template.id.includes(filter)) continue;
      for (const level of template.levels) {
        const question = buildQuestion(template, {
          templateId: template.id,
          seed,
          level,
          format: "choice",
        });
        lines.push(`\n=== ${template.id} · L${level} · ${template.skillId}`);
        lines.push(question.stem);
        if (question.table !== undefined) {
          lines.push(`[table] ${question.table.headers.join(" | ")}`);
          for (const row of question.table.rows) lines.push(`        ${row.join(" | ")}`);
        }
        if (question.answer.kind === "choice") {
          question.answer.choices.forEach((choice, index) => {
            const mark = question.answer.kind === "choice" && index === question.answer.correctIndex ? "*" : " ";
            const why = question.answer.kind === "choice" ? question.answer.rationales[index] : null;
            lines.push(` ${mark}${"ABCD"[index]}) ${choice}${why === null ? "" : `   <- ${why}`}`);
          });
        }
        for (const step of question.steps) lines.push(`   - ${step.title}: ${step.body}`);
      }
    }
    emit(lines);
  });
});

describe.skipIf(filter !== "sample")("sample student preview", () => {
  it("summarizes the simulated student", () => {
    const now = Date.UTC(2026, 10, 1, 12);
    const sample = buildSampleProgress(now);
    const report = computeMastery(sample.attempts, "sat", now);
    const timeline = computeTimeline(sample.attempts, "sat");
    const ranked = rankSkills(report, "sat");
    const correct = sample.attempts.filter((attempt) => attempt.correct).length;
    emit([
      `attempts ${sample.attempts.length}, correct ${correct} (${Math.round((100 * correct) / sample.attempts.length)}%)`,
      `cards ${sample.cards.length}, due ${dueCards(sample.cards, now).length}, resolved ${sample.resolved}`,
      `mocks ${sample.mocks.map((mock) => `${mock.estimate.score} [${mock.estimate.low}-${mock.estimate.high}] ${mock.route}`).join(", ")}`,
      `course mastery ${report.course.value.toFixed(3)} (${report.course.low.toFixed(2)}-${report.course.high.toFixed(2)})`,
      `timeline ${timeline.map((point) => Math.round(point.course * 100)).join(" ")}`,
      `skills ${ranked.map((entry) => `${entry.skill.id.replace("sat-", "")}:${Math.round(entry.mastery.value * 100)}`).join(" ")}`,
    ]);
  });
});
