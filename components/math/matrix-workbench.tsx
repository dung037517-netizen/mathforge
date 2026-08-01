"use client";

import { motion } from "framer-motion";
import { Grid3x3, RotateCcw, Shuffle } from "lucide-react";
import * as React from "react";

import { Latex } from "@/components/math/latex";
import { SolutionSteps } from "@/components/math/solution-steps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  analyseMatrix,
  createMatrix,
  matrixToLatex,
  solveMatrixAnalysis,
} from "@/lib/math-engine";
import { cn, formatNumber } from "@/lib/utils";
import type { Solution } from "@/types/math";

const MIN_DIMENSION = 2;
const MAX_DIMENSION = 5;

/** A well-conditioned starting matrix with an exact integer inverse. */
const INITIAL_GRID: readonly (readonly number[])[] = [
  [4, 7, 2],
  [3, 6, 1],
  [2, 5, 3],
];

function resizeGrid(
  grid: readonly (readonly number[])[],
  rows: number,
  cols: number,
): number[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => grid[r]?.[c] ?? (r === c ? 1 : 0)),
  );
}

export interface MatrixWorkbenchProps {
  className?: string;
}

/**
 * Editable matrix with a live structural analysis: determinant via LU, inverse
 * via Gauss-Jordan, rank from the row echelon form, and Jacobi eigenvalues when
 * the matrix is symmetric.
 */
