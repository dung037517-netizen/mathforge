"use client";

import { Download, FlaskConical, RotateCcw, Upload } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartTooltip } from "@/components/math/chart-tooltip";
import { Modal } from "@/components/practice/modal";
import { CourseSwitch, LoadingCard, MasteryBar, percent, Stat } from "@/components/practice/widgets";
import { PageHeading, PageShell } from "@/components/site/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { domainName, HALF_LIFE_DAYS, rankSkills } from "@/lib/practice/mastery";
import { BLUEPRINTS } from "@/lib/practice/mock";
import { dueCards } from "@/lib/practice/review";
import { buildSampleProgress } from "@/lib/practice/sample";
import { exportProgress, importProgress } from "@/lib/practice/storage";
import { progressStore } from "@/lib/practice/store";
import { getCourse, skillsInDomain } from "@/lib/practice/taxonomy";
import { useMastery, useProgress, useTimeline } from "@/lib/practice/use-progress";
import type { CourseId, DomainId } from "@/types/practice";

const DOMAIN_COLORS = ["var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-1)"];
const SHORT_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function TimelineChart({ course }: { readonly course: CourseId }) {
  const timeline = useTimeline(course);
  const domains = getCourse(course).domains;
  const [showDomains, setShowDomains] = React.useState(false);

  const data = React.useMemo(
    () =>
      timeline.map((point) => {
        const row: Record<string, number | string> = {
          label: SHORT_DATE.format(point.at),
          overall: Math.round(point.course * 1000) / 10,
        };
        for (const domain of domains) row[domain] = Math.round((point.domains[domain] ?? 0) * 1000) / 10;
        return row;
      }),
    [timeline, domains],
  );

  if (timeline.length < 2) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        The chart appears once you have practiced on two different days.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="var(--border)" minTickGap={24} />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              stroke="var(--border)"
              width={40}
              tickFormatter={(value: number) => `${value}%`}
            />
            <Tooltip content={<ChartTooltip decimals={1} labelFormatter={(value) => String(value ?? "")} />} />
            {showDomains
              ? domains.map((domain, index) => (
                  <Line
                    key={domain}
                    type="monotone"
                    dataKey={domain}
                    name={domainName(domain)}
                    stroke={DOMAIN_COLORS[index % DOMAIN_COLORS.length]}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))
              : null}
            <Line type="monotone" dataKey="overall" name="Overall" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Estimated mastery at the end of each day you practiced. Answers lose half their weight every {HALF_LIFE_DAYS}{" "}
          days.
        </p>
        <Button size="sm" variant="outline" onClick={() => setShowDomains((current) => !current)} aria-pressed={showDomains}>
          {showDomains ? "Hide domains" : "Show domains"}
        </Button>
      </div>
    </div>
  );
}

