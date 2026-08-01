"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Cpu, Dices, Gauge, Play, Square, TriangleAlert } from "lucide-react";
import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/components/math/chart-tooltip";
import { Latex } from "@/components/math/latex";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  runSimulation,
  toEngineError,
  type SimulationHandle,
  type SimulationStrategy,
} from "@/lib/simulation-client";
import { describeSimulation } from "@/lib/math-engine";
import { cn, formatNumber } from "@/lib/utils";
import type { EngineError, SimulationConfig, SimulationKind, SimulationSummary } from "@/types/math";

const SIMULATION_LABELS: Readonly<Record<SimulationKind, string>> = {
  "actuarial-reserve": "Aggregate death-benefit reserve",
  "geometric-brownian-motion": "Terminal asset price (GBM)",
  "pi-estimation": "Monte Carlo estimate of π",
};

/** LaTeX for the estimator each simulation targets. */
const SIMULATION_FORMULAE: Readonly<Record<SimulationKind, string>> = {
  "actuarial-reserve":
    "L = \\sum_{j=1}^{n} B\\,e^{-\\delta T_j},\\qquad T_j \\sim {}_tp_x\\,\\mu_{x+t}",
  "geometric-brownian-motion":
    "S_T = S_0\\exp\\!\\left[\\left(\\mu - \\tfrac{\\sigma^2}{2}\\right)T + \\sigma\\sqrt{T}\\,Z\\right]",
  "pi-estimation": "\\pi \\approx \\frac{4}{n}\\sum_{i=1}^{n}\\mathbb{1}\\{U_i^2 + V_i^2 \\le 1\\}",
};

interface LabState {
  readonly kind: SimulationKind;
  readonly paths: number;
  readonly seed: number;
  readonly age: number;
  readonly policies: number;
  readonly forceOfInterest: number;
  readonly mu: number;
  readonly spot: number;
  readonly drift: number;
  readonly volatility: number;
  readonly horizonYears: number;
}

const INITIAL_STATE: LabState = {
  kind: "actuarial-reserve",
  paths: 50_000,
  seed: 20_260_801,
  age: 45,
  policies: 250,
  forceOfInterest: 0.05,
  mu: 0.03,
  spot: 100,
  drift: 0.07,
  volatility: 0.2,
  horizonYears: 1,
};

function buildConfig(state: LabState): SimulationConfig {
  switch (state.kind) {
    case "actuarial-reserve":
      return {
        kind: "actuarial-reserve",
        paths: state.paths,
        seed: state.seed,
        age: state.age,
        policies: state.policies,
        benefit: 1,
        forceOfInterest: state.forceOfInterest,
        survival: { kind: "exponential", mu: state.mu },
      };
    case "geometric-brownian-motion":
      return {
        kind: "geometric-brownian-motion",
        paths: state.paths,
        seed: state.seed,
        spot: state.spot,
        drift: state.drift,
        volatility: state.volatility,
        horizonYears: state.horizonYears,
        steps: 52,
      };
    case "pi-estimation":
      return { kind: "pi-estimation", paths: state.paths, seed: state.seed };
  }
}

/**
 * The analytic value each simulation converges to, where one exists. Showing it
 * alongside the estimate turns the panel into a live validation of the engine
 * rather than a black box.
 */
function analyticBenchmark(state: LabState): { label: string; value: number } | null {
  switch (state.kind) {
    case "actuarial-reserve":
      // E[e^{-δT}] = μ/(μ+δ) under a constant force, scaled by the cohort size.
      return {
        label: "n · μ/(μ+δ)",
        value: (state.policies * state.mu) / (state.mu + state.forceOfInterest),
      };
    case "geometric-brownian-motion":
      return {
        label: "S₀e^{μT}",
        value: state.spot * Math.exp(state.drift * state.horizonYears),
      };
    case "pi-estimation":
      return { label: "π", value: Math.PI };
  }
}

interface LabSliderProps {
  id: string;
  label: string;
  latex?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}

function LabSlider({ id, label, latex, value, min, max, step, onChange, format }: LabSliderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className="flex items-center gap-1.5 normal-case tracking-normal">
          {latex !== undefined && <Latex className="text-sm text-foreground">{latex}</Latex>}
          <span>{label}</span>
        </Label>
        <span className="numeric text-sm font-medium">
          {format ? format(value) : formatNumber(value, 4)}
        </span>
      </div>
      <Slider
        id={id}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => onChange(next)}
        aria-label={label}
      />
    </div>
  );
}

export interface SimulationLabProps {
  className?: string;
}

/**
 * Monte Carlo laboratory.
 *
 * The run is dispatched through `runSimulation`, which prefers a Web Worker and
 * degrades to a cooperative main-thread scheduler. Either way the UI keeps
 * animating — the badge reports which strategy actually executed, so the
 * behaviour is observable rather than merely claimed.
 */
