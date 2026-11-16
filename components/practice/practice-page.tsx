"use client";

import { ArrowRight, Flame, Lightbulb, SkipForward, Target } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";

import { QuestionView } from "@/components/practice/question-view";
import { RichText } from "@/components/practice/rich-text";
import { Solution } from "@/components/practice/solution";
import { CourseSwitch, LoadingCard, MasteryBar, percent } from "@/components/practice/widgets";
import { PageHeading, PageShell } from "@/components/site/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeMastery } from "@/lib/practice/mastery";
import { isAnswered } from "@/lib/practice/question";
import { mixSeed, randomSeed } from "@/lib/practice/rng";
import { nextPracticeQuestion, type PracticeFocus } from "@/lib/practice/selection";
import { progressStore } from "@/lib/practice/store";
import { courseOfSkill, DOMAINS, findSkill, getCourse, skillsInDomain } from "@/lib/practice/taxonomy";
import { useMastery, useProgress } from "@/lib/practice/use-progress";
import type { CourseId, DomainId, Question, Response } from "@/types/practice";

function focusKey(focus: PracticeFocus): string {
  return focus.kind === "smart" ? "smart" : focus.kind === "domain" ? `domain:${focus.domain}` : `skill:${focus.skill}`;
}

function parseFocus(value: string): PracticeFocus {
  if (value.startsWith("domain:")) {
    const domain = DOMAINS.find((entry) => entry.id === value.slice(7));
    if (domain !== undefined) return { kind: "domain", domain: domain.id };
  }
  if (value.startsWith("skill:")) {
    const skill = findSkill(value.slice(6));
    if (skill !== null) return { kind: "skill", skill: skill.id };
  }
  return { kind: "smart" };
}

function courseOfFocus(focus: PracticeFocus): CourseId | null {
  if (focus.kind === "skill") return courseOfSkill(focus.skill);
  if (focus.kind === "domain") return DOMAINS.find((domain) => domain.id === focus.domain)?.course ?? null;
  return null;
}

interface Tally {
  readonly answered: number;
  readonly correct: number;
  readonly streak: number;
}

