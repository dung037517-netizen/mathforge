"use client";

import * as React from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { BAND_LABELS } from "@/lib/practice/mastery";
import { progressStore } from "@/lib/practice/store";
import { COURSES } from "@/lib/practice/taxonomy";
import { cn } from "@/lib/utils";
import type { CourseId, Mastery, MasteryBand } from "@/types/practice";

const BAND_VARIANT: Readonly<Record<MasteryBand, NonNullable<BadgeProps["variant"]>>> = {
  unknown: "outline",
  "needs-work": "destructive",
  developing: "warning",
  proficient: "accent",
  strong: "success",
};

const BAND_FILL: Readonly<Record<MasteryBand, string>> = {
  unknown: "bg-muted-foreground/40",
  "needs-work": "bg-destructive",
  developing: "bg-warning",
  proficient: "bg-accent",
  strong: "bg-success",
};

export function BandBadge({ band }: { readonly band: MasteryBand }) {
  return <Badge variant={BAND_VARIANT[band]}>{BAND_LABELS[band]}</Badge>;
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export interface MasteryBarProps {
  readonly label: React.ReactNode;
  readonly mastery: Mastery;
  /** Extra line under the label, such as the number of answers. */
  readonly detail?: React.ReactNode;
  readonly action?: React.ReactNode;
}

/**
 * A mastery estimate drawn with its uncertainty: the solid bar is the
 * estimate, the lighter band is one standard deviation either side.
 */
export function MasteryBar({ label, mastery, detail, action }: MasteryBarProps) {
  const known = mastery.band !== "unknown";
  const low = Math.round(mastery.low * 100);
  const high = Math.round(mastery.high * 100);
  const value = Math.round(mastery.value * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{label}</p>
          {detail !== undefined ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {known ? (
            <span className="numeric text-sm font-semibold" title={`Likely range ${low}%–${high}%`}>
              {value}%
            </span>
          ) : null}
          <BandBadge band={mastery.band} />
          {action}
        </div>
      </div>
      <div
        className="relative h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
        role="img"
        aria-label={
          known
            ? `Estimated mastery ${value} percent, likely between ${low} and ${high} percent`
            : "Not enough answers yet to estimate mastery"
        }
      >
        {known ? (
          <>
            <div
              className={cn("absolute inset-y-0 opacity-30", BAND_FILL[mastery.band])}
              style={{ left: `${low}%`, width: `${Math.max(1, high - low)}%` }}
            />
            <div className={cn("absolute inset-y-0 left-0 rounded-full", BAND_FILL[mastery.band])} style={{ width: `${value}%` }} />
          </>
        ) : null}
      </div>
    </div>
  );
}

export interface CourseSwitchProps {
  readonly value: CourseId;
  readonly onChange?: (course: CourseId) => void;
  readonly className?: string;
}

/** Segmented control for the three courses; the choice is remembered. */
export function CourseSwitch({ value, onChange, className }: CourseSwitchProps) {
  return (
    <div role="radiogroup" aria-label="Course" className={cn("inline-flex rounded-lg border border-border bg-surface-sunken p-1", className)}>
      {COURSES.map((course) => {
        const active = course.id === value;
        return (
          <button
            key={course.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              progressStore.setCourse(course.id);
              onChange?.(course.id);
            }}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              active ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="sm:hidden">{course.shortName}</span>
            <span className="hidden sm:inline">{course.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/** A labeled number, used in summary rows. */
export function Stat({
  label,
  value,
  hint,
}: {
  readonly label: string;
  readonly value: React.ReactNode;
  readonly hint?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="numeric mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {hint !== undefined ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Placeholder shown for the instant before saved progress has been read. */
export function LoadingCard({ lines = 4 }: { readonly lines?: number }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className="h-4 animate-pulse rounded bg-surface-raised"
          style={{ width: `${90 - index * 12}%` }}
        />
      ))}
    </div>
  );
}
