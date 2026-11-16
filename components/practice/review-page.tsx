"use client";

import { ArrowRight, BookOpenCheck, CalendarClock, ChevronDown, CircleCheck, RotateCcw } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { QuestionView } from "@/components/practice/question-view";
import { Solution } from "@/components/practice/solution";
import { Stat } from "@/components/practice/widgets";
import { PageHeading, PageShell } from "@/components/site/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { isAnswered } from "@/lib/practice/question";
import { regenerate } from "@/lib/practice/registry";
import { cardKey, describeDue, dueCards, FINAL_BOX, freshVariant, REVIEW_INTERVALS_DAYS } from "@/lib/practice/review";
import { randomSeed } from "@/lib/practice/rng";
import { progressStore } from "@/lib/practice/store";
import { findSkill } from "@/lib/practice/taxonomy";
import { useProgress } from "@/lib/practice/use-progress";
import { cn } from "@/lib/utils";
import type { Question, Response, ReviewCard } from "@/types/practice";

interface Session {
  readonly queue: readonly { readonly card: ReviewCard; readonly question: Question }[];
  readonly index: number;
  readonly correct: number;
  readonly resolved: number;
}

function BoxDots({ box }: { readonly box: number }) {
  return (
    <span className="flex items-center gap-1" role="img" aria-label={`Stage ${box + 1} of ${FINAL_BOX + 1}`}>
      {REVIEW_INTERVALS_DAYS.map((_, index) => (
        <span key={index} className={cn("size-1.5 rounded-full", index <= box ? "bg-primary" : "bg-border")} />
      ))}
    </span>
  );
}

