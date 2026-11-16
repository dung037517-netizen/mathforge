"use client";

import { useMemo, useSyncExternalStore } from "react";

import { computeMastery, computeTimeline } from "@/lib/practice/mastery";
import { progressStore, type ProgressSnapshot } from "@/lib/practice/store";
import type { CourseId, MasteryReport, TimelinePoint } from "@/types/practice";

/** The student's saved progress, re-rendering whenever it changes. */
export function useProgress(): ProgressSnapshot {
  return useSyncExternalStore(
    progressStore.subscribe,
    progressStore.getSnapshot,
    progressStore.getServerSnapshot,
  );
}

/**
 * The mastery report for a course. Recomputed only when the answer history
 * changes; the clock is read once per change, which is precise enough for a
 * 30-day half-life.
 */
export function useMastery(course: CourseId): MasteryReport {
  const { state } = useProgress();
  const attempts = state.attempts;
  return useMemo(() => {
    const latest = attempts.length > 0 ? attempts[attempts.length - 1].at : 0;
    return computeMastery(attempts, course, Math.max(latest, clock()));
  }, [attempts, course]);
}

export function useTimeline(course: CourseId): TimelinePoint[] {
  const { state } = useProgress();
  const attempts = state.attempts;
  return useMemo(() => computeTimeline(attempts, course), [attempts, course]);
}

/** Wall-clock time, isolated so the hooks above stay easy to reason about. */
function clock(): number {
  return Date.now();
}
