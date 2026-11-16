"use client";

import {
  ArrowRight,
  BookOpenCheck,
  ChartLine,
  ClipboardList,
  FlaskConical,
  GraduationCap,
  ShieldCheck,
  Sigma,
  Target,
  Timer,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { QuestionView } from "@/components/practice/question-view";
import { Solution } from "@/components/practice/solution";
import { MasteryBar, percent } from "@/components/practice/widgets";
import { PageShell } from "@/components/site/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { domainName, rankSkills } from "@/lib/practice/mastery";
import { isAnswered } from "@/lib/practice/question";
import { auditedTemplateCount, regenerate, summarizeBank } from "@/lib/practice/registry";
import { dueCards } from "@/lib/practice/review";
import { buildSampleProgress } from "@/lib/practice/sample";
import { progressStore } from "@/lib/practice/store";
import { COURSES, getCourse, SKILLS } from "@/lib/practice/taxonomy";
import { useMastery, useProgress } from "@/lib/practice/use-progress";
import type { Response } from "@/types/practice";

const BANK = summarizeBank();
const AUDITED = auditedTemplateCount();

const LOOP: readonly {
  readonly step: string;
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly cta: string;
  readonly icon: typeof Target;
}[] = [
  {
    step: "1",
    title: "Diagnose",
    description:
      "A short adaptive test visits every skill in the course once and gives a first estimate of where you stand, with honest error bars.",
    href: "/diagnostic",
    cta: "Take the diagnostic",
    icon: ClipboardList,
  },
  {
    step: "2",
    title: "Practice",
    description:
      "Questions are drawn mostly from your weakest skills, at a difficulty matched to you. Every one comes with a worked solution and the specific mistake behind each wrong choice.",
    href: "/practice",
    cta: "Start practicing",
    icon: Target,
  },
  {
    step: "3",
    title: "Review",
    description:
      "Every miss goes into a notebook and comes back after 1, 3, 7 and 14 days with new numbers, until you have answered it correctly five times in a row.",
    href: "/review",
    cta: "Open the notebook",
    icon: BookOpenCheck,
  },
];

/** A fixed, deterministic question so the page shows real content on first paint. */
const SAMPLE_REF = { templateId: "linear-model-solve", seed: 12, level: 2, format: "choice" } as const;

function SampleQuestion() {
  const question = React.useMemo(() => regenerate(SAMPLE_REF), []);
  const [response, setResponse] = React.useState<Response | null>(null);
  const [revealed, setRevealed] = React.useState(false);
  if (question === null) return null;
  return (
    <Card className="bg-card/95 shadow-lg backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm">Try one now</CardTitle>
          <Badge variant="outline">SAT Math · Algebra</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <QuestionView question={question} response={response} onChange={setResponse} revealed={revealed} />
        {revealed ? <Solution question={question} response={response} /> : null}
        <div className="flex flex-wrap items-center gap-2">
          {revealed ? (
            <Button asChild>
              <Link href="/practice">
                Keep going
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          ) : (
            <Button onClick={() => setRevealed(true)} disabled={!isAnswered(response)}>
              Check answer
            </Button>
          )}
          <span className="text-xs text-muted-foreground">This sample question is not saved.</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Snapshot() {
  const { state, hydrated, now, demo } = useProgress();
  const course = state.course;
  const report = useMastery(course);
  const weakest = rankSkills(report, course).slice(0, 2);
  const due = dueCards(state.cards, now).length;

  if (!hydrated) return null;

  if (report.course.attempts === 0) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="max-w-xl">
            <p className="font-medium">Your progress report builds itself as you answer questions.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Nothing to show yet. You can preview the report with a simulated student — it is clearly labeled as
              sample data and does not touch anything of yours.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/diagnostic">Take the diagnostic</Link>
            </Button>
            <Button asChild variant="outline" onClick={() => progressStore.enterDemo(buildSampleProgress(now > 0 ? now : Date.now(), course))}>
              <Link href="/progress">
                <FlaskConical aria-hidden />
                Preview with sample data
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartLine className="size-4 text-primary" aria-hidden />
          {demo ? "Sample student" : "Welcome back"} · {getCourse(course).name}
        </CardTitle>
        <CardDescription>
          {report.course.attempts} questions answered · overall mastery {percent(report.course.value)} ·{" "}
          {due === 0 ? "nothing due for review" : `${due} due for review`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {weakest.map(({ skill, mastery }) => (
          <MasteryBar
            key={skill.id}
            label={skill.name}
            mastery={mastery}
            detail={domainName(skill.domain)}
            action={
              <Button asChild size="sm" variant="outline">
                <Link href={`/practice?skill=${skill.id}`}>Practice</Link>
              </Button>
            }
          />
        ))}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild>
            <Link href={due > 0 ? "/review" : "/practice"}>
              {due > 0 ? "Review what is due" : "Continue practicing"}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/progress">Full report</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function HomePage() {
  return (
    <PageShell className="!max-w-none !p-0">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 aurora" aria-hidden />
        <div className="pointer-events-none absolute inset-0 grid-backdrop" aria-hidden />
        <div className="relative mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:items-start">
          <div>
            <Badge variant="outline" className="mb-5">
              <GraduationCap className="size-3" aria-hidden />
              SAT Math · AP Calculus · AP Statistics
            </Badge>
            <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Know exactly what to <span className="text-gradient">practice next</span>
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg text-muted-foreground">
              MathForge is a free practice platform for SAT and AP math. A short diagnostic finds your weak skills,
              adaptive practice works on them with step-by-step solutions, and a review notebook brings every mistake
              back until it sticks.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/diagnostic">
                  Take the diagnostic
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/practice">Start practicing</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/mock">
                  <Timer aria-hidden />
                  Mock test
                </Link>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-xl grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              {[
                { label: "Question types", value: BANK.templates },
                { label: "Skills tracked", value: SKILLS.length },
                { label: "Courses", value: COURSES.length },
                { label: "Cost, accounts, ads", value: 0 },
              ].map((stat) => (
                <div key={stat.label}>
                  <dd className="numeric text-2xl font-semibold tracking-tight">{stat.value}</dd>
                  <dt className="mt-0.5 text-xs text-muted-foreground">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>
          <SampleQuestion />
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] space-y-16 px-4 py-14 sm:px-6">
        <Snapshot />

        {/* The loop */}
        <section aria-labelledby="loop-heading">
          <div className="mb-6 max-w-2xl">
            <h2 id="loop-heading" className="text-2xl font-semibold tracking-tight">
              Diagnose, practice, review
            </h2>
            <p className="mt-2 text-muted-foreground">
              Doing more problems is not the same as getting better. The site is built around a loop that keeps
              pointing you at what you cannot do yet.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {LOOP.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <span className="numeric flex size-8 items-center justify-center rounded-lg bg-primary/15 text-sm font-semibold text-primary">
                        {item.step}
                      </span>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className="size-4 text-muted-foreground" aria-hidden />
                        {item.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between gap-5">
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                    <Button asChild variant="outline" className="w-fit">
                      <Link href={item.href}>
                        {item.cta}
                        <ArrowRight aria-hidden />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Mock test and progress */}
        <section className="grid gap-4 md:grid-cols-2" aria-label="Mock tests and progress tracking">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Timer className="size-4 text-primary" aria-hidden />
                Mock tests in the digital SAT format
              </CardTitle>
              <CardDescription>
                Two timed modules of 22 questions. The second module is harder or easier depending on how the first
                one went, as on the real test.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>Mark for review, cross out choices, built-in calculator and reference sheet.</li>
                <li>An estimated 200–800 score, always shown with a range.</li>
                <li>A question-by-question review with full solutions afterwards.</li>
              </ul>
              <Button asChild>
                <Link href="/mock">
                  Open mock tests
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ChartLine className="size-4 text-primary" aria-hidden />
                Progress you can trust
              </CardTitle>
              <CardDescription>
                Mastery is estimated for each of the {SKILLS.length} skills, weighted toward your recent answers, and
                drawn with its uncertainty.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>A skill with three answers is not judged on three answers alone.</li>
                <li>&ldquo;Not enough data&rdquo; is shown as exactly that, never as a number.</li>
                <li>Stored only in your browser, with a one-click backup.</li>
              </ul>
              <Button asChild variant="outline">
                <Link href="/progress">
                  See your progress
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Coverage */}
        <section aria-labelledby="coverage-heading">
          <div className="mb-6 max-w-2xl">
            <h2 id="coverage-heading" className="text-2xl font-semibold tracking-tight">
              What it covers
            </h2>
            <p className="mt-2 text-muted-foreground">
              Every question is written as a small program, so each of the {BANK.templates} question types produces a
              fresh problem — new numbers, same idea — every time.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {COURSES.map((course) => {
              const summary = summarizeBank(course.id);
              return (
                <Card key={course.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{course.name}</CardTitle>
                    <CardDescription>{course.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="flex flex-wrap gap-1.5">
                      {course.domains.map((domain) => (
                        <li key={domain}>
                          <Badge variant="secondary">{domainName(domain)}</Badge>
                        </li>
                      ))}
                    </ul>
                    <p className="numeric text-xs text-muted-foreground">
                      {summary.templates} question types · {summary.skills} skills
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Under the hood */}
        <section className="grid gap-4 md:grid-cols-2" aria-label="How it works">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="size-4 text-success" aria-hidden />
                Answer keys that are checked, not trusted
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                {AUDITED} of the {BANK.templates} question types state a fact their answer must satisfy. On every
                code change, a math engine written from scratch for this site
                re-derives that fact for thousands of generated questions — by direct evaluation, numerical
                differentiation or numerical integration — and the build fails if a single key disagrees.
              </p>
              <p>
                The mastery model borrows from actuarial credibility theory: a skill with little evidence is pulled
                toward what is known about related skills, in exact proportion to how little is known.
              </p>
              <Button asChild variant="link" className="h-auto p-0">
                <Link href="/method">
                  How it works, and what it cannot tell you
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sigma className="size-4 text-primary" aria-hidden />
                The Lab
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                For exploring rather than being tested: type any expression and watch it differentiated rule by rule,
                plotted and integrated. Then follow the same mathematics into probability distributions, survival
                models and Monte Carlo simulation — the tools of an actuary.
              </p>
              <Button asChild variant="outline">
                <Link href="/lab">
                  Open the Lab
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </PageShell>
  );
}
