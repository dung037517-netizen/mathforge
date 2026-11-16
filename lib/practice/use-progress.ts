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
 * The mastery report for a course, recomputed only when the answer history
 * changes. The clock comes from the store (the time of the last change), so
 * rendering stays a pure function of the snapshot.
 */
export function useMastery(course: CourseId): MasteryReport {
  const { state, now } = useProgress();
  const attempts = state.attempts;
  return useMemo(() => computeMastery(attempts, course, now), [attempts, course, now]);
}

export function useTimeline(course: CourseId): TimelinePoint[] {
  const { state } = useProgress();
  const attempts = state.attempts;
  return useMemo(() => computeTimeline(attempts, course), [attempts, course]);
}
