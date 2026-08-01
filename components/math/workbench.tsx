"use client";

import { FunctionSquare, Grid3x3, Sparkles, TrendingUp } from "lucide-react";
import * as React from "react";

import { EquationInput } from "@/components/math/equation-input";
import { GraphingCanvas } from "@/components/math/graphing-canvas";
import { MatrixWorkbench } from "@/components/math/matrix-workbench";
import { SolutionSteps } from "@/components/math/solution-steps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { solveDefiniteIntegral, solveDerivative } from "@/lib/math-engine";
import type { EngineError, Solution } from "@/types/math";

/** Worked examples that show what the solver can do without any typing. */
const EXAMPLES: readonly { readonly label: string; readonly source: string }[] = [
  { label: "Product rule", source: "x^2 * sin(x)" },
  { label: "Chain rule", source: "exp(-x^2 / 2)" },
  { label: "Quotient rule", source: "ln(x) / x" },
  { label: "Logarithmic", source: "x^x" },
  { label: "Survival curve", source: "exp(-0.0003/ln(1.09) * (1.09^x - 1))" },
  { label: "Normal density", source: "normpdf(x)" },
];

type SolverMode = "derivative" | "integral";

const INITIAL_SOURCE = "x^2 * sin(x)";

/** Solve on first render so the panel is never empty on first paint. */
function initialSolution(): Solution | null {
  const result = solveDerivative(INITIAL_SOURCE, "x");
  return result.ok ? result.value : null;
}

/**
 * The unified solver: one expression drives the derivation, the plot, and the
 * definite integral, so switching modes never means retyping the problem.
 */
export function Workbench() {
  const [source, setSource] = React.useState(INITIAL_SOURCE);
  const [mode, setMode] = React.useState<SolverMode>("derivative");
  const [lower, setLower] = React.useState("0");
  const [upper, setUpper] = React.useState("3.14159265");
  const [solution, setSolution] = React.useState<Solution | null>(initialSolution);
  const [error, setError] = React.useState<EngineError | null>(null);

  const solve = React.useCallback(
    (nextSource: string, nextMode: SolverMode) => {
      const result =
        nextMode === "derivative"
          ? solveDerivative(nextSource, "x")
          : solveDefiniteIntegral(
              nextSource,
              "x",
              Number.parseFloat(lower) || 0,
              Number.parseFloat(upper) || 0,
            );

      if (result.ok) {
        setSolution(result.value);
        setError(null);
      } else {
        setSolution(null);
        setError(result.error);
      }
    },
    [lower, upper],
  );

  const handleModeChange = (value: string): void => {
    const nextMode: SolverMode = value === "integral" ? "integral" : "derivative";
    setMode(nextMode);
    solve(source, nextMode);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2">
              <FunctionSquare className="size-4 text-primary" aria-hidden />
              Symbolic solver
            </CardTitle>
            <CardDescription>
              Differentiate or integrate an expression and read the full argument, rule by rule.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-5">
            <EquationInput
              value={source}
              onValueChange={setSource}
              onSubmit={(_, nextSource) => solve(nextSource, mode)}
              submitLabel={mode === "derivative" ? "Differentiate" : "Integrate"}
              description="Standard infix notation. Implicit multiplication (2x, 3sin(x)) is understood."
            />

            <Tabs value={mode} onValueChange={handleModeChange}>
              <TabsList>
                <TabsTrigger value="derivative">
                  <Sparkles aria-hidden />
                  Derivative
                </TabsTrigger>
                <TabsTrigger value="integral">
                  <TrendingUp aria-hidden />
                  Definite integral
                </TabsTrigger>
              </TabsList>

              <TabsContent value="integral">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="integral-lower">Lower limit</Label>
                    <Input
                      id="integral-lower"
                      value={lower}
                      onChange={(event) => setLower(event.target.value)}
                      className="numeric w-32"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="integral-upper">Upper limit</Label>
                    <Input
                      id="integral-upper"
                      value={upper}
                      onChange={(event) => setUpper(event.target.value)}
                      className="numeric w-32"
                      inputMode="decimal"
                    />
                  </div>
                  <Button type="button" onClick={() => solve(source, "integral")}>
                    Evaluate
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Try:</span>
              {EXAMPLES.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  onClick={() => {
                    setSource(example.source);
                    solve(example.source, mode);
                  }}
                  className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                >
                  {example.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2">
              <Grid3x3 className="size-4 text-primary" aria-hidden />
              Matrix tools
            </CardTitle>
            <CardDescription>
              Determinant by LU factorisation, inverse by Gauss-Jordan elimination, rank from the
              row echelon form, and Jacobi eigenvalues for symmetric matrices.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <MatrixWorkbench />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>Graphing canvas</CardTitle>
                <CardDescription>
                  The same expression, plotted with its derivative overlaid.
                </CardDescription>
              </div>
              <Badge variant="outline" className="shrink-0">
                480 samples
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <GraphingCanvas source={source} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle>Step-by-step solution</CardTitle>
            <CardDescription>
              Every rule invoked, in the order the engine applied it.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            {error !== null && (
              <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error.message}
              </p>
            )}
            <SolutionSteps solution={solution} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
