"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calculator as CalculatorIcon,
  Clock,
  EyeOff,
  Flag,
  History,
  PlayCircle,
  Trash2,
} from "lucide-react";
import * as React from "react";

import { Modal } from "@/components/practice/modal";
import { MockReport } from "@/components/practice/mock-report";
import { Calculator, ReferenceSheet } from "@/components/practice/mock-tools";
import { QuestionView } from "@/components/practice/question-view";
import { LoadingCard } from "@/components/practice/widgets";
import { PageHeading, PageShell } from "@/components/site/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { advanceToSecondModule, BLUEPRINTS, formatClock, startMock } from "@/lib/practice/mock";
import { isAnswered } from "@/lib/practice/question";
import { regenerate } from "@/lib/practice/registry";
import { randomSeed } from "@/lib/practice/rng";
import { progressStore } from "@/lib/practice/store";
import { useProgress } from "@/lib/practice/use-progress";
import { cn } from "@/lib/utils";
import type { MockKind, MockSession, Response } from "@/types/practice";

/* ------------------------------------------------------------------ */
/* Runner                                                              */
/* ------------------------------------------------------------------ */

function replaceAt<T>(rows: readonly (readonly T[])[], row: number, column: number, value: T): T[][] {
  return rows.map((cells, rowIndex) =>
    rowIndex === row ? cells.map((cell, columnIndex) => (columnIndex === column ? value : cell)) : [...cells],
  );
}

interface RunnerProps {
  readonly initial: MockSession;
  /** Called with the final state of the module when it is submitted or time runs out. */
  readonly onSubmit: (session: MockSession) => void;
  readonly onExit: () => void;
}

