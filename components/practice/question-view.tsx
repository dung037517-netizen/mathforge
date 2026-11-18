"use client";

import { Check, Strikethrough, X } from "lucide-react";
import * as React from "react";

import { RichText } from "@/components/practice/rich-text";
import { Input } from "@/components/ui/input";
import { LEVEL_LABELS, type Question, type Response, type TableSpec } from "@/types/practice";
import { isCorrect } from "@/lib/practice/question";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D"] as const;

function DataTable({ table }: { readonly table: TableSpec }) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-auto min-w-[16rem] border-collapse text-sm">
        {table.caption !== undefined ? (
          <caption className="mb-2 text-left text-xs text-muted-foreground">{table.caption}</caption>
        ) : null}
        <thead>
          <tr>
            {table.headers.map((header, index) => (
              <th
                key={index}
                scope="col"
                className="border border-border bg-surface-sunken px-3 py-2 text-center font-medium"
              >
                <RichText text={header} inline />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((value, cellIndex) =>
                cellIndex === 0 ? (
                  <th
                    key={cellIndex}
                    scope="row"
                    className="border border-border bg-surface-sunken px-3 py-2 text-left font-medium"
                  >
                    <RichText text={value} inline />
                  </th>
                ) : (
                  <td key={cellIndex} className="numeric border border-border px-3 py-2 text-center">
                    <RichText text={value} inline />
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface QuestionViewProps {
  readonly question: Question;
  readonly response: Response | null;
  readonly onChange: (response: Response | null) => void;
  /** Lock the inputs and show which answer is correct. */
  readonly revealed?: boolean;
  /** Label shown above the stem, for example "Question 7 of 22". */
  readonly label?: string;
  /** Choices the student has crossed out (a test-taking tool in mock tests). */
  readonly crossed?: readonly number[];
  readonly onToggleCross?: (index: number) => void;
  /** Called when Enter is pressed in the typed-answer box. */
  readonly onSubmit?: () => void;
}

/**
 * One question: stem, optional table, and either four choices or an answer
 * box. The component is controlled — it never grades anything itself except
 * to color the options once the parent says the answer is revealed.
 */
export function QuestionView({
  question,
  response,
  onChange,
  revealed = false,
  label,
  crossed = [],
  onToggleCross,
  onSubmit,
}: QuestionViewProps) {
  const groupName = React.useId();
  const selected = response?.kind === "choice" ? response.index : -1;
  const typed = response?.kind === "numeric" ? response.text : "";
  const correct = revealed && isCorrect(question, response);

  const onKeyDown = (event: React.KeyboardEvent<HTMLFieldSetElement>): void => {
    if (revealed || question.answer.kind !== "choice") return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toUpperCase();
    const index = ["1", "2", "3", "4"].indexOf(key) >= 0 ? Number(key) - 1 : LETTERS.indexOf(key as (typeof LETTERS)[number]);
    if (index >= 0 && index < question.answer.choices.length) {
      event.preventDefault();
      onChange({ kind: "choice", index });
    }
  };

  return (
    <div className="space-y-5">
      {/* The name of the question type would give the method away, so it appears only afterwards. */}
      {label !== undefined || revealed ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {label !== undefined ? <span className="font-medium text-foreground">{label}</span> : null}
          {revealed ? (
            <>
              <span>{question.title}</span>
              <span aria-hidden>·</span>
              <span>{LEVEL_LABELS[question.level]}</span>
            </>
          ) : null}
        </div>
      ) : null}

      <RichText text={question.stem} className="text-[1.02rem]" />
      {question.table !== undefined ? <DataTable table={question.table} /> : null}

      {question.answer.kind === "choice" ? (
        <fieldset className="space-y-2.5" onKeyDown={onKeyDown} disabled={revealed}>
          <legend className="sr-only">Answer choices</legend>
          {question.answer.choices.map((choice, index) => {
            const isSelected = selected === index;
            const isKey = question.answer.kind === "choice" && index === question.answer.correctIndex;
            const isCrossed = !revealed && crossed.includes(index);
            return (
              <div key={index} className="flex items-stretch gap-2">
                <label
                  className={cn(
                    "flex min-h-12 flex-1 cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-colors",
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                    !revealed && !isSelected && "border-border hover:border-primary/60 hover:bg-secondary/50",
                    !revealed && isSelected && "border-primary bg-primary/10",
                    revealed && "cursor-default",
                    revealed && isKey && "border-success bg-success/10",
                    revealed && isSelected && !isKey && "border-destructive bg-destructive/10",
                    revealed && !isSelected && !isKey && "border-border opacity-70",
                    isCrossed && "opacity-45",
                  )}
                >
                  <input
                    type="radio"
                    name={groupName}
                    className="sr-only"
                    checked={isSelected}
                    onChange={() => onChange({ kind: "choice", index })}
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                      isSelected && !revealed && "border-primary bg-primary text-primary-foreground",
                      revealed && isKey && "border-success bg-success text-background",
                      revealed && isSelected && !isKey && "border-destructive bg-destructive text-destructive-foreground",
                    )}
                  >
                    {revealed && isKey ? <Check className="size-4" /> : revealed && isSelected ? <X className="size-4" /> : LETTERS[index]}
                  </span>
                  <span className={cn("min-w-0 flex-1", isCrossed && "line-through")}>
                    <span className="sr-only">{LETTERS[index]}. </span>
                    <RichText text={choice} inline />
                  </span>
                  {revealed && isKey ? <span className="sr-only">(correct answer)</span> : null}
                  {revealed && isSelected && !isKey ? <span className="sr-only">(your answer, incorrect)</span> : null}
                </label>
                {onToggleCross !== undefined && !revealed ? (
                  <button
                    type="button"
                    onClick={() => onToggleCross(index)}
                    aria-pressed={isCrossed}
                    aria-label={`${isCrossed ? "Restore" : "Cross out"} choice ${LETTERS[index]}`}
                    className={cn(
                      "flex w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      isCrossed && "bg-secondary text-foreground",
                    )}
                  >
                    <Strikethrough className="size-4" aria-hidden />
                  </button>
                ) : null}
              </div>
            );
          })}
        </fieldset>
      ) : (
        <div className="space-y-2">
          <label htmlFor={`${groupName}-answer`} className="text-sm font-medium">
            Your answer
          </label>
          <div className="flex items-center gap-3">
            <Input
              id={`${groupName}-answer`}
              value={typed}
              onChange={(event) => onChange({ kind: "numeric", text: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter" && onSubmit !== undefined) {
                  event.preventDefault();
                  onSubmit();
                }
              }}
              disabled={revealed}
              inputMode="text"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={12}
              placeholder="e.g. 12, −3.5 or 7/4"
              aria-describedby={`${groupName}-help`}
              className={cn(
                "numeric h-11 max-w-[14rem] text-base",
                revealed && correct && "border-success",
                revealed && !correct && "border-destructive",
              )}
            />
            {revealed ? (
              <span className={cn("flex items-center gap-1.5 text-sm font-medium", correct ? "text-success" : "text-destructive")}>
                {correct ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
                {correct ? "Correct" : "Incorrect"}
              </span>
            ) : null}
          </div>
          <p id={`${groupName}-help`} className="text-xs text-muted-foreground">
            Type an integer, a decimal or a fraction. A decimal that does not terminate needs at least three decimal
            places, so enter 2/3 as 2/3, 0.666 or 0.667.
          </p>
          {revealed && !correct ? (
            <p className="text-sm">
              Correct answer: <RichText text={question.answer.display} inline />
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
