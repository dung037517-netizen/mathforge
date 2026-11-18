"use client";

import { BadgeCheck, CircleCheck, CircleX, Compass, Lightbulb } from "lucide-react";

import { RichText } from "@/components/practice/rich-text";
import { isAnswered, isCorrect } from "@/lib/practice/question";
import { cn } from "@/lib/utils";
import type { Question, Response } from "@/types/practice";

export interface SolutionProps {
  readonly question: Question;
  readonly response: Response | null;
  /** Hide the verdict line when the surrounding UI already shows it. */
  readonly compact?: boolean;
}

/**
 * What a student sees after answering: whether they were right, the specific
 * mistake behind the option they chose, and the full worked solution.
 */
export function Solution({ question, response, compact = false }: SolutionProps) {
  const correct = isCorrect(question, response);
  const answered = isAnswered(response);
  const rationale =
    question.answer.kind === "choice" && response?.kind === "choice" && !correct
      ? (question.answer.rationales[response.index] ?? null)
      : null;

  return (
    <div className="space-y-4">
      {!compact ? (
        <div
          role="status"
          className={cn(
            "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium",
            correct ? "border-success/40 bg-success/10 text-success" : "border-destructive/40 bg-destructive/10 text-destructive",
          )}
        >
          {correct ? <CircleCheck className="size-4" aria-hidden /> : <CircleX className="size-4" aria-hidden />}
          {correct ? "Correct." : answered ? "Not quite." : "No answer given."}
        </div>
      ) : null}

      {rationale !== null ? (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <p className="mb-1 flex items-center gap-2 font-medium text-warning">
            <Lightbulb className="size-4" aria-hidden />
            What went wrong
          </p>
          <RichText text={rationale} className="text-foreground" />
        </div>
      ) : null}

      <div>
        <h3 className="mb-3 text-sm font-semibold">Worked solution</h3>
        <ol className="space-y-3">
          {question.steps.map((step, index) => (
            <li key={index} className="flex gap-3">
              <span
                aria-hidden
                className="numeric mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{step.title}</p>
                <RichText text={step.body} className="mt-1 text-sm text-muted-foreground" />
              </div>
            </li>
          ))}
        </ol>
      </div>

      {question.insight !== undefined ? (
        <div className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
          <p className="mb-1 flex items-center gap-2 font-medium text-accent">
            <Compass className="size-4" aria-hidden />
            Where this goes next
          </p>
          <RichText text={question.insight} className="text-foreground" />
        </div>
      ) : null}

      {question.audit !== undefined ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <BadgeCheck className="size-3.5 text-success" aria-hidden />
          The answer key for this question type is checked independently by the site&rsquo;s math engine in its test
          suite.
        </p>
      ) : null}
    </div>
  );
}
