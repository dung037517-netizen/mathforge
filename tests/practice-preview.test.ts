import { writeFileSync } from "node:fs";

import { describe, it } from "vitest";

import { buildQuestion } from "@/lib/practice/question";
import { TEMPLATES } from "@/lib/practice/registry";

/**
 * Developer aid, skipped in normal runs. Prints generated questions so an
 * author can read them the way a student would:
 *
 *   PREVIEW=quad PREVIEW_OUT=/tmp/preview.txt npx vitest run tests/practice-preview.test.ts
 *
 * PREVIEW is a substring of the template ids to print ("all" prints the bank).
 */
const filter = process.env.PREVIEW ?? "";
const seed = Number.parseInt(process.env.PREVIEW_SEED ?? "7", 10);

describe.skipIf(filter === "")("question preview", () => {
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
    const output = lines.join("\n");
    if (process.env.PREVIEW_OUT !== undefined) writeFileSync(process.env.PREVIEW_OUT, output);
    else console.log(output);
  });
});