export function PracticePage() {
  const params = useSearchParams();
  const { state, hydrated, sessionSeed } = useProgress();

  // The focus comes from the link that brought the student here until they change it.
  const [chosenFocus, setChosenFocus] = React.useState<PracticeFocus | null>(null);
  const linkedFocus = React.useMemo(
    () => parseFocus(params.get("skill") !== null ? `skill:${params.get("skill")}` : params.get("domain") !== null ? `domain:${params.get("domain")}` : "smart"),
    [params],
  );
  const requested = chosenFocus ?? linkedFocus;
  const course: CourseId = (chosenFocus === null ? courseOfFocus(linkedFocus) : null) ?? state.course;
  // A focus that belongs to another course falls back to the smart mix.
  const focus: PracticeFocus = courseOfFocus(requested) === null || courseOfFocus(requested) === course ? requested : { kind: "smart" };
  const signature = `${course}|${focusKey(focus)}`;

  const report = useMastery(course);

  const [question, setQuestion] = React.useState<Question | null>(null);
  const [questionFor, setQuestionFor] = React.useState("");
  const [response, setResponse] = React.useState<Response | null>(null);
  const [revealed, setRevealed] = React.useState(false);
  const [showHint, setShowHint] = React.useState(false);
  const [tally, setTally] = React.useState<Tally>({ answered: 0, correct: 0, streak: 0 });
  const [recent, setRecent] = React.useState<{ templates: string[]; skills: string[] }>({ templates: [], skills: [] });
  const shownAt = React.useRef(0);
  const nextButton = React.useRef<HTMLButtonElement>(null);

  // First question of a visit, and a new one whenever the course or focus changes.
  if (hydrated && questionFor !== signature) {
    setQuestionFor(signature);
    setQuestion(
      nextPracticeQuestion({ course, focus, report, seed: mixSeed(signature, sessionSeed) % 0x7fffffff }),
    );
    setResponse(null);
    setRevealed(false);
    setShowHint(false);
  }

  React.useEffect(() => {
    shownAt.current = performance.now();
  }, [question]);

  React.useEffect(() => {
    if (revealed) nextButton.current?.focus();
  }, [revealed]);

  const check = (): void => {
    if (question === null || revealed || !isAnswered(response)) return;
    const outcome = progressStore.record({
      question,
      response,
      ms: performance.now() - shownAt.current,
      source: "practice",
    });
    setRevealed(true);
    setTally((current) => ({
      answered: current.answered + 1,
      correct: current.correct + (outcome.correct ? 1 : 0),
      streak: outcome.correct ? current.streak + 1 : 0,
    }));
  };

  const advance = (): void => {
    const templates = question === null ? recent.templates : [...recent.templates, question.templateId].slice(-6);
    const skills = question === null ? recent.skills : [...recent.skills, question.skillId].slice(-2);
    setRecent({ templates, skills });
    // Read the history as it stands now, including the answer just recorded.
    const latest = computeMastery(progressStore.getSnapshot().state.attempts, course, Date.now());
    setQuestion(
      nextPracticeQuestion({
        course,
        focus,
        report: latest,
        seed: randomSeed(),
        recentTemplates: templates,
        recentSkills: skills,
      }),
    );
    setResponse(null);
    setRevealed(false);
    setShowHint(false);
  };

  const skill = question === null ? null : findSkill(question.skillId);
  const skillMastery = question === null ? undefined : report.skills[question.skillId];

  return (
    <PageShell>
      <PageHeading
        title="Practice"
        description="Questions are chosen for you: mostly from the skills where your estimated mastery is lowest, at a difficulty you should get right about two times in three."
      >
        <CourseSwitch value={course} onChange={() => setChosenFocus({ kind: "smart" })} />
      </PageHeading>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {question === null ? (
            <LoadingCard lines={6} />
          ) : (
            <Card>
              <CardContent className="space-y-6 p-5 sm:p-7">
                <QuestionView
                  key={question.id}
                  question={question}
                  response={response}
                  onChange={setResponse}
                  revealed={revealed}
                  onSubmit={check}
                />

                {showHint && question.hint !== undefined && !revealed ? (
                  <div className="rounded-lg border border-border bg-surface-sunken px-4 py-3 text-sm">
                    <p className="mb-1 flex items-center gap-2 font-medium">
                      <Lightbulb className="size-4 text-warning" aria-hidden />
                      Hint
                    </p>
                    <RichText text={question.hint} className="text-muted-foreground" />
                  </div>
                ) : null}

                {revealed ? <Solution question={question} response={response} /> : null}

                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-5">
                  {revealed ? (
                    <Button ref={nextButton} onClick={advance}>
                      Next question
                      <ArrowRight aria-hidden />
                    </Button>
                  ) : (
                    <>
                      <Button onClick={check} disabled={!isAnswered(response)}>
                        Check answer
                      </Button>
                      {question.hint !== undefined ? (
                        <Button variant="outline" onClick={() => setShowHint((current) => !current)} aria-expanded={showHint}>
                          <Lightbulb aria-hidden />
                          {showHint ? "Hide hint" : "Hint"}
                        </Button>
                      ) : null}
                      <Button variant="ghost" onClick={advance}>
                        <SkipForward aria-hidden />
                        Skip
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="size-4 text-primary" aria-hidden />
                Focus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label htmlFor="focus" className="sr-only">
                What to practice
              </label>
              <select
                id="focus"
                value={focusKey(focus)}
                onChange={(event) => setChosenFocus(parseFocus(event.target.value))}
                className="h-10 w-full rounded-md border border-input bg-surface-sunken px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <option value="smart">Smart mix (recommended)</option>
                {getCourse(course).domains.map((domainId: DomainId) => {
                  const domain = DOMAINS.find((entry) => entry.id === domainId);
                  return (
                    <optgroup key={domainId} label={domain?.name ?? domainId}>
                      <option value={`domain:${domainId}`}>All of {domain?.name ?? domainId}</option>
                      {skillsInDomain(domainId).map((entry) => (
                        <option key={entry.id} value={`skill:${entry.id}`}>
                          {entry.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              {skill !== null && skillMastery !== undefined ? (
                <div className="space-y-2 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">This question practices</p>
                  <MasteryBar
                    label={skill.name}
                    mastery={skillMastery}
                    detail={skillMastery.attempts === 0 ? "First question on this skill" : `${skillMastery.correct} of ${skillMastery.attempts} correct so far`}
                  />
                  <p className="text-xs leading-relaxed text-muted-foreground">{skill.description}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="size-4 text-warning" aria-hidden />
                This session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <dt className="text-xs text-muted-foreground">Answered</dt>
                  <dd className="numeric text-xl font-semibold">{tally.answered}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Accuracy</dt>
                  <dd className="numeric text-xl font-semibold">
                    {tally.answered === 0 ? "—" : percent(tally.correct / tally.answered)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Streak</dt>
                  <dd className="numeric text-xl font-semibold">{tally.streak}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Missed questions go to your{" "}
                <Link href="/review" className="text-primary underline-offset-4 hover:underline">
                  review notebook
                </Link>{" "}
                and come back with new numbers until you get them right.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </PageShell>
  );
}