export function SimulationLab({ className }: SimulationLabProps) {
  const [state, setState] = React.useState<LabState>(INITIAL_STATE);
  const [summary, setSummary] = React.useState<SimulationSummary | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [running, setRunning] = React.useState(false);
  const [strategy, setStrategy] = React.useState<SimulationStrategy | null>(null);
  const [error, setError] = React.useState<EngineError | null>(null);
  const handleRef = React.useRef<SimulationHandle | null>(null);

  // Cancel any in-flight run if the component unmounts mid-simulation.
  React.useEffect(() => {
    return () => handleRef.current?.cancel();
  }, []);

  const update = <K extends keyof LabState>(key: K, value: LabState[K]): void => {
    setState((current) => ({ ...current, [key]: value }));
  };

  const start = (): void => {
    handleRef.current?.cancel();
    setRunning(true);
    setProgress(0);
    setError(null);

    const config = buildConfig(state);
    const handle = runSimulation(config, {
      onProgress: (fraction) => setProgress(fraction),
    });
    handleRef.current = handle;
    setStrategy(handle.strategy);

    handle.completed
      .then((result) => {
        setSummary(result);
        setProgress(1);
      })
      .catch((cause: unknown) => {
        const engineError = toEngineError(cause);
        // A user-initiated cancel is not an error worth surfacing in red.
        if (!engineError.message.includes("cancelled")) setError(engineError);
      })
      .finally(() => {
        setRunning(false);
        handleRef.current = null;
      });
  };

  const stop = (): void => {
    handleRef.current?.cancel();
    setRunning(false);
  };

  const benchmark = analyticBenchmark(state);
  const config = buildConfig(state);

  const histogramData = React.useMemo(
    () =>
      summary === null
        ? []
        : summary.histogram.map((bin) => ({
            midpoint: (bin.start + bin.end) / 2,
            count: bin.count,
            density: bin.density,
          })),
    [summary],
  );

  return (
    <div className={cn("grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]", className)}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="simulation-kind">Simulation</Label>
          <Select
            value={state.kind}
            onValueChange={(value) => {
              setSummary(null);
              setProgress(0);
              update("kind", value as SimulationKind);
            }}
          >
            <SelectTrigger id="simulation-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SIMULATION_LABELS) as SimulationKind[]).map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {SIMULATION_LABELS[kind]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {describeSimulation(config)}
          </p>
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
          <LabSlider
            id="sim-paths"
            label="paths"
            latex="n"
            value={state.paths}
            min={1000}
            max={500_000}
            step={1000}
            onChange={(value) => update("paths", Math.round(value))}
            format={(value) => Math.round(value).toLocaleString("en-US")}
          />
          <LabSlider
            id="sim-seed"
            label="seed"
            value={state.seed}
            min={1}
            max={99_999_999}
            step={1}
            onChange={(value) => update("seed", Math.round(value))}
            format={(value) => String(Math.round(value))}
          />
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
          {state.kind === "actuarial-reserve" && (
            <>
              <LabSlider
                id="sim-age"
                label="age"
                latex="x"
                value={state.age}
                min={20}
                max={90}
                step={1}
                onChange={(value) => update("age", Math.round(value))}
                format={(value) => String(Math.round(value))}
              />
              <LabSlider
                id="sim-policies"
                label="policies in force"
                latex="n_{\text{lives}}"
                value={state.policies}
                min={1}
                max={2000}
                step={1}
                onChange={(value) => update("policies", Math.round(value))}
                format={(value) => Math.round(value).toLocaleString("en-US")}
              />
              <LabSlider
                id="sim-mu"
                label="force of mortality"
                latex="\mu"
                value={state.mu}
                min={0.005}
                max={0.15}
                step={0.005}
                onChange={(value) => update("mu", value)}
              />
              <LabSlider
                id="sim-delta"
                label="force of interest"
                latex="\delta"
                value={state.forceOfInterest}
                min={0.005}
                max={0.15}
                step={0.005}
                onChange={(value) => update("forceOfInterest", value)}
              />
            </>
          )}

          {state.kind === "geometric-brownian-motion" && (
            <>
              <LabSlider
                id="sim-spot"
                label="spot price"
                latex="S_0"
                value={state.spot}
                min={5}
                max={500}
                step={1}
                onChange={(value) => update("spot", value)}
                format={(value) => `$${formatNumber(value, 2)}`}
              />
              <LabSlider
                id="sim-drift"
                label="drift"
                latex="\mu"
                value={state.drift}
                min={-0.2}
                max={0.3}
                step={0.005}
                onChange={(value) => update("drift", value)}
              />
              <LabSlider
                id="sim-vol"
                label="volatility"
                latex="\sigma"
                value={state.volatility}
                min={0.02}
                max={1}
                step={0.01}
                onChange={(value) => update("volatility", value)}
              />
              <LabSlider
                id="sim-horizon"
                label="horizon (years)"
                latex="T"
                value={state.horizonYears}
                min={0.25}
                max={10}
                step={0.25}
                onChange={(value) => update("horizonYears", value)}
              />
            </>
          )}

          {state.kind === "pi-estimation" && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              No parameters beyond the path count — the estimator&apos;s standard error falls as
              1/√n, which the confidence interval below makes visible.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button type="button" onClick={start} disabled={running} className="flex-1">
            <Play />
            Run
          </Button>
          <Button type="button" variant="outline" onClick={stop} disabled={!running}>
            <Square />
            Stop
          </Button>
        </div>

        {(running || progress > 0) && (
          <div className="space-y-1.5">
            <Progress value={progress * 100} aria-label="Simulation progress" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="numeric">{Math.round(progress * 100)}%</span>
              {strategy !== null && (
                <Badge variant={strategy === "worker" ? "success" : "warning"}>
                  <Cpu className="size-3" aria-hidden />
                  {strategy === "worker" ? "Web Worker" : "main thread (chunked)"}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-surface-sunken px-4 py-3">
          <Latex display className="text-sm">
            {SIMULATION_FORMULAE[state.kind]}
          </Latex>
        </div>

        <AnimatePresence mode="wait">
          {error !== null ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>{error.message}</p>
            </motion.div>
          ) : summary === null ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface p-8 text-center"
            >
              <Dices className="size-6 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Press <span className="font-medium text-foreground">Run</span> to sample the
                distribution.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="h-64 w-full rounded-lg border border-border bg-surface p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histogramData} margin={{ top: 10, right: 16, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="midpoint"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      stroke="var(--border)"
                      tickFormatter={(value: number) => formatNumber(value, 2)}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      stroke="var(--border)"
                      width={56}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          decimals={4}
                          labelFormatter={(value) =>
                            `bin centre ${typeof value === "number" ? formatNumber(value, 4) : String(value ?? "")}`
                          }
                        />
                      }
                    />
                    <Bar dataKey="count" name="paths" fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
                    <ReferenceLine
                      x={summary.mean}
                      stroke="var(--chart-3)"
                      strokeWidth={2}
                      label={{
                        value: "mean",
                        fill: "var(--chart-3)",
                        fontSize: 10,
                        position: "top",
                      }}
                    />
                    {benchmark !== null && (
                      <ReferenceLine
                        x={benchmark.value}
                        stroke="var(--chart-4)"
                        strokeDasharray="4 4"
                        strokeWidth={2}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(
                  [
                    { label: "Estimate", value: formatNumber(summary.mean, 5) },
                    { label: "Std. error", value: formatNumber(summary.standardError, 6) },
                    { label: "Median", value: formatNumber(summary.median, 5) },
                    { label: "Std. deviation", value: formatNumber(summary.standardDeviation, 5) },
                  ] as const
                ).map((item) => (
                  <div key={item.label} className="rounded-md border border-border bg-surface px-3 py-2">
                    <dt className="truncate text-xs text-muted-foreground">{item.label}</dt>
                    <dd className="numeric mt-0.5 text-sm font-semibold">{item.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-surface p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    95% confidence interval for the mean
                  </p>
                  <p className="numeric mt-1 text-sm font-semibold">
                    [{formatNumber(summary.confidenceInterval[0], 5)},{" "}
                    {formatNumber(summary.confidenceInterval[1], 5)}]
                  </p>
                  {benchmark !== null && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Analytic {benchmark.label} ={" "}
                      <span className="numeric font-medium text-foreground">
                        {formatNumber(benchmark.value, 5)}
                      </span>{" "}
                      —{" "}
                      {benchmark.value >= summary.confidenceInterval[0] &&
                      benchmark.value <= summary.confidenceInterval[1] ? (
                        <span className="text-success">inside the interval.</span>
                      ) : (
                        <span className="text-warning">
                          outside the interval; increase the path count.
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Empirical quantiles
                    </p>
                    <Badge variant="outline">
                      <Gauge className="size-3" aria-hidden />
                      {summary.elapsedMs} ms
                    </Badge>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {summary.quantiles
                      .filter((quantile) => [0.05, 0.5, 0.95, 0.99].includes(quantile.level))
                      .map((quantile) => (
                        <li
                          key={quantile.level}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-muted-foreground">
                            {(quantile.level * 100).toFixed(0)}th percentile
                          </span>
                          <span className="numeric font-medium">
                            {formatNumber(quantile.value, 5)}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {summary.paths.toLocaleString("en-US")} paths, seed {state.seed}. Reruns with the
                same seed reproduce these figures exactly.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
