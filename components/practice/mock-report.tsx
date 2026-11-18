"use client";

import { ArrowRight, Check, ChevronDown, Minus, TrendingDown, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { QuestionView } from "@/components/practice/question-view";
import { Solution } from "@/components/practice/solution";
import { Stat } from "@/components/practice/widgets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { domainName } from "@/lib/practice/mastery";
import { BLUEPRINTS, breakdown, formatClock, SAT_DOMAINS } from "@/lib/practice/mock";
import { regenerate } from "@/lib/practice/registry";
import { findSkill } from "@/lib/practice/taxonomy";
import { cn } from "@/lib/utils";
import { LEVEL_LABELS, type MockItem, type MockResponse, type MockResult } from "@/types/practice";

function ReviewRow({
  item,
  response,
  number,
}: {
  readonly item: MockItem;
  readonly response: MockResponse;
  readonly number: number;
}) {
  const [open, setOpen] = React.useState(false);
  const question = React.useMemo(() => (open ? regenerate(item) : null), [open, item]);
  const panelId = React.useId();
  const blank = response.response === null;
  return (
    <li className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full",
            response.correct ? "bg-success/15 text-success" : blank ? "bg-muted text-muted-foreground" : "bg-destructive/15 text-destructive",
          )}
        >
          {response.correct ? <Check className="size-3.5" aria-hidden /> : blank ? <Minus className="size-3.5" aria-hidden /> : <X className="size-3.5" aria-hidden />}
          <span className="sr-only">{response.correct ? "Correct" : blank ? "Not answered" : "Incorrect"}</span>
        </span>
        <span className="numeric w-6 shrink-0 text-muted-foreground">{number}</span>
        <span className="min-w-0 flex-1 truncate">{findSkill(item.skillId)?.name ?? item.skillId}</span>
        <span className="hidden text-xs text-muted-foreground sm:inline">{LEVEL_LABELS[item.level]}</span>
        <span className="numeric hidden w-12 text-right text-xs text-muted-foreground sm:inline">
          {blank ? "—" : formatClock(response.ms / 1000)}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div id={panelId} className="space-y-5 border-t border-border px-4 py-5">
          {question === null ? (
            <p className="text-sm text-muted-foreground">This question type is no longer in the bank.</p>
          ) : (
            <>
              <QuestionView question={question} response={response.response} onChange={() => undefined} revealed />
              <Solution question={question} response={response.response} />
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}

export interface MockReportProps {
  readonly result: MockResult;
  /** The score of the test taken before this one, for the trend arrow. */
  readonly previousScore?: number;
}

export function MockReport({ result, previousScore }: MockReportProps) {
  const summary = React.useMemo(() => breakdown(result), [result]);
  const blueprint = BLUEPRINTS[result.kind];
  const { estimate } = result;
  const change = previousScore === undefined ? null : estimate.score - previousScore;
  const weakest = [...SAT_DOMAINS]
    .filter((domain) => summary.domains[domain] !== undefined)
    .sort((a, b) => summary.domains[a].correct / summary.domains[a].total - summary.domains[b].correct / summary.domains[b].total)[0];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 aurora opacity-60" aria-hidden />
          <CardContent className="relative grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:p-8">
            <div>
              <p className="text-sm text-muted-foreground">Estimated Math section score</p>
              <p className="numeric mt-1 text-6xl font-semibold tracking-tight">{estimate.score}</p>
              <p className="numeric mt-1 text-sm text-muted-foreground">
                Likely range {estimate.low}–{estimate.high}
              </p>
              {change !== null && change !== 0 ? (
                <p className={cn("mt-2 flex items-center gap-1 text-sm font-medium", change > 0 ? "text-success" : "text-destructive")}>
                  {change > 0 ? <TrendingUp className="size-4" aria-hidden /> : <TrendingDown className="size-4" aria-hidden />}
                  {change > 0 ? "+" : ""}
                  {change} from your previous test
                </p>
              ) : null}
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{blueprint.name}</Badge>
                <Badge variant={result.route === "higher" ? "success" : "secondary"}>
                  Module 2: {result.route === "higher" ? "harder set" : "easier set"}
                </Badge>
              </div>
              <p>
                This is an estimate from MathForge&rsquo;s own response model on the 200–800 scale. It has not been
                equated against official test results, so read it as a range, not a prediction. The questions are
                original; none are from a real exam.
              </p>
            </div>
          </CardContent>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Correct" value={`${summary.overall.correct} / ${summary.overall.total}`} />
        <Stat label="Unanswered" value={summary.unanswered} />
        <Stat label="Median time per question" value={formatClock(summary.medianSeconds)} />
        <Stat
          label="Time used"
          value={formatClock(result.modules[0].secondsUsed + result.modules[1].secondsUsed)}
          hint={`of ${formatClock(2 * blueprint.secondsPerModule)}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By content area</CardTitle>
          <CardDescription>Every miss has been added to your review notebook.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {SAT_DOMAINS.map((domain) => {
            const tally = summary.domains[domain];
            if (tally === undefined) return null;
            const share = tally.correct / tally.total;
            return (
              <div key={domain} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{domainName(domain)}</span>
                  <span className="numeric text-muted-foreground">
                    {tally.correct} / {tally.total}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-sunken" role="img" aria-label={`${tally.correct} of ${tally.total} correct`}>
                  <div
                    className={cn("h-full rounded-full", share >= 0.8 ? "bg-success" : share >= 0.5 ? "bg-accent" : "bg-destructive")}
                    style={{ width: `${Math.round(share * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2 pt-2">
            {weakest !== undefined ? (
              <Button asChild>
                <Link href={`/practice?domain=${weakest}`}>
                  Practice {domainName(weakest)}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/review">Review missed questions</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {result.modules.map((part, moduleIndex) => (
        <section key={moduleIndex} aria-labelledby={`module-${moduleIndex}`}>
          <h2 id={`module-${moduleIndex}`} className="mb-3 text-lg font-semibold tracking-tight">
            Module {moduleIndex + 1}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {part.responses.filter((response) => response.correct).length} of {part.items.length} correct
            </span>
          </h2>
          <ol className="space-y-1.5">
            {part.items.map((item, index) => (
              <ReviewRow key={`${item.templateId}-${index}`} item={item} response={part.responses[index]} number={index + 1} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
