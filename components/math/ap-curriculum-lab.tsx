"use client";

import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Lightbulb } from "lucide-react";
import * as React from "react";

import { Latex } from "@/components/math/latex";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AP_COURSES, AP_PROBLEMS, type ApCourse, type ApProblem } from "@/lib/ap-curriculum";
import { cn } from "@/lib/utils";

export interface ApCurriculumLabProps {
  /** Called when a reviewer picks a problem, to drive the solver above. */
  onSelect: (problem: ApProblem) => void;
  /** Currently loaded problem id, for the selected state. */
  activeId?: string;
  className?: string;
}

/**
 * The AP curriculum map.
 *
 * Every card is a solvable prompt rather than a static example: selecting one
 * loads it into the solver and produces a real step-by-step derivation. The
 * "where this leads" note on each card is what turns a homework helper into an
 * argument about why the mathematics matters.
 */
export function ApCurriculumLab({ onSelect, activeId, className }: ApCurriculumLabProps) {
  const [course, setCourse] = React.useState<ApCourse | "All">("All");

  const visible = React.useMemo(
    () =>
      course === "All"
        ? AP_PROBLEMS
        : AP_PROBLEMS.filter((problem) => problem.course === course),
    [course],
  );

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b border-border">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="size-4 text-primary" aria-hidden />
              AP Calculus &amp; Statistics visualiser
            </CardTitle>
            <CardDescription>
              Exam-style prompts the engine solves in full. Pick one and the derivation appears
              above, rule by rule.
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0">
            {AP_PROBLEMS.length} worked problems
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filter problems by course"
        >
          {(["All", ...AP_COURSES] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCourse(option)}
              aria-pressed={course === option}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                course === option
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {option}
            </button>
          ))}
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((problem, index) => {
            const isActive = problem.id === activeId;
            return (
              <motion.li
                key={problem.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
              >
                <button
                  type="button"
                  onClick={() => onSelect(problem)}
                  aria-pressed={isActive}
                  className={cn(
                    "flex h-full w-full flex-col gap-2.5 rounded-lg border p-4 text-left transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    isActive
                      ? "border-primary bg-primary/10"
                      : "border-border bg-surface hover:border-primary/50 hover:bg-surface-raised",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={isActive ? "default" : "secondary"}>{problem.course}</Badge>
                    <span className="text-[0.7rem] text-muted-foreground">{problem.unit}</span>
                  </div>

                  <span className="text-sm font-medium">{problem.title}</span>

                  <span className="block overflow-x-auto rounded-md bg-surface-sunken px-3 py-2 scrollbar-thin">
                    <Latex className="text-sm">{problem.latex}</Latex>
                  </span>

                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {problem.prompt}
                  </span>

                  <span className="mt-auto flex items-start gap-1.5 border-t border-border pt-2.5">
                    <Lightbulb
                      className="mt-0.5 size-3 shrink-0 text-warning"
                      aria-hidden
                    />
                    <span className="text-[0.7rem] leading-relaxed text-muted-foreground">
                      {problem.actuarialLink}
                    </span>
                  </span>
                </button>
              </motion.li>
            );
          })}
        </ul>

        <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-sunken p-4">
          <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Each card names the professional technique its topic becomes. That is the thread this
            project is built around: the chain rule you learn for the AP exam is the same chain rule
            that produces an option&apos;s delta, and the improper integral in BC is literally the
            present value of a life annuity.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
