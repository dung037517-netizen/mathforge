"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ListChecks, Maximize2, Minimize2 } from "lucide-react";
import * as React from "react";

import { Latex } from "@/components/math/latex";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DerivationRule, Solution, SolutionStep } from "@/types/math";

/** Badge styling per derivation rule, so the reader can scan the argument. */
const RULE_STYLES: Readonly<
  Record<DerivationRule, { readonly label: string; readonly variant: "default" | "accent" | "secondary" | "success" | "warning" }>
> = {
  "constant-rule": { label: "constant rule", variant: "secondary" },
  "power-rule": { label: "power rule", variant: "default" },
  "sum-rule": { label: "sum rule", variant: "secondary" },
  "difference-rule": { label: "difference rule", variant: "secondary" },
  "product-rule": { label: "product rule", variant: "accent" },
  "quotient-rule": { label: "quotient rule", variant: "accent" },
  "chain-rule": { label: "chain rule", variant: "warning" },
  "exponential-rule": { label: "exponential", variant: "default" },
  "logarithmic-rule": { label: "logarithmic", variant: "default" },
  "trigonometric-rule": { label: "trigonometric", variant: "default" },
  "generalised-power-rule": { label: "general power rule", variant: "warning" },
  simplification: { label: "simplify", variant: "success" },
  substitution: { label: "substitution", variant: "secondary" },
  "numerical-method": { label: "numerical", variant: "accent" },
  definition: { label: "definition", variant: "secondary" },
};

/* ------------------------------------------------------------------ */
/* A single step                                                       */
/* ------------------------------------------------------------------ */

interface StepProps {
  step: SolutionStep;
  index: number;
  depth: number;
  isOpen: boolean;
  onToggle: (id: string) => void;
  openIds: ReadonlySet<string>;
}

function Step({ step, index, depth, isOpen, onToggle, openIds }: StepProps) {
  const rule = RULE_STYLES[step.rule];
  const contentId = `${step.id}-content`;
  const hasSubsteps = step.substeps !== undefined && step.substeps.length > 0;

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.035, 0.28) }}
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-surface",
        depth > 0 && "border-dashed bg-surface-sunken",
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(step.id)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
          "hover:bg-surface-raised focus-visible:outline-2 focus-visible:-outline-offset-2",
          "focus-visible:outline-ring",
        )}
      >
        <span
          className={cn(
            "numeric flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            depth === 0 ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
          )}
          aria-hidden
        >
          {index + 1}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{step.title}</span>
        </span>

        <Badge variant={rule.variant} className="hidden shrink-0 sm:inline-flex">
          {rule.label}
        </Badge>

        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={contentId}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-border px-4 py-3">
              <p className="text-sm leading-relaxed text-muted-foreground">{step.explanation}</p>

              <div className="rounded-md border border-border bg-surface-sunken px-4 py-3">
                <Latex display className="text-[0.95rem]">
                  {step.latex}
                </Latex>
              </div>

              {hasSubsteps && (
                <div className="space-y-2 pl-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Sub-derivations
                  </p>
                  <ol className="space-y-2">
                    {step.substeps?.map((substep, substepIndex) => (
                      <Step
                        key={substep.id}
                        step={substep}
                        index={substepIndex}
                        depth={depth + 1}
                        isOpen={openIds.has(substep.id)}
                        onToggle={onToggle}
                        openIds={openIds}
                      />
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

/* ------------------------------------------------------------------ */
/* The full solution                                                   */
/* ------------------------------------------------------------------ */

export interface SolutionStepsProps {
  solution: Solution | null;
  /** Message shown before anything has been solved. */
  emptyMessage?: string;
  className?: string;
}

/** Recursively collect every step id so "expand all" reaches nested steps. */
function collectStepIds(steps: readonly SolutionStep[]): string[] {
  return steps.flatMap((step) => [
    step.id,
    ...(step.substeps !== undefined ? collectStepIds(step.substeps) : []),
  ]);
}

/** A fresh solution starts with only its first step disclosed. */
function defaultOpenIds(solution: Solution | null): ReadonlySet<string> {
  if (solution === null || solution.steps.length === 0) return new Set<string>();
  return new Set<string>([solution.steps[0].id]);
}

/**
 * Animated, collapsible walk-through of a derivation.
 *
 * The first step opens by default; everything else is collapsed so the reader
 * sees the shape of the argument before its details. Each panel is a real
 * `aria-expanded` disclosure button, so the whole trace is keyboard- and
 * screen-reader-navigable.
 */
export function SolutionSteps({ solution, emptyMessage, className }: SolutionStepsProps) {
  const [openIds, setOpenIds] = React.useState<ReadonlySet<string>>(() =>
    defaultOpenIds(solution),
  );

  // Reset the disclosure state whenever a new solution arrives, opening step 1.
  // Adjusting state during render (rather than in an effect) means the reset is
  // applied in the same pass that receives the new solution — no flash of the
  // previous derivation's open panels, and no cascading second render.
  const [renderedSolution, setRenderedSolution] = React.useState(solution);
  if (renderedSolution !== solution) {
    setRenderedSolution(solution);
    setOpenIds(defaultOpenIds(solution));
  }

  const toggle = React.useCallback((id: string) => {
    setOpenIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allIds = React.useMemo(
    () => (solution === null ? [] : collectStepIds(solution.steps)),
    [solution],
  );
  const allOpen = allIds.length > 0 && allIds.every((id) => openIds.has(id));

  if (solution === null) {
    return (
      <div
        className={cn(
          "flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border",
          "border-dashed border-border bg-surface-sunken p-8 text-center",
          className,
        )}
      >
        <ListChecks className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          {emptyMessage ?? "Solve an expression to see the full derivation here."}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Result</p>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Latex display className="text-lg text-foreground">
            {`${solution.problem} = ${solution.result}`}
          </Latex>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {solution.steps.length} step{solution.steps.length === 1 ? "" : "s"}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpenIds(allOpen ? new Set() : new Set(allIds))}
        >
          {allOpen ? <Minimize2 /> : <Maximize2 />}
          {allOpen ? "Collapse all" : "Expand all"}
        </Button>
      </div>

      <ol className="space-y-2">
        {solution.steps.map((step, index) => (
          <Step
            key={step.id}
            step={step}
            index={index}
            depth={0}
            isOpen={openIds.has(step.id)}
            onToggle={toggle}
            openIds={openIds}
          />
        ))}
      </ol>
    </div>
  );
}