function Runner({ initial, onSubmit, onExit }: RunnerProps) {
  const [session, setSession] = React.useState(initial);
  const [index, setIndex] = React.useState(0);
  const [secondsLeft, setSecondsLeft] = React.useState(initial.secondsLeft);
  const [hideClock, setHideClock] = React.useState(false);
  const [crossMode, setCrossMode] = React.useState(false);
  const [crossed, setCrossed] = React.useState<Readonly<Record<number, readonly number[]>>>({});
  const [tool, setTool] = React.useState<"reference" | "calculator" | "submit" | "exit" | null>(null);

  const moduleIndex = session.moduleIndex;
  const items = session.modules[moduleIndex];
  const answers = session.answers[moduleIndex];
  const flags = session.flags[moduleIndex];
  const question = React.useMemo(() => regenerate(items[index]), [items, index]);

  // Refs keep the interval and the unload handler pointed at the latest state.
  const latest = React.useRef({ session, index, secondsLeft });
  const enteredAt = React.useRef(0);
  React.useEffect(() => {
    latest.current = { session, index, secondsLeft };
  }, [session, index, secondsLeft]);
  React.useEffect(() => {
    enteredAt.current = performance.now();
  }, [index]);

  /** Fold the time spent on the current question into the session. */
  const withTime = React.useCallback((current: MockSession, at: number, seconds: number): MockSession => {
    const elapsed = performance.now() - enteredAt.current;
    enteredAt.current = performance.now();
    const spent = current.timeSpent[current.moduleIndex][at] ?? 0;
    return {
      ...current,
      timeSpent: replaceAt(current.timeSpent, current.moduleIndex, at, spent + elapsed),
      secondsLeft: seconds,
      savedAt: timestamp(),
    };
  }, []);

  const commit = (next: MockSession): void => {
    setSession(next);
    progressStore.saveMock(next);
  };

  const submitRef = React.useRef<() => void>(() => undefined);
  React.useEffect(() => {
    submitRef.current = () => {
      const state = latest.current;
      onSubmit(withTime(state.session, state.index, Math.max(0, state.secondsLeft)));
    };
  }, [onSubmit, withTime]);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      const state = latest.current;
      const next = state.secondsLeft - 1;
      if (next <= 0) {
        window.clearInterval(timer);
        setSecondsLeft(0);
        latest.current = { ...state, secondsLeft: 0 };
        submitRef.current();
        return;
      }
      setSecondsLeft(next);
      // Save the clock every few seconds so a refresh loses almost nothing.
      if (next % 5 === 0) progressStore.saveMock({ ...state.session, secondsLeft: next, savedAt: timestamp() });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const goTo = (target: number): void => {
    if (target < 0 || target >= items.length || target === index) return;
    commit(withTime(session, index, secondsLeft));
    setIndex(target);
  };

  const answer = (response: Response | null): void => {
    const blank = response !== null && !isAnswered(response);
    commit({
      ...session,
      answers: replaceAt(session.answers, moduleIndex, index, blank ? null : response),
      secondsLeft,
      savedAt: timestamp(),
    });
  };

  const toggleFlag = (): void => {
    commit({ ...session, flags: replaceAt(session.flags, moduleIndex, index, !flags[index]), secondsLeft, savedAt: timestamp() });
  };

  const toggleCross = (choice: number): void => {
    setCrossed((current) => {
      const existing = current[index] ?? [];
      const next = existing.includes(choice) ? existing.filter((entry) => entry !== choice) : [...existing, choice];
      return { ...current, [index]: next };
    });
  };

  const answeredCount = answers.filter((entry) => entry !== null).length;
  const flaggedCount = flags.filter(Boolean).length;
  const lowTime = secondsLeft <= 300;

  return (
    <PageShell width="narrow" className="!py-6">
      <div className="sticky top-14 z-30 -mx-4 mb-5 border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              Module {moduleIndex + 1} of 2
              <span className="ml-2 font-normal text-muted-foreground">
                {answeredCount} of {items.length} answered
              </span>
            </p>
          </div>
          <div
            className={cn("flex items-center gap-2 rounded-md border border-border px-2.5 py-1", lowTime && "border-destructive/60 text-destructive")}
            role="timer"
            aria-label="Time remaining in this module"
          >
            <Clock className="size-4" aria-hidden />
            <span className="numeric text-sm font-semibold">{hideClock ? "––:––" : formatClock(secondsLeft)}</span>
            <button
              type="button"
              onClick={() => setHideClock((current) => !current)}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label={hideClock ? "Show the clock" : "Hide the clock"}
              aria-pressed={hideClock}
            >
              <EyeOff className="size-3.5" aria-hidden />
            </button>
          </div>
          <Button size="sm" variant="outline" onClick={() => setTool("reference")}>
            <BookOpen aria-hidden />
            <span className="hidden sm:inline">Reference</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setTool("calculator")}>
            <CalculatorIcon aria-hidden />
            <span className="hidden sm:inline">Calculator</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-6 p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              {index + 1}
            </span>
            <div className="flex items-center gap-2">
              {question?.answer.kind === "choice" ? (
                <Button size="sm" variant={crossMode ? "secondary" : "ghost"} onClick={() => setCrossMode((current) => !current)} aria-pressed={crossMode}>
                  Cross out
                </Button>
              ) : null}
              <Button size="sm" variant={flags[index] ? "secondary" : "ghost"} onClick={toggleFlag} aria-pressed={flags[index]}>
                <Flag className={cn(flags[index] && "fill-warning text-warning")} aria-hidden />
                {flags[index] ? "Marked for review" : "Mark for review"}
              </Button>
            </div>
          </div>

          {question === null ? (
            <LoadingCard />
          ) : (
            <QuestionView
              key={question.id}
              question={question}
              response={answers[index]}
              onChange={answer}
              crossed={crossed[index] ?? []}
              onToggleCross={crossMode ? toggleCross : undefined}
            />
          )}

          <div className="flex items-center justify-between gap-2 border-t border-border pt-5">
            <Button variant="outline" onClick={() => goTo(index - 1)} disabled={index === 0}>
              <ArrowLeft aria-hidden />
              Back
            </Button>
            {index === items.length - 1 ? (
              <Button onClick={() => setTool("submit")}>Submit module</Button>
            ) : (
              <Button onClick={() => goTo(index + 1)}>
                Next
                <ArrowRight aria-hidden />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <nav aria-label="Questions in this module" className="mt-5">
        <ol className="flex flex-wrap gap-1.5">
          {items.map((item, position) => {
            const done = answers[position] !== null;
            return (
              <li key={`${item.templateId}-${position}`}>
                <button
                  type="button"
                  onClick={() => goTo(position)}
                  aria-current={position === index ? "step" : undefined}
                  aria-label={`Question ${position + 1}${done ? ", answered" : ", not answered"}${flags[position] ? ", marked for review" : ""}`}
                  className={cn(
                    "numeric relative flex size-9 items-center justify-center rounded-md border text-sm transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    position === index && "border-primary ring-1 ring-primary",
                    done ? "border-transparent bg-primary/20 font-medium text-foreground" : "border-dashed border-border text-muted-foreground",
                  )}
                >
                  {position + 1}
                  {flags[position] ? <Flag className="absolute -right-1 -top-1 size-3 fill-warning text-warning" aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Filled: answered · Dashed: unanswered · Flag: marked for review</p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setTool("exit")}>
              Save and exit
            </Button>
            <Button size="sm" variant="outline" onClick={() => setTool("submit")}>
              Submit module
            </Button>
          </div>
        </div>
      </nav>

      <ReferenceSheet open={tool === "reference"} onClose={() => setTool(null)} />
      <Calculator open={tool === "calculator"} onClose={() => setTool(null)} />
      <Modal open={tool === "submit"} onClose={() => setTool(null)} title={`Submit module ${moduleIndex + 1}?`}>
        <div className="space-y-4 text-sm">
          <p>
            You have answered <strong>{answeredCount}</strong> of <strong>{items.length}</strong> questions
            {flaggedCount > 0 ? (
              <>
                {" "}
                and marked <strong>{flaggedCount}</strong> for review
              </>
            ) : null}
            . {formatClock(secondsLeft)} remains.
          </p>
          <p className="text-muted-foreground">
            Once a module is submitted you cannot return to it. Unanswered questions are scored as incorrect.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTool(null)}>
              Keep working
            </Button>
            <Button
              onClick={() => {
                setTool(null);
                submitRef.current();
              }}
            >
              Submit
            </Button>
          </div>
        </div>
      </Modal>
      <Modal open={tool === "exit"} onClose={() => setTool(null)} title="Save and exit?">
        <div className="space-y-4 text-sm">
          <p>Your answers and the time remaining are saved in this browser. You can resume from the Mock test page.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTool(null)}>
              Keep working
            </Button>
            <Button
              onClick={() => {
                progressStore.saveMock(withTime(session, index, secondsLeft));
                onExit();
              }}
            >
              Save and exit
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

type View =
  | { readonly kind: "setup" }
  | { readonly kind: "run"; readonly session: MockSession }
  | { readonly kind: "break"; readonly session: MockSession }
  | { readonly kind: "report"; readonly id: string };

/** Wall-clock time, read only from event handlers and timers, never during render. */
const timestamp = (): number => Date.now();

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function MockPage() {
  const { state, hydrated } = useProgress();
  const [view, setView] = React.useState<View>({ kind: "setup" });

  const begin = (kind: MockKind): void => {
    const session = startMock(kind, randomSeed(), timestamp());
    progressStore.saveMock(session);
    setView({ kind: "run", session });
  };

  const onSubmit = React.useCallback((session: MockSession): void => {
    if (session.moduleIndex === 0) {
      const next = advanceToSecondModule(session, timestamp());
      progressStore.saveMock(next);
      setView({ kind: "break", session: next });
      return;
    }
    const result = progressStore.completeMock(session);
    setView(result === null ? { kind: "setup" } : { kind: "report", id: result.id });
  }, []);

  if (view.kind === "run") {
    return (
      <Runner
        key={`${view.session.id}-${view.session.moduleIndex}`}
        initial={view.session}
        onSubmit={onSubmit}
        onExit={() => setView({ kind: "setup" })}
      />
    );
  }

  if (view.kind === "break") {
    const blueprint = BLUEPRINTS[view.session.kind];
    return (
      <PageShell width="narrow">
        <PageHeading title="Module 1 submitted" description="Take a breath. Module 2 has been assembled based on how you did in Module 1." />
        <Card>
          <CardContent className="space-y-5 p-6">
            <p className="text-sm text-muted-foreground">
              Module 2 has {blueprint.questionsPerModule} questions and {formatClock(blueprint.secondsPerModule)} on the
              clock. The clock starts when you press the button. Your place is saved if you would rather come back later.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="lg" onClick={() => setView({ kind: "run", session: view.session })}>
                Start Module 2
                <ArrowRight aria-hidden />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setView({ kind: "setup" })}>
                Come back later
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (view.kind === "report") {
    const position = state.mocks.findIndex((mock) => mock.id === view.id);
    const result = state.mocks[position];
    return (
      <PageShell width="narrow">
        <PageHeading title="Mock test report" description={result === undefined ? undefined : DATE_FORMAT.format(result.finishedAt)}>
          <Button variant="outline" onClick={() => setView({ kind: "setup" })}>
            <ArrowLeft aria-hidden />
            All tests
          </Button>
        </PageHeading>
        {result === undefined ? (
          <LoadingCard />
        ) : (
          <MockReport result={result} previousScore={position > 0 ? state.mocks[position - 1].estimate.score : undefined} />
        )}
      </PageShell>
    );
  }

  const active = state.activeMock;
  return (
    <PageShell width="narrow">
      <PageHeading
        title="Mock test"
        description="A timed Math section in the format of the digital SAT: two modules, with the second chosen by how you do on the first."
      />

      {active !== null ? (
        <Card className="mb-6 border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="size-4 text-primary" aria-hidden />
              You have a test in progress
            </CardTitle>
            <CardDescription>
              {BLUEPRINTS[active.kind].name} · Module {active.moduleIndex + 1} · {formatClock(active.secondsLeft)} left
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => setView({ kind: "run", session: active })}>Resume</Button>
            <Button variant="ghost" onClick={() => progressStore.saveMock(null)}>
              <Trash2 aria-hidden />
              Discard
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {(["full", "quick"] as const).map((kind) => {
          const blueprint = BLUEPRINTS[kind];
          return (
            <Card key={kind}>
              <CardHeader>
                <CardTitle>{blueprint.name}</CardTitle>
                <CardDescription>
                  2 modules × {blueprint.questionsPerModule} questions · {formatClock(blueprint.secondsPerModule)} each
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li>{kind === "full" ? "Same length and timing as the real Math section." : "Half the length, for a quick check between full tests."}</li>
                  <li>About one question in four is a typed answer.</li>
                  <li>Estimated 200–800 score with a range.</li>
                </ul>
                <Button onClick={() => begin(kind)} disabled={!hydrated || active !== null} className="w-full">
                  Start
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Each module mixes the four content areas in the proportions of the real section: Algebra, Advanced Math,
            Problem-Solving and Data Analysis, and Geometry and Trigonometry. You can move back and forth within a
            module, mark questions for review and cross out choices, but you cannot return to a module once it is
            submitted.
          </p>
          <p>
            A built-in calculator and a reference sheet are available throughout. Every question is generated fresh,
            so no two tests are the same.
          </p>
        </CardContent>
      </Card>

      <section className="mt-10" aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight">
          <History className="size-4 text-muted-foreground" aria-hidden />
          Past tests
        </h2>
        {state.mocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{hydrated ? "No tests taken yet." : "Loading…"}</p>
        ) : (
          <ul className="space-y-2">
            {[...state.mocks].reverse().map((mock) => (
              <li key={mock.id}>
                <button
                  type="button"
                  onClick={() => setView({ kind: "report", id: mock.id })}
                  className="flex w-full items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="numeric text-2xl font-semibold">{mock.estimate.score}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{BLUEPRINTS[mock.kind].name}</span>
                    <span className="numeric block text-xs text-muted-foreground">
                      {DATE_FORMAT.format(mock.finishedAt)} · range {mock.estimate.low}–{mock.estimate.high}
                    </span>
                  </span>
                  <Badge variant={mock.route === "higher" ? "success" : "secondary"}>
                    {mock.route === "higher" ? "Harder module 2" : "Easier module 2"}
                  </Badge>
                  <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