function NotebookEntry({ card, now }: { readonly card: ReviewCard; readonly now: number }) {
  const [open, setOpen] = React.useState(false);
  const question = React.useMemo(() => (open ? regenerate(card) : null), [open, card]);
  const skill = findSkill(card.skillId);
  const panelId = React.useId();
  return (
    <li className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{skill?.name ?? card.skillId}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <BoxDots box={card.box} />
            <span>{describeDue(card.dueAt, now)}</span>
            {card.lapses > 0 ? <span>missed {card.lapses + 1} times</span> : null}
          </p>
        </div>
        {card.dueAt <= now ? <Badge variant="warning">Due</Badge> : null}
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div id={panelId} className="space-y-5 border-t border-border px-4 py-5">
          {question === null ? (
            <p className="text-sm text-muted-foreground">This question type is no longer in the bank.</p>
          ) : (
            <>
              <QuestionView
                question={question}
                response={
                  question.answer.kind === "choice" ? { kind: "choice", index: question.answer.correctIndex } : null
                }
                onChange={() => undefined}
                revealed
              />
              <Solution question={question} response={null} compact />
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function ReviewPage() {
  const { state, hydrated, now } = useProgress();
  const [session, setSession] = React.useState<Session | null>(null);
  const [response, setResponse] = React.useState<Response | null>(null);
  const [verdict, setVerdict] = React.useState<{ correct: boolean; resolved: boolean; note: string } | null>(null);
  const shownAt = React.useRef(0);

  const due = React.useMemo(() => dueCards(state.cards, now), [state.cards, now]);
  const ordered = React.useMemo(() => [...state.cards].sort((a, b) => a.dueAt - b.dueAt), [state.cards]);

  React.useEffect(() => {
    shownAt.current = performance.now();
  }, [session?.index]);

  const start = (): void => {
    const salt = randomSeed();
    const queue = due
      .slice(0, 12)
      .map((card) => ({ card, question: regenerate(freshVariant(card, salt)) }))
      .filter((entry): entry is { card: ReviewCard; question: Question } => entry.question !== null);
    if (queue.length === 0) return;
    setSession({ queue, index: 0, correct: 0, resolved: 0 });
    setResponse(null);
    setVerdict(null);
  };

  const current = session === null ? null : (session.queue[session.index] ?? null);

  const check = (): void => {
    if (session === null || current === null || verdict !== null || !isAnswered(response)) return;
    const outcome = progressStore.record({
      question: current.question,
      response,
      ms: performance.now() - shownAt.current,
      source: "review",
      cardKey: cardKey(current.card),
    });
    const nextBox = Math.min(FINAL_BOX, current.card.box + 1);
    const note = outcome.resolved
      ? "Resolved. This card has left your notebook."
      : outcome.correct
        ? `Moved up a stage. It comes back in ${REVIEW_INTERVALS_DAYS[nextBox]} ${REVIEW_INTERVALS_DAYS[nextBox] === 1 ? "day" : "days"}.`
        : "Back to the first stage. It will come up again soon.";
    setVerdict({ correct: outcome.correct, resolved: outcome.resolved, note });
    setSession({
      ...session,
      correct: session.correct + (outcome.correct ? 1 : 0),
      resolved: session.resolved + (outcome.resolved ? 1 : 0),
    });
  };

  const advance = (): void => {
    if (session === null) return;
    setSession({ ...session, index: session.index + 1 });
    setResponse(null);
    setVerdict(null);
  };

  if (session !== null && current !== null) {
    return (
      <PageShell width="narrow">
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Review session</span>
            <span className="numeric text-muted-foreground">
              {session.index + 1} / {session.queue.length}
            </span>
          </div>
          <Progress value={(session.index / session.queue.length) * 100} aria-label="Review progress" />
        </div>
        <Card>
          <CardContent className="space-y-6 p-5 sm:p-7">
            <p className="rounded-lg border border-border bg-surface-sunken px-4 py-2.5 text-sm text-muted-foreground">
              Same idea as a question you missed, with new numbers.
            </p>
            <QuestionView
              key={current.question.id}
              question={current.question}
              response={response}
              onChange={setResponse}
              revealed={verdict !== null}
              onSubmit={check}
            />
            {verdict !== null ? (
              <>
                <Solution question={current.question} response={response} />
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="size-4" aria-hidden />
                  {verdict.note}
                </p>
              </>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-5">
              {verdict === null ? (
                <Button onClick={check} disabled={!isAnswered(response)}>
                  Check answer
                </Button>
              ) : (
                <Button onClick={advance} autoFocus>
                  {session.index + 1 >= session.queue.length ? "Finish" : "Next card"}
                  <ArrowRight aria-hidden />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (session !== null) {
    return (
      <PageShell width="narrow">
        <PageHeading title="Review complete" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Cards reviewed" value={session.queue.length} />
          <Stat label="Answered correctly" value={session.correct} />
          <Stat label="Resolved" value={session.resolved} hint="Left the notebook for good" />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={() => setSession(null)}>
            <RotateCcw aria-hidden />
            Back to the notebook
          </Button>
          <Button asChild variant="outline">
            <Link href="/practice">Keep practicing</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell width="narrow">
      <PageHeading
        title="Review"
        description="Every question you miss is filed here and comes back on a widening schedule — the same day, then after 1, 3, 7 and 14 days — until you answer it correctly five times in a row."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Due now" value={hydrated ? due.length : "—"} />
        <Stat label="In the notebook" value={hydrated ? state.cards.length : "—"} />
        <Stat label="Resolved so far" value={hydrated ? state.resolved : "—"} />
      </div>

      <div className="mt-6">
        {due.length > 0 ? (
          <Button size="lg" onClick={start}>
            <BookOpenCheck aria-hidden />
            Review {Math.min(12, due.length)} due {Math.min(12, due.length) === 1 ? "card" : "cards"}
          </Button>
        ) : hydrated && state.cards.length > 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleCheck className="size-4 text-success" aria-hidden />
            Nothing is due right now. The next card is {describeDue(Math.min(...state.cards.map((card) => card.dueAt)), now)}.
          </p>
        ) : null}
      </div>

      <section className="mt-10" aria-labelledby="notebook-heading">
        <h2 id="notebook-heading" className="mb-4 text-lg font-semibold tracking-tight">
          Mistake notebook
        </h2>
        {hydrated && ordered.length === 0 ? (
          <Card>
            <CardContent className="space-y-3 p-6 text-sm text-muted-foreground">
              <p>Your notebook is empty. Questions you miss in practice, diagnostics and mock tests will appear here.</p>
              <Button asChild>
                <Link href="/practice">Start practicing</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {ordered.map((card) => (
              <NotebookEntry key={cardKey(card)} card={card} now={now} />
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
