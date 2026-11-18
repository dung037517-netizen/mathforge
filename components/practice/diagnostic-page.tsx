"use client";

import { ArrowRight, ClipboardCheck, HelpCircle, ListChecks, Timer } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { QuestionView } from "@/components/practice/question-view";
import { CourseSwitch, MasteryBar, Stat } from "@/components/practice/widgets";
import { PageHeading, PageShell } from "@/components/site/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { estimateAbility, type ScoredResponse } from "@/lib/practice/irt";
import { domainName, rankSkills } from "@/lib/practice/mastery";
import { isAnswered } from "@/lib/practice/question";
import { randomSeed } from "@/lib/practice/rng";
import { diagnosticPlan, diagnosticQuestion } from "@/lib/practice/selection";
import { progressStore } from "@/lib/practice/store";
import { getCourse, skillsInCourse } from "@/lib/practice/taxonomy";
import { useMastery, useProgress } from "@/lib/practice/use-progress";
import type { CourseId, Question, Response } from "@/types/practice";

interface Run {
  readonly course: CourseId;
  readonly seed: number;
  readonly plan: readonly string[];
  readonly index: number;
  readonly question: Question | null;
  readonly results: readonly ScoredResponse[];
  readonly used: readonly string[];
}

function Report({ course, results }: { readonly course: CourseId; readonly results: readonly ScoredResponse[] }) {
  const report = useMastery(course);
  const correct = results.filter((result) => result.correct).length;
  const weakest = rankSkills(report, course).slice(0, 3);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Answered correctly" value={`${correct} / ${results.length}`} />
        <Stat
          label="Estimated overall mastery"
          value={`${Math.round(report.course.value * 100)}%`}
          hint={`Likely between ${Math.round(report.course.low * 100)}% and ${Math.round(report.course.high * 100)}%`}
        />
        <Stat label="Added to your notebook" value={results.length - correct} hint="Missed questions to review" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Where you stand, by domain</CardTitle>
          <CardDescription>
            A diagnostic is short, so these are first estimates with wide ranges. They tighten as you practice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {getCourse(course).domains.map((domain) => {
            const mastery = report.domains[domain];
            return mastery === undefined ? null : (
              <MasteryBar
                key={domain}
                label={domainName(domain)}
                mastery={mastery}
                detail={`${mastery.correct} of ${mastery.attempts} correct`}
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/practice?domain=${domain}`}>Practice</Link>
                  </Button>
                }
              />
            );
          })}
        </CardContent>
      </Card>

      {weakest.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Start here</CardTitle>
            <CardDescription>The three skills with the lowest estimates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {weakest.map(({ skill, mastery }) => (
              <MasteryBar
                key={skill.id}
                label={skill.name}
                mastery={mastery}
                detail={skill.description}
                action={
                  <Button asChild size="sm">
                    <Link href={`/practice?skill=${skill.id}`}>Practice</Link>
                  </Button>
                }
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/practice">
            Start adaptive practice
            <ArrowRight aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/review">Review missed questions</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/progress">See the full report</Link>
        </Button>
      </div>
    </div>
  );
}

export function DiagnosticPage() {
  const { state } = useProgress();
  const course = state.course;
  const [run, setRun] = React.useState<Run | null>(null);
  const [response, setResponse] = React.useState<Response | null>(null);
  const shownAt = React.useRef(0);

  React.useEffect(() => {
    shownAt.current = performance.now();
  }, [run?.index]);

  const start = (): void => {
    const seed = randomSeed();
    const plan = diagnosticPlan(course, seed);
    setRun({ course, seed, plan, index: 0, question: diagnosticQuestion(plan, 0, 0, seed, []), results: [], used: [] });
    setResponse(null);
  };

  const submit = (given: Response | null): void => {
    if (run === null || run.question === null) return;
    const outcome = progressStore.record({
      question: run.question,
      response: given,
      ms: performance.now() - shownAt.current,
      source: "diagnostic",
    });
    const results = [...run.results, { level: run.question.level, format: run.question.format, correct: outcome.correct }];
    const used = [...run.used, run.question.templateId];
    const index = run.index + 1;
    if (index >= run.plan.length) {
      progressStore.recordDiagnostic(run.course, results.length, results.filter((result) => result.correct).length);
      setRun({ ...run, index, question: null, results, used });
    } else {
      const theta = estimateAbility(results).theta;
      setRun({ ...run, index, question: diagnosticQuestion(run.plan, index, theta, run.seed, used), results, used });
    }
    setResponse(null);
  };

  if (run !== null && run.index >= run.plan.length) {
    return (
      <PageShell width="narrow">
        <PageHeading
          title="Your diagnostic report"
          description={`${getCourse(run.course).name}: ${run.plan.length} questions across every skill.`}
        >
          <Button variant="outline" onClick={() => setRun(null)}>
            Take it again
          </Button>
        </PageHeading>
        <Report course={run.course} results={run.results} />
      </PageShell>
    );
  }

  if (run !== null && run.question !== null) {
    return (
      <PageShell width="narrow">
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Diagnostic · {getCourse(run.course).name}</span>
            <span className="numeric text-muted-foreground">
              {run.index + 1} / {run.plan.length}
            </span>
          </div>
          <Progress value={(run.index / run.plan.length) * 100} aria-label="Diagnostic progress" />
        </div>
        <Card>
          <CardContent className="space-y-6 p-5 sm:p-7">
            <QuestionView
              key={run.question.id}
              question={run.question}
              response={response}
              onChange={setResponse}
              label={`Question ${run.index + 1}`}
              onSubmit={() => submit(response)}
            />
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-5">
              <Button onClick={() => submit(response)} disabled={!isAnswered(response)}>
                Submit answer
                <ArrowRight aria-hidden />
              </Button>
              <Button variant="ghost" onClick={() => submit(null)}>
                <HelpCircle aria-hidden />
                I don&rsquo;t know
              </Button>
            </div>
          </CardContent>
        </Card>
        <p className="mt-4 text-xs text-muted-foreground">
          Answers are not shown during the diagnostic. Every missed question is saved to your notebook with a full
          worked solution.
        </p>
      </PageShell>
    );
  }

  const skills = skillsInCourse(course).length;
  const length = Math.max(12, skills);
  const previous = state.diagnostics.filter((entry) => entry.course === course).at(-1);
  return (
    <PageShell width="narrow">
      <PageHeading
        title="Diagnose"
        description="A short adaptive test that visits every skill in the course once, so practice can start where it will help most."
      >
        <CourseSwitch value={course} />
      </PageHeading>

      <Card>
        <CardContent className="space-y-6 p-5 sm:p-7">
          <ul className="grid gap-4 sm:grid-cols-3">
            <li className="flex gap-3">
              <ListChecks className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="text-sm font-medium">{length} questions</p>
                <p className="text-sm text-muted-foreground">Every one of the {skills} skills is covered.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <Timer className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="text-sm font-medium">About {Math.round(length * 1.3)} minutes</p>
                <p className="text-sm text-muted-foreground">Untimed. Take the time each question needs.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <ClipboardCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="text-sm font-medium">Adapts as you go</p>
                <p className="text-sm text-muted-foreground">Difficulty follows your answers so far.</p>
              </div>
            </li>
          </ul>
          <div className="rounded-lg border border-border bg-surface-sunken px-4 py-3 text-sm text-muted-foreground">
            If you do not know an answer, choose <span className="font-medium text-foreground">I don&rsquo;t know</span>{" "}
            rather than guessing. A lucky guess makes the report less accurate, and the report is only for you.
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={start}>
              Start the diagnostic
              <ArrowRight aria-hidden />
            </Button>
            {previous !== undefined ? (
              <p className="text-sm text-muted-foreground">
                Last taken: {previous.correct} of {previous.answered} correct.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