export function MatrixWorkbench({ className }: MatrixWorkbenchProps) {
  const [grid, setGrid] = React.useState<number[][]>(() => INITIAL_GRID.map((row) => [...row]));
  const [showSteps, setShowSteps] = React.useState(false);

  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  const built = React.useMemo(() => createMatrix(grid), [grid]);
  const analysis = React.useMemo(
    () => (built.ok ? analyseMatrix(built.value) : null),
    [built],
  );
  const solution: Solution | null = React.useMemo(
    () => (built.ok && showSteps ? solveMatrixAnalysis(built.value) : null),
    [built, showSteps],
  );

  const setCell = (r: number, c: number, raw: string): void => {
    const parsed = Number.parseFloat(raw);
    setGrid((current) =>
      current.map((row, rowIndex) =>
        rowIndex === r
          ? row.map((entry, colIndex) =>
              colIndex === c ? (Number.isFinite(parsed) ? parsed : 0) : entry,
            )
          : row,
      ),
    );
  };

  const resize = (nextRows: number, nextCols: number): void => {
    setGrid((current) => resizeGrid(current, nextRows, nextCols));
  };

  const randomise = (): void => {
    setGrid((current) =>
      current.map((row) => row.map(() => Math.round((Math.random() * 18 - 9) * 10) / 10)),
    );
  };

  const reset = (): void => {
    setGrid(INITIAL_GRID.map((row) => [...row]));
  };

  const facts: readonly { readonly label: string; readonly value: string; readonly tone: string }[] =
    analysis === null
      ? []
      : [
          {
            label: "Determinant",
            value:
              analysis.determinant === null ? "—" : formatNumber(analysis.determinant, 6),
            tone:
              analysis.determinant === null
                ? "text-muted-foreground"
                : Math.abs(analysis.determinant) < 1e-9
                  ? "text-destructive"
                  : "text-foreground",
          },
          { label: "Rank", value: String(analysis.rank), tone: "text-foreground" },
          {
            label: "Trace",
            value: analysis.trace === null ? "—" : formatNumber(analysis.trace, 6),
            tone: "text-foreground",
          },
          {
            label: "Condition (∞-norm)",
            value:
              analysis.conditionEstimate === null
                ? "—"
                : formatNumber(analysis.conditionEstimate, 3),
            tone:
              analysis.conditionEstimate !== null && analysis.conditionEstimate > 1000
                ? "text-warning"
                : "text-foreground",
          },
        ];

  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label asChild>
              <span id="matrix-rows-label">Rows</span>
            </Label>
            <div className="flex items-center gap-1" role="group" aria-labelledby="matrix-rows-label">
              {Array.from({ length: MAX_DIMENSION - MIN_DIMENSION + 1 }, (_, i) => i + MIN_DIMENSION).map(
                (value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => resize(value, cols)}
                    aria-pressed={rows === value}
                    className={cn(
                      "numeric size-8 rounded-md border text-sm transition-colors",
                      rows === value
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    {value}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label asChild>
              <span id="matrix-cols-label">Columns</span>
            </Label>
            <div className="flex items-center gap-1" role="group" aria-labelledby="matrix-cols-label">
              {Array.from({ length: MAX_DIMENSION - MIN_DIMENSION + 1 }, (_, i) => i + MIN_DIMENSION).map(
                (value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => resize(rows, value)}
                    aria-pressed={cols === value}
                    className={cn(
                      "numeric size-8 rounded-md border text-sm transition-colors",
                      cols === value
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    {value}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={randomise}>
            <Shuffle />
            Randomise
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={reset}>
            <RotateCcw />
            Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[auto_minmax(0,1fr)]">
        <div className="space-y-3">
          <Label>Matrix A</Label>
          <div className="inline-flex items-stretch gap-2 rounded-lg border border-border bg-surface p-3">
            <span className="w-1 rounded-l border-y-2 border-l-2 border-primary/40" aria-hidden />
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 4rem))` }}
              role="group"
              aria-label={`${rows} by ${cols} matrix editor`}
            >
              {grid.map((row, r) =>
                row.map((entry, c) => (
                  <input
                    key={`${r}-${c}`}
                    type="number"
                    step="any"
                    value={entry}
                    onChange={(event) => setCell(r, c, event.target.value)}
                    aria-label={`Row ${r + 1}, column ${c + 1}`}
                    className={cn(
                      "numeric h-10 w-full rounded-md border border-input bg-surface-sunken",
                      "px-2 text-center text-sm transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                      "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
                    )}
                  />
                )),
              )}
            </div>
            <span className="w-1 rounded-r border-y-2 border-r-2 border-primary/40" aria-hidden />
          </div>

          <dl className="grid grid-cols-2 gap-2">
            {facts.map((fact) => (
              <motion.div
                key={fact.label}
                layout
                className="rounded-md border border-border bg-surface px-3 py-2"
              >
                <dt className="truncate text-xs text-muted-foreground">{fact.label}</dt>
                <dd className={cn("numeric mt-0.5 text-sm font-semibold", fact.tone)}>
                  {fact.value}
                </dd>
              </motion.div>
            ))}
          </dl>
        </div>

        <div className="space-y-4">
          {analysis === null ? (
            <p className="text-sm text-destructive">
              {built.ok ? "" : built.error.message}
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-surface-sunken p-4">
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                    Transpose
                  </p>
                  <Latex display>{`A^{T} = ${matrixToLatex(analysis.transpose)}`}</Latex>
                </div>

                <div className="rounded-lg border border-border bg-surface-sunken p-4">
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                    Inverse
                  </p>
                  {analysis.inverse === null ? (
                    <p className="text-sm text-muted-foreground">
                      {analysis.isSquare
                        ? "Singular — the columns are linearly dependent, so A⁻¹ does not exist."
                        : "Only square matrices have an inverse."}
                    </p>
                  ) : (
                    <Latex display>{`A^{-1} = ${matrixToLatex(analysis.inverse)}`}</Latex>
                  )}
                </div>
              </div>

              {analysis.eigenvalues !== null && (
                <div className="rounded-lg border border-border bg-surface-sunken p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Eigenvalues
                    </p>
                    <Badge variant="accent">symmetric · Jacobi rotations</Badge>
                  </div>
                  <Latex display>
                    {`\\lambda = \\left\\{ ${analysis.eigenvalues
                      .map((value) => formatNumber(value, 5))
                      .join(",\\; ")} \\right\\}`}
                  </Latex>
                </div>
              )}

              <Button
                type="button"
                variant={showSteps ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowSteps((current) => !current)}
              >
                <Grid3x3 />
                {showSteps ? "Hide the derivation" : "Show the derivation"}
              </Button>

              {showSteps && <SolutionSteps solution={solution} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