function DataControls({ course }: { readonly course: CourseId }) {
  const { state, demo, now, persisted } = useProgress();
  const [message, setMessage] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const fileInput = React.useRef<HTMLInputElement>(null);

  const download = (): void => {
    const blob = new Blob([exportProgress(state, Date.now())], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mathforge-progress.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Backup downloaded.");
  };

  const upload = async (file: File): Promise<void> => {
    const result = importProgress(await file.text(), Date.now());
    if (result.ok) {
      progressStore.replace(result.state);
      setMessage(`Backup restored: ${result.state.attempts.length} answers.`);
    } else {
      setMessage(result.error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your data</CardTitle>
        <CardDescription>
          Progress is stored only in this browser. There is no account and nothing is sent to a server, so clearing
          your browser data clears your progress. Download a backup to keep it or move it to another device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={download} disabled={demo}>
            <Download aria-hidden />
            Download backup
          </Button>
          <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={demo}>
            <Upload aria-hidden />
            Restore backup
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose a backup file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file !== undefined) void upload(file);
              event.target.value = "";
            }}
          />
          {demo ? (
            <Button variant="outline" onClick={() => progressStore.exitDemo()}>
              Exit sample data
            </Button>
          ) : (
            <Button variant="outline" onClick={() => progressStore.enterDemo(buildSampleProgress(now > 0 ? now : Date.now(), course))}>
              <FlaskConical aria-hidden />
              View sample data
            </Button>
          )}
          <Button variant="ghost" onClick={() => setConfirming(true)} disabled={demo}>
            <RotateCcw aria-hidden />
            Reset progress
          </Button>
        </div>
        {message !== null ? (
          <p role="status" className="text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}
        {!persisted ? (
          <p role="alert" className="text-sm text-destructive">
            This browser is not allowing data to be saved (private browsing or full storage). Your progress will be
            lost when you close the tab.
          </p>
        ) : null}
      </CardContent>
      <Modal open={confirming} onClose={() => setConfirming(false)} title="Reset all progress?">
        <div className="space-y-4 text-sm">
          <p>
            This permanently deletes {state.attempts.length} answers, {state.cards.length} notebook cards and{" "}
            {state.mocks.length} mock test reports from this browser. It cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                progressStore.reset();
                setConfirming(false);
                setMessage("Progress reset.");
              }}
            >
              Delete everything
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

export function ProgressPage() {
  const { state, hydrated, now, demo } = useProgress();
  const course = state.course;
  const report = useMastery(course);
  const ranked = React.useMemo(() => rankSkills(report, course), [report, course]);
  const due = React.useMemo(() => dueCards(state.cards, now).length, [state.cards, now]);
  const lastMock = state.mocks.at(-1);
  const hasData = report.course.attempts > 0;

  return (
    <PageShell>
      <PageHeading
        title="Progress"
        description="Estimated mastery for every skill, with the uncertainty shown. A wide band means there is not much evidence yet."
      >
        <CourseSwitch value={course} />
      </PageHeading>

      {!hydrated ? (
        <LoadingCard lines={6} />
      ) : (
        <div className="space-y-6">
          {!hasData && !demo ? (
            <Card className="border-primary/40">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
                <div className="max-w-xl">
                  <p className="font-medium">No answers yet for {getCourse(course).name}.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Take the diagnostic to get a first estimate for every skill, or look at a simulated student to see
                    what this page shows after a few weeks.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href="/diagnostic">Take the diagnostic</Link>
                  </Button>
                  <Button variant="outline" onClick={() => progressStore.enterDemo(buildSampleProgress(now > 0 ? now : Date.now(), course))}>
                    <FlaskConical aria-hidden />
                    View sample data
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Overall mastery"
              value={hasData ? percent(report.course.value) : "—"}
              hint={hasData ? `Likely ${percent(report.course.low)}–${percent(report.course.high)}` : "No answers yet"}
            />
            <Stat
              label="Questions answered"
              value={report.course.attempts}
              hint={hasData ? `${percent(report.course.correct / report.course.attempts)} correct` : undefined}
            />
            <Stat label="Due for review" value={due} hint={`${state.cards.length} in the notebook`} />
            <Stat
              label="Latest mock score"
              value={lastMock === undefined ? "—" : lastMock.estimate.score}
              hint={lastMock === undefined ? "No tests taken" : `${BLUEPRINTS[lastMock.kind].name}, range ${lastMock.estimate.low}–${lastMock.estimate.high}`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Mastery over time</CardTitle>
            </CardHeader>
            <CardContent>
              <TimelineChart course={course} />
            </CardContent>
          </Card>

          {ranked.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Weakest skills</CardTitle>
                <CardDescription>Where practice is likely to help most right now.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {ranked.slice(0, 4).map(({ skill, mastery }) => (
                  <MasteryBar
                    key={skill.id}
                    label={skill.name}
                    mastery={mastery}
                    detail={`${mastery.correct} of ${mastery.attempts} correct`}
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

          <div className="grid gap-6 lg:grid-cols-2">
            {getCourse(course).domains.map((domain: DomainId) => {
              const mastery = report.domains[domain];
              if (mastery === undefined) return null;
              return (
                <Card key={domain}>
                  <CardHeader>
                    <MasteryBar
                      label={<span className="text-base font-semibold">{domainName(domain)}</span>}
                      mastery={mastery}
                      detail={`${mastery.attempts} answered`}
                    />
                  </CardHeader>
                  <CardContent className="space-y-4 border-t border-border pt-4">
                    {skillsInDomain(domain).map((skill) => {
                      const skillMastery = report.skills[skill.id];
                      return skillMastery === undefined ? null : (
                        <MasteryBar
                          key={skill.id}
                          label={
                            <Link href={`/practice?skill=${skill.id}`} className="underline-offset-4 hover:underline">
                              {skill.name}
                            </Link>
                          }
                          mastery={skillMastery}
                          detail={skillMastery.attempts === 0 ? "Not practiced yet" : `${skillMastery.correct} of ${skillMastery.attempts} correct`}
                        />
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <DataControls course={course} />

          <p className="text-sm text-muted-foreground">
            Mastery is the estimated probability of answering a standard-level question on the skill correctly without
            guessing.{" "}
            <Link href="/method" className="text-primary underline-offset-4 hover:underline">
              How the estimates are computed
            </Link>
            .
          </p>
        </div>
      )}
    </PageShell>
  );
}
