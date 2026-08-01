"use client";

import { motion } from "framer-motion";
import { Activity, HeartPulse, Sigma } from "lucide-react";
import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/components/math/chart-tooltip";
import { Latex } from "@/components/math/latex";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  computeLifeContingencies,
  distributionCdf,
  distributionLatex,
  distributionMoments,
  isDiscrete,
  sampleDistribution,
  sampleSurvivalCurve,
  survivalModelLatex,
} from "@/lib/math-engine";
import { cn, formatNumber, formatPercent } from "@/lib/utils";
import type {
  DistributionKind,
  DistributionParameters,
  SurvivalModelKind,
  SurvivalModelParameters,
} from "@/types/math";

/* ------------------------------------------------------------------ */
/* Shared chart chrome                                                 */
/* ------------------------------------------------------------------ */

const AXIS_STYLE = {
  fontSize: 11,
  fill: "var(--muted-foreground)",
} as const;

/** Labelled slider that keeps its numeric readout aligned with the handle. */
interface ParameterSliderProps {
  id: string;
  label: string;
  latex?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  hint?: string;
}

function ParameterSlider({
  id,
  label,
  latex,
  value,
  min,
  max,
  step,
  onChange,
  format,
  hint,
}: ParameterSliderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className="flex items-center gap-1.5 normal-case tracking-normal">
          {latex !== undefined && <Latex className="text-sm text-foreground">{latex}</Latex>}
          <span>{label}</span>
        </Label>
        <span className="numeric text-sm font-medium text-foreground">
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
      {hint !== undefined && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Distribution panel                                                  */
/* ------------------------------------------------------------------ */

const DISTRIBUTION_LABELS: Readonly<Record<DistributionKind, string>> = {
  normal: "Normal",
  lognormal: "Lognormal",
  exponential: "Exponential",
  uniform: "Uniform",
  gamma: "Gamma",
  weibull: "Weibull",
  binomial: "Binomial",
  poisson: "Poisson",
  geometric: "Geometric",
};

/** Sensible defaults so switching families never lands on a degenerate shape. */
function defaultParameters(kind: DistributionKind): DistributionParameters {
  switch (kind) {
    case "normal":
      return { kind, mu: 0, sigma: 1 };
    case "lognormal":
      return { kind, mu: 0, sigma: 0.5 };
    case "exponential":
      return { kind, lambda: 1 };
    case "uniform":
      return { kind, a: 0, b: 1 };
    case "gamma":
      return { kind, shape: 2, rate: 1 };
    case "weibull":
      return { kind, shape: 2, scale: 1 };
    case "binomial":
      return { kind, n: 20, p: 0.35 };
    case "poisson":
      return { kind, lambda: 4 };
    case "geometric":
      return { kind, p: 0.3 };
  }
}

function DistributionControls({
  parameters,
  onChange,
}: {
  parameters: DistributionParameters;
  onChange: (next: DistributionParameters) => void;
}) {
  switch (parameters.kind) {
    case "normal":
    case "lognormal":
      return (
        <>
          <ParameterSlider
            id="dist-mu"
            label={parameters.kind === "normal" ? "mean" : "log-mean"}
            latex="\mu"
            value={parameters.mu}
            min={-5}
            max={5}
            step={0.1}
            onChange={(mu) => onChange({ ...parameters, mu })}
          />
          <ParameterSlider
            id="dist-sigma"
            label={parameters.kind === "normal" ? "std. deviation" : "log-std. deviation"}
            latex="\sigma"
            value={parameters.sigma}
            min={0.1}
            max={4}
            step={0.05}
            onChange={(sigma) => onChange({ ...parameters, sigma })}
          />
        </>
      );

    case "exponential":
    case "poisson":
      return (
        <ParameterSlider
          id="dist-lambda"
          label={parameters.kind === "exponential" ? "rate" : "mean count"}
          latex="\lambda"
          value={parameters.lambda}
          min={0.1}
          max={parameters.kind === "exponential" ? 5 : 25}
          step={0.1}
          onChange={(lambda) => onChange({ ...parameters, lambda })}
        />
      );

    case "uniform":
      return (
        <>
          <ParameterSlider
            id="dist-a"
            label="lower bound"
            latex="a"
            value={parameters.a}
            min={-10}
            max={parameters.b - 0.1}
            step={0.1}
            onChange={(a) => onChange({ ...parameters, a })}
          />
          <ParameterSlider
            id="dist-b"
            label="upper bound"
            latex="b"
            value={parameters.b}
            min={parameters.a + 0.1}
            max={10}
            step={0.1}
            onChange={(b) => onChange({ ...parameters, b })}
          />
        </>
      );

    case "gamma":
      return (
        <>
          <ParameterSlider
            id="dist-shape"
            label="shape"
            latex="\alpha"
            value={parameters.shape}
            min={0.2}
            max={12}
            step={0.1}
            onChange={(shape) => onChange({ ...parameters, shape })}
          />
          <ParameterSlider
            id="dist-rate"
            label="rate"
            latex="\beta"
            value={parameters.rate}
            min={0.1}
            max={6}
            step={0.1}
            onChange={(rate) => onChange({ ...parameters, rate })}
          />
        </>
      );

    case "weibull":
      return (
        <>
          <ParameterSlider
            id="dist-shape"
            label="shape"
            latex="k"
            value={parameters.shape}
            min={0.3}
            max={8}
            step={0.1}
            onChange={(shape) => onChange({ ...parameters, shape })}
            hint="k < 1 decreasing hazard, k = 1 exponential, k > 1 wear-out."
          />
          <ParameterSlider
            id="dist-scale"
            label="scale"
            latex="\lambda"
            value={parameters.scale}
            min={0.2}
            max={8}
            step={0.1}
            onChange={(scale) => onChange({ ...parameters, scale })}
          />
        </>
      );

    case "binomial":
      return (
        <>
          <ParameterSlider
            id="dist-n"
            label="trials"
            latex="n"
            value={parameters.n}
            min={1}
            max={80}
            step={1}
            onChange={(n) => onChange({ ...parameters, n: Math.round(n) })}
            format={(value) => String(Math.round(value))}
          />
          <ParameterSlider
            id="dist-p"
            label="success probability"
            latex="p"
            value={parameters.p}
            min={0.01}
            max={0.99}
            step={0.01}
            onChange={(p) => onChange({ ...parameters, p })}
            format={(value) => formatPercent(value, 0)}
          />
        </>
      );

    case "geometric":
      return (
        <ParameterSlider
          id="dist-p"
          label="success probability"
          latex="p"
          value={parameters.p}
          min={0.01}
          max={0.99}
          step={0.01}
          onChange={(p) => onChange({ ...parameters, p })}
          format={(value) => formatPercent(value, 0)}
        />
      );
  }
}

function DistributionPanel() {
  const [parameters, setParameters] = React.useState<DistributionParameters>(
    defaultParameters("normal"),
  );
  const [threshold, setThreshold] = React.useState(1);

  const samples = React.useMemo(() => sampleDistribution(parameters, 260), [parameters]);
  const moments = React.useMemo(() => distributionMoments(parameters), [parameters]);
  const discrete = isDiscrete(parameters);

  const [xMin, xMax] = React.useMemo(() => {
    const xs = samples.map((sample) => sample.x);
    return [Math.min(...xs), Math.max(...xs)] as const;
  }, [samples]);

  // Switching families changes the support, so the stored threshold is clamped
  // during render rather than corrected afterwards in an effect — the slider and
  // the tail probability can never disagree, not even for one frame.
  const effectiveThreshold = Math.min(xMax, Math.max(xMin, threshold));

  const tailProbability = React.useMemo(
    () => 1 - distributionCdf(parameters, effectiveThreshold),
    [parameters, effectiveThreshold],
  );

  const statistics: readonly { readonly label: string; readonly value: string }[] = [
    { label: "Mean", value: formatNumber(moments.mean, 4) },
    { label: "Variance", value: formatNumber(moments.variance, 4) },
    { label: "Std. dev.", value: formatNumber(moments.standardDeviation, 4) },
    { label: "Skewness", value: formatNumber(moments.skewness, 4) },
    { label: "Excess kurtosis", value: formatNumber(moments.excessKurtosis, 4) },
    { label: `P(X > ${formatNumber(effectiveThreshold, 2)})`, value: formatPercent(tailProbability, 3) },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="order-2 space-y-4 lg:order-1">
        <div className="rounded-lg border border-border bg-surface-sunken px-4 py-3">
          <Latex display className="text-sm">
            {distributionLatex(parameters)}
          </Latex>
        </div>

        <div className="h-72 w-full" aria-label="Probability density chart">
          <ResponsiveContainer width="100%" height="100%">
            {discrete ? (
              <BarChart data={[...samples]} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="x" tick={AXIS_STYLE} stroke="var(--border)" />
                <YAxis tick={AXIS_STYLE} stroke="var(--border)" width={52} />
                <Tooltip
                  content={<ChartTooltip labelPrefix="k = " decimals={5} />}
                  cursor={{ fill: "var(--secondary)", opacity: 0.4 }}
                />
                <Bar dataKey="density" name="P(X = k)" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
                <ReferenceLine
                  x={Math.round(effectiveThreshold)}
                  stroke="var(--chart-3)"
                  strokeDasharray="4 4"
                />
              </BarChart>
            ) : (
              <AreaChart data={[...samples]} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="density-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tick={AXIS_STYLE}
                  stroke="var(--border)"
                  tickFormatter={(value: number) => formatNumber(value, 2)}
                />
                <YAxis tick={AXIS_STYLE} stroke="var(--border)" width={52} />
                <Tooltip content={<ChartTooltip labelPrefix="x = " decimals={5} />} />
                <Area
                  type="monotone"
                  dataKey="density"
                  name="f(x)"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill="url(#density-fill)"
                  isAnimationActive={false}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  name="F(x)"
                  stroke="var(--chart-2)"
                  strokeWidth={1.75}
                  strokeDasharray="5 3"
                  dot={false}
                  isAnimationActive={false}
                />
                <ReferenceLine
                  x={effectiveThreshold}
                  stroke="var(--chart-3)"
                  strokeDasharray="4 4"
                  label={{
                    value: "threshold",
                    fill: "var(--chart-3)",
                    fontSize: 10,
                    position: "top",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }}
                  iconType="plainline"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {statistics.map((statistic) => (
            <motion.div
              key={statistic.label}
              layout
              className="rounded-md border border-border bg-surface px-3 py-2"
            >
              <dt className="truncate text-xs text-muted-foreground">{statistic.label}</dt>
              <dd className="numeric mt-0.5 text-sm font-semibold">{statistic.value}</dd>
            </motion.div>
          ))}
        </dl>
      </div>

      <div className="order-1 space-y-4 lg:order-2">
        <div className="space-y-1.5">
          <Label htmlFor="distribution-family">Distribution family</Label>
          <Select
            value={parameters.kind}
            onValueChange={(value) => setParameters(defaultParameters(value as DistributionKind))}
          >
            <SelectTrigger id="distribution-family">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(DISTRIBUTION_LABELS) as DistributionKind[]).map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {DISTRIBUTION_LABELS[kind]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
          <DistributionControls parameters={parameters} onChange={setParameters} />
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
          <ParameterSlider
            id="dist-threshold"
            label="tail threshold"
            latex="x_0"
            value={effectiveThreshold}
            min={xMin}
            max={xMax}
            step={(xMax - xMin) / 200 || 0.01}
            onChange={setThreshold}
            hint="The survival probability P(X > x₀) is the quantity a reinsurer prices."
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Survival panel                                                      */
/* ------------------------------------------------------------------ */

const SURVIVAL_LABELS: Readonly<Record<SurvivalModelKind, string>> = {
  exponential: "Constant force (exponential)",
  gompertz: "Gompertz",
  makeham: "Makeham",
  deMoivre: "De Moivre (uniform)",
  weibull: "Weibull",
};

function defaultSurvival(kind: SurvivalModelKind): SurvivalModelParameters {
  switch (kind) {
    case "exponential":
      return { kind, mu: 0.02 };
    case "gompertz":
      return { kind, b: 0.0003, c: 1.09 };
    case "makeham":
      return { kind, a: 0.0005, b: 0.0003, c: 1.09 };
    case "deMoivre":
      return { kind, omega: 105 };
    case "weibull":
      return { kind, shape: 4.5, scale: 88 };
  }
}

function SurvivalControls({
  model,
  onChange,
}: {
  model: SurvivalModelParameters;
  onChange: (next: SurvivalModelParameters) => void;
}) {
  switch (model.kind) {
    case "exponential":
      return (
        <ParameterSlider
          id="surv-mu"
          label="force of mortality"
          latex="\mu"
          value={model.mu}
          min={0.001}
          max={0.15}
          step={0.001}
          onChange={(mu) => onChange({ ...model, mu })}
          hint="Constant hazard implies a memoryless lifetime: e̊ₓ = 1/μ at every age."
        />
      );

    case "gompertz":
      return (
        <>
          <ParameterSlider
            id="surv-b"
            label="baseline level"
            latex="B"
            value={model.b}
            min={0.00002}
            max={0.002}
            step={0.00002}
            onChange={(b) => onChange({ ...model, b })}
            format={(value) => value.toExponential(2)}
          />
          <ParameterSlider
            id="surv-c"
            label="ageing rate"
            latex="c"
            value={model.c}
            min={1.02}
            max={1.2}
            step={0.005}
            onChange={(c) => onChange({ ...model, c })}
            hint="Mortality compounds geometrically — c ≈ 1.09 doubles the hazard about every 8 years."
          />
        </>
      );

    case "makeham":
      return (
        <>
          <ParameterSlider
            id="surv-a"
            label="accident term"
            latex="A"
            value={model.a}
            min={0}
            max={0.01}
            step={0.0001}
            onChange={(a) => onChange({ ...model, a })}
            hint="The age-independent component: accidents rather than senescence."
          />
          <ParameterSlider
            id="surv-b"
            label="baseline level"
            latex="B"
            value={model.b}
            min={0.00002}
            max={0.002}
            step={0.00002}
            onChange={(b) => onChange({ ...model, b })}
            format={(value) => value.toExponential(2)}
          />
          <ParameterSlider
            id="surv-c"
            label="ageing rate"
            latex="c"
            value={model.c}
            min={1.02}
            max={1.2}
            step={0.005}
            onChange={(c) => onChange({ ...model, c })}
          />
        </>
      );

    case "deMoivre":
      return (
        <ParameterSlider
          id="surv-omega"
          label="limiting age"
          latex="\omega"
          value={model.omega}
          min={60}
          max={130}
          step={1}
          onChange={(omega) => onChange({ ...model, omega })}
          format={(value) => String(Math.round(value))}
          hint="Lifetime is uniform on [0, ω], so the hazard blows up as x approaches ω."
        />
      );

    case "weibull":
      return (
        <>
          <ParameterSlider
            id="surv-shape"
            label="shape"
            latex="k"
            value={model.shape}
            min={0.5}
            max={12}
            step={0.1}
            onChange={(shape) => onChange({ ...model, shape })}
          />
          <ParameterSlider
            id="surv-scale"
            label="scale"
            latex="\lambda"
            value={model.scale}
            min={20}
            max={140}
            step={1}
            onChange={(scale) => onChange({ ...model, scale })}
          />
        </>
      );
  }
}

function SurvivalPanel() {
  const [model, setModel] = React.useState<SurvivalModelParameters>(defaultSurvival("gompertz"));
  const [age, setAge] = React.useState(45);
  const [horizon, setHorizon] = React.useState(10);
  const [forceOfInterest, setForceOfInterest] = React.useState(0.04);

  const curve = React.useMemo(() => sampleSurvivalCurve(model, age, 180), [model, age]);
  const contingencies = React.useMemo(
    () => computeLifeContingencies(model, age, forceOfInterest, horizon),
    [model, age, forceOfInterest, horizon],
  );

  const metrics: readonly {
    readonly label: string;
    readonly latex: string;
    readonly value: string;
    readonly hint: string;
  }[] = [
    {
      label: "Survival probability",
      latex: `{}_{${horizon}}p_{${age}}`,
      value: formatPercent(contingencies.tPx, 3),
      hint: `Chance a life aged ${age} reaches age ${age + horizon}.`,
    },
    {
      label: "Mortality probability",
      latex: `{}_{${horizon}}q_{${age}}`,
      value: formatPercent(contingencies.tQx, 3),
      hint: "The complement — what a term policy actually insures.",
    },
    {
      label: "Complete expectation",
      latex: `\\mathring{e}_{${age}}`,
      value: `${formatNumber(contingencies.lifeExpectancy, 2)} yr`,
      hint: "Area under the conditional survival curve.",
    },
    {
      label: "Curtate expectation",
      latex: `e_{${age}}`,
      value: `${formatNumber(contingencies.curtateExpectation, 2)} yr`,
      hint: "Whole years survived, summed at integer durations.",
    },
    {
      label: "Whole-life insurance",
      latex: `\\bar{A}_{${age}}`,
      value: formatNumber(contingencies.wholeLifeInsurance, 5),
      hint: "EPV of 1 paid at the moment of death.",
    },
    {
      label: "Life annuity",
      latex: `\\bar{a}_{${age}}`,
      value: formatNumber(contingencies.lifeAnnuity, 5),
      hint: "EPV of 1 per year paid continuously while alive.",
    },
    {
      label: "Net annual premium",
      latex: `\\bar{P}(\\bar{A}_{${age}})`,
      value: formatNumber(contingencies.netPremium, 5),
      hint: "Equivalence principle: EPV(premiums) = EPV(benefits).",
    },
    {
      label: "Identity check",
      latex: `\\bar{A} + \\delta\\bar{a}`,
      value: formatNumber(
        contingencies.wholeLifeInsurance + forceOfInterest * contingencies.lifeAnnuity,
        6,
      ),
      hint: "Must equal 1 — an internal consistency check on the quadrature.",
    },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="order-2 space-y-4 lg:order-1">
        <div className="rounded-lg border border-border bg-surface-sunken px-4 py-3">
          <Latex display className="text-sm">
            {survivalModelLatex(model)}
          </Latex>
        </div>

        <div className="h-64 w-full" aria-label="Survival function chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[...curve]} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="survival-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="age"
                type="number"
                domain={["dataMin", "dataMax"]}
                tick={AXIS_STYLE}
                stroke="var(--border)"
                tickFormatter={(value: number) => String(Math.round(value))}
              />
              <YAxis
                tick={AXIS_STYLE}
                stroke="var(--border)"
                width={52}
                domain={[0, 1]}
                tickFormatter={(value: number) => formatNumber(value, 1)}
              />
              <Tooltip content={<ChartTooltip labelPrefix="age " decimals={5} />} />
              <Area
                type="monotone"
                dataKey="survival"
                name="S(x)"
                stroke="var(--chart-2)"
                strokeWidth={2}
                fill="url(#survival-fill)"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="conditionalSurvival"
                name={`ₜp_${age}`}
                stroke="var(--chart-1)"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                isAnimationActive={false}
              />
              <ReferenceLine x={age} stroke="var(--chart-3)" strokeDasharray="4 4" />
              <ReferenceLine
                x={age + horizon}
                stroke="var(--chart-4)"
                strokeDasharray="2 4"
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }}
                iconType="plainline"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="h-48 w-full" aria-label="Force of mortality and death density chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={[...curve]} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="age"
                type="number"
                domain={["dataMin", "dataMax"]}
                tick={AXIS_STYLE}
                stroke="var(--border)"
                tickFormatter={(value: number) => String(Math.round(value))}
              />
              <YAxis
                yAxisId="hazard"
                tick={AXIS_STYLE}
                stroke="var(--border)"
                width={52}
                tickFormatter={(value: number) => formatNumber(value, 2)}
              />
              <YAxis
                yAxisId="density"
                orientation="right"
                tick={AXIS_STYLE}
                stroke="var(--border)"
                width={52}
                tickFormatter={(value: number) => formatNumber(value, 3)}
              />
              <Tooltip content={<ChartTooltip labelPrefix="age " decimals={6} />} />
              <Line
                yAxisId="hazard"
                type="monotone"
                dataKey="hazard"
                name="μ(x)"
                stroke="var(--chart-5)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="density"
                type="monotone"
                dataKey="density"
                name="f(x) = S(x)μ(x)"
                stroke="var(--chart-3)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }}
                iconType="plainline"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <motion.div
              key={metric.label}
              layout
              className="rounded-md border border-border bg-surface px-3 py-2.5"
            >
              <dt className="flex items-center justify-between gap-2">
                <Latex className="text-sm text-primary">{metric.latex}</Latex>
                <span className="truncate text-[0.7rem] text-muted-foreground">{metric.label}</span>
              </dt>
              <dd className="numeric mt-1 text-base font-semibold">{metric.value}</dd>
              <p className="mt-1 text-[0.7rem] leading-snug text-muted-foreground">{metric.hint}</p>
            </motion.div>
          ))}
        </dl>
      </div>

      <div className="order-1 space-y-4 lg:order-2">
        <div className="space-y-1.5">
          <Label htmlFor="survival-model">Mortality law</Label>
          <Select
            value={model.kind}
            onValueChange={(value) => setModel(defaultSurvival(value as SurvivalModelKind))}
          >
            <SelectTrigger id="survival-model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SURVIVAL_LABELS) as SurvivalModelKind[]).map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {SURVIVAL_LABELS[kind]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
          <SurvivalControls model={model} onChange={setModel} />
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
          <ParameterSlider
            id="surv-age"
            label="base age"
            latex="x"
            value={age}
            min={0}
            max={model.kind === "deMoivre" ? model.omega - 1 : 100}
            step={1}
            onChange={(value) => setAge(Math.round(value))}
            format={(value) => String(Math.round(value))}
          />
          <ParameterSlider
            id="surv-horizon"
            label="horizon (years)"
            latex="t"
            value={horizon}
            min={1}
            max={50}
            step={1}
            onChange={(value) => setHorizon(Math.round(value))}
            format={(value) => String(Math.round(value))}
          />
          <ParameterSlider
            id="surv-delta"
            label="force of interest"
            latex="\delta"
            value={forceOfInterest}
            min={0}
            max={0.15}
            step={0.001}
            onChange={setForceOfInterest}
            format={(value) => formatPercent(value, 1)}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Public component                                                    */
/* ------------------------------------------------------------------ */

export interface ActuarialVisualizerProps {
  className?: string;
}

/**
 * Interactive plotter for probability densities and parametric survival models.
 *
 * Every control recomputes the curves synchronously from closed-form
 * expressions in the engine — no sampling, no server round-trip — so dragging a
 * slider redraws in the same frame.
 */
export function ActuarialVisualizer({ className }: ActuarialVisualizerProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4 text-primary" aria-hidden />
              Probability & survival visualiser
            </CardTitle>
            <CardDescription>
              Parametric distributions and mortality laws, with the life-contingency functions
              derived from them.
            </CardDescription>
          </div>
          <Badge variant="accent" className="shrink-0">
            <Sigma className="size-3" aria-hidden />
            closed-form
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        <Tabs defaultValue="survival">
          <TabsList>
            <TabsTrigger value="survival">
              <HeartPulse aria-hidden />
              Survival models
            </TabsTrigger>
            <TabsTrigger value="distribution">
              <Activity aria-hidden />
              Distributions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="survival">
            <SurvivalPanel />
          </TabsContent>

          <TabsContent value="distribution">
            <DistributionPanel />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
