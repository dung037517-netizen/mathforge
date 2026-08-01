"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, CornerDownLeft, Eraser, Sigma } from "lucide-react";
import * as React from "react";

import { Latex } from "@/components/math/latex";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { collectVariables, parse, toLatex } from "@/lib/math-engine";
import { cn } from "@/lib/utils";
import type { EngineError, ExpressionNode } from "@/types/math";

/* ------------------------------------------------------------------ */
/* Formula palette                                                     */
/* ------------------------------------------------------------------ */

interface PaletteEntry {
  /** Text inserted at the caret. */
  readonly insert: string;
  /** Caret offset from the end of the inserted text (negative moves left). */
  readonly caretOffset: number;
  /** LaTeX shown on the key. */
  readonly latex: string;
  /** Accessible name for screen readers. */
  readonly label: string;
}

interface PaletteGroup {
  readonly id: string;
  readonly name: string;
  readonly entries: readonly PaletteEntry[];
}

const PALETTE: readonly PaletteGroup[] = [
  {
    id: "operators",
    name: "Operators",
    entries: [
      { insert: "+", caretOffset: 0, latex: "+", label: "plus" },
      { insert: "-", caretOffset: 0, latex: "-", label: "minus" },
      { insert: "*", caretOffset: 0, latex: "\\times", label: "times" },
      { insert: "/", caretOffset: 0, latex: "\\div", label: "divide" },
      { insert: "^", caretOffset: 0, latex: "x^{n}", label: "power" },
      { insert: "()", caretOffset: -1, latex: "(\\;)", label: "brackets" },
    ],
  },
  {
    id: "elementary",
    name: "Elementary",
    entries: [
      { insert: "sqrt()", caretOffset: -1, latex: "\\sqrt{x}", label: "square root" },
      { insert: "abs()", caretOffset: -1, latex: "|x|", label: "absolute value" },
      { insert: "exp()", caretOffset: -1, latex: "e^{x}", label: "exponential" },
      { insert: "ln()", caretOffset: -1, latex: "\\ln x", label: "natural log" },
      { insert: "log10()", caretOffset: -1, latex: "\\log_{10}", label: "log base ten" },
      { insert: "log(2, )", caretOffset: -1, latex: "\\log_{b}", label: "log base b" },
    ],
  },
  {
    id: "trig",
    name: "Trigonometry",
    entries: [
      { insert: "sin()", caretOffset: -1, latex: "\\sin", label: "sine" },
      { insert: "cos()", caretOffset: -1, latex: "\\cos", label: "cosine" },
      { insert: "tan()", caretOffset: -1, latex: "\\tan", label: "tangent" },
      { insert: "asin()", caretOffset: -1, latex: "\\arcsin", label: "arcsine" },
      { insert: "sinh()", caretOffset: -1, latex: "\\sinh", label: "hyperbolic sine" },
      { insert: "tanh()", caretOffset: -1, latex: "\\tanh", label: "hyperbolic tangent" },
    ],
  },
  {
    id: "actuarial",
    name: "Probability & actuarial",
    entries: [
      { insert: "normpdf()", caretOffset: -1, latex: "\\varphi(x)", label: "normal density" },
      { insert: "normcdf()", caretOffset: -1, latex: "\\Phi(x)", label: "normal CDF" },
      { insert: "erf()", caretOffset: -1, latex: "\\operatorname{erf}", label: "error function" },
      { insert: "gamma()", caretOffset: -1, latex: "\\Gamma(x)", label: "gamma function" },
      { insert: "exp(-0.02*x)", caretOffset: 0, latex: "e^{-\\mu x}", label: "constant-force survival" },
      { insert: "1/(1+i)^n", caretOffset: 0, latex: "v^{n}", label: "discount factor" },
    ],
  },
  {
    id: "constants",
    name: "Constants",
    entries: [
      { insert: "pi", caretOffset: 0, latex: "\\pi", label: "pi" },
      { insert: "e", caretOffset: 0, latex: "e", label: "Euler's number" },
      { insert: "phi", caretOffset: 0, latex: "\\varphi", label: "golden ratio" },
      { insert: "x", caretOffset: 0, latex: "x", label: "variable x" },
      { insert: "t", caretOffset: 0, latex: "t", label: "variable t" },
      { insert: "delta", caretOffset: 0, latex: "\\delta", label: "force of interest" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export interface EquationInputProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Fired on Enter or when the Solve button is pressed, with a valid AST. */
  onSubmit?: (ast: ExpressionNode, source: string) => void;
  label?: string;
  description?: string;
  placeholder?: string;
  /** Text on the primary action button. */
  submitLabel?: string;
  className?: string;
  /** Hide the palette for compact embeddings. */
  showPalette?: boolean;
}

/**
 * Expression editor with a formula palette, live validation and a KaTeX
 * preview that updates as you type.
 *
 * Parsing runs against a deferred copy of the input (`useDeferredValue`), so
 * React can interrupt and discard stale typesetting work while the user is
 * still typing — keystrokes never queue behind a parse.
 */
export function EquationInput({
  value,
  onValueChange,
  onSubmit,
  label = "Expression",
  description,
  placeholder = "e.g. x^3 * sin(x)",
  submitLabel = "Solve",
  className,
  showPalette = true,
}: EquationInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [activeGroup, setActiveGroup] = React.useState<string>(PALETTE[0].id);
  const deferredValue = React.useDeferredValue(value);

  const parsed = React.useMemo(() => parse(deferredValue), [deferredValue]);
  const isPending = deferredValue !== value;

  const preview: string | null = parsed.ok ? toLatex(parsed.value) : null;
  const error: EngineError | null = parsed.ok ? null : parsed.error;
  const variables = parsed.ok ? collectVariables(parsed.value) : [];

  const insert = React.useCallback(
    (entry: PaletteEntry) => {
      const input = inputRef.current;
      const start = input?.selectionStart ?? value.length;
      const end = input?.selectionEnd ?? value.length;
      const next = value.slice(0, start) + entry.insert + value.slice(end);
      onValueChange(next);

      // Restore the caret after React commits the controlled value.
      requestAnimationFrame(() => {
        if (!input) return;
        const caret = start + entry.insert.length + entry.caretOffset;
        input.focus();
        input.setSelectionRange(caret, caret);
      });
    },
    [onValueChange, value],
  );

  const submit = React.useCallback(() => {
    const result = parse(value);
    if (result.ok) onSubmit?.(result.value, value);
  }, [onSubmit, value]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  };

  const group = PALETTE.find((candidate) => candidate.id === activeGroup) ?? PALETTE[0];
  const statusId = "equation-input-status";

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor="equation-input">{label}</Label>
        {variables.length > 0 && (
          <span className="text-xs text-muted-foreground">
            variables:{" "}
            <span className="numeric text-foreground">{variables.join(", ")}</span>
          </span>
        )}
      </div>

      {description && <p className="text-sm text-muted-foreground">{description}</p>}

      <div className="relative">
        <Sigma
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          id="equation-input"
          ref={inputRef}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          aria-invalid={error !== null}
          aria-describedby={statusId}
          className={cn(
            "numeric h-12 w-full rounded-lg border bg-surface-sunken pl-10 pr-28 text-base",
            "shadow-sm transition-colors placeholder:font-sans placeholder:text-muted-foreground",
            "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
            error === null ? "border-input" : "border-destructive/60",
          )}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {value.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                onValueChange("");
                inputRef.current?.focus();
              }}
              aria-label="Clear the expression"
            >
              <Eraser />
            </Button>
          )}
          <Button type="button" size="sm" onClick={submit} disabled={error !== null}>
            {submitLabel}
            <CornerDownLeft className="size-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      {/* Live preview / validation status */}
      <div
        id={statusId}
        role="status"
        aria-live="polite"
        className={cn(
          "min-h-[3.25rem] rounded-lg border px-4 py-3 transition-colors",
          error === null ? "border-border bg-surface" : "border-destructive/40 bg-destructive/5",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {error !== null ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.16 }}
              className="flex items-start gap-2 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p>{error.message}</p>
                {error.position !== undefined && deferredValue.length > 0 && (
                  <pre className="numeric mt-1.5 overflow-x-auto text-xs text-muted-foreground">
                    {deferredValue}
                    {"\n"}
                    {" ".repeat(Math.max(0, error.position))}^
                  </pre>
                )}
              </div>
            </motion.div>
          ) : preview !== null && preview.length > 0 ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: isPending ? 0.55 : 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.16 }}
              className="flex items-center gap-3"
            >
              <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
              <Latex display className="min-w-0 flex-1 text-lg">
                {preview}
              </Latex>
            </motion.div>
          ) : (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-muted-foreground"
            >
              Start typing — the rendered formula appears here as you go.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {showPalette && (
        <div className="rounded-lg border border-border bg-surface">
          <div
            className="flex flex-wrap gap-1 border-b border-border p-1.5"
            role="tablist"
            aria-label="Formula palette categories"
          >
            {PALETTE.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                role="tab"
                aria-selected={candidate.id === group.id}
                onClick={() => setActiveGroup(candidate.id)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  candidate.id === group.id
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {candidate.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 p-2" role="tabpanel" aria-label={group.name}>
            {group.entries.map((entry) => (
              <motion.button
                key={`${group.id}-${entry.insert}`}
                type="button"
                onClick={() => insert(entry)}
                whileTap={{ scale: 0.94 }}
                aria-label={`Insert ${entry.label}`}
                title={entry.label}
                className={cn(
                  "flex h-9 min-w-11 items-center justify-center rounded-md border border-border",
                  "bg-surface-raised px-2.5 text-sm transition-colors",
                  "hover:border-primary/50 hover:bg-primary/10 hover:text-primary",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                )}
              >
                <Latex>{entry.latex}</Latex>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {variables.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Detected symbols:</span>
          {variables.map((name) => (
            <Badge key={name} variant="outline" className="numeric">
              {name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
