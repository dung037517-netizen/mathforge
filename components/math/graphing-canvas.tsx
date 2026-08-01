"use client";

import { motion } from "framer-motion";
import { LineChart as LineChartIcon, Minus, Plus, RotateCcw } from "lucide-react";
import * as React from "react";
import {
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  compile,
  differentiate,
  evaluateNode,
  integrateNumeric,
  parse,
  simplify,
  toLatex,
} from "@/lib/math-engine";
import { cn, formatNumber } from "@/lib/utils";
import type { ExpressionNode } from "@/types/math";

interface CanvasRow {
  readonly x: number;
  readonly f: number | null;
  readonly df: number | null;
}

export interface GraphingCanvasProps {
  /** Source expression; the canvas re-plots whenever it parses successfully. */
  source: string;
  variableName?: string;
  className?: string;
}

const MIN_SPAN = 0.05;
const MAX_SPAN = 2000;

/**
 * Function plotter with an optional derivative overlay and a shaded definite
 * integral.
 *
 * Sampling density is fixed at 480 points and the window is zoomed by scaling
 * the span about its centre, so the cost of a redraw is independent of how far
 * the user has zoomed out.
 */
export function GraphingCanvas({ source, variableName = "x", className }: GraphingCanvasProps) {
  const [span, setSpan] = React.useState(10);
  const [centre, setCentre] = React.useState(0);
  const [showDerivative, setShowDerivative] = React.useState(true);
  const [showIntegral, setShowIntegral] = React.useState(false);

  const parsed = React.useMemo(() => parse(source), [source]);
  const ast: ExpressionNode | null = parsed.ok ? simplify(parsed.value) : null;

  const derivativeAst = React.useMemo(
    () => (ast === null ? null : differentiate(ast, variableName).node),
    [ast, variableName],
  );

  const xMin = centre - span / 2;
  const xMax = centre + span / 2;

  const rows = React.useMemo<CanvasRow[]>(() => {
    if (ast === null) return [];
    const f = compile(ast, variableName);
    const df = derivativeAst === null ? null : compile(derivativeAst, variableName);
    const samples = 480;
    const step = (xMax - xMin) / (samples - 1);

    const output: CanvasRow[] = [];
    for (let i = 0; i < samples; i += 1) {
      const x = xMin + i * step;
      const fValue = f(x);
      const dfValue = df === null ? Number.NaN : df(x);
      output.push({
        x: Number(x.toFixed(6)),
        // Clip extreme excursions so a single pole cannot flatten the whole curve.
        f: Number.isFinite(fValue) && Math.abs(fValue) < 1e7 ? fValue : null,
        df:
          showDerivative && Number.isFinite(dfValue) && Math.abs(dfValue) < 1e7 ? dfValue : null,
      });
    }
    return output;
  }, [ast, derivativeAst, showDerivative, variableName, xMin, xMax]);

  const integral = React.useMemo(() => {
    if (ast === null || !showIntegral) return null;
    const value = integrateNumeric(compile(ast, variableName), xMin, xMax, 1e-8, 30);
    return Number.isFinite(value) ? value : null;
  }, [ast, showIntegral, variableName, xMin, xMax]);

  const valueAtCentre = React.useMemo(() => {
    if (ast === null) return null;
    try {
      const value = evaluateNode(ast, { [variableName]: centre });
      return Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  }, [ast, centre, variableName]);

  const zoom = (factor: number): void => {
    setSpan((current) => Math.min(MAX_SPAN, Math.max(MIN_SPAN, current * factor)));
  };

  const reset = (): void => {
    setSpan(10);
    setCentre(0);
  };

  if (ast === null) {
    return (
      <div
        className={cn(
          "flex h-80 flex-col items-center justify-center gap-2 rounded-lg border border-dashed",
          "border-border bg-surface-sunken text-center",
          className,
        )}
      >
        <LineChartIcon className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Enter a valid expression to plot it.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge variant="default">
            <Latex>{`f(${variableName}) = ${toLatex(ast)}`}</Latex>
          </Badge>
          {showDerivative && derivativeAst !== null && (
            <Badge variant="accent">
              <Latex>{`f'(${variableName}) = ${toLatex(derivativeAst)}`}</Latex>
            </Badge>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => zoom(0.7)}
            aria-label="Zoom in"
          >
            <Plus />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => zoom(1 / 0.7)}
            aria-label="Zoom out"
          >
            <Minus />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={reset}
            aria-label="Reset the view"
          >
            <RotateCcw />
          </Button>
        </div>
      </div>

      <div className="h-80 w-full rounded-lg border border-border bg-surface p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 10, right: 16, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="x"
              type="number"
              domain={[xMin, xMax]}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              stroke="var(--border)"
              tickFormatter={(value: number) => formatNumber(value, 2)}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              stroke="var(--border)"
              width={56}
              tickFormatter={(value: number) => formatNumber(value, 2)}
            />
            <Tooltip
              content={
                <ChartTooltip
                  decimals={5}
                  labelFormatter={(value) =>
                    `${variableName} = ${typeof value === "number" ? formatNumber(value, 4) : String(value ?? "")}`
                  }
                />
              }
            />
            <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeWidth={1} />
            <ReferenceLine x={0} stroke="var(--muted-foreground)" strokeWidth={1} />
            <Line
              type="monotone"
              dataKey="f"
              name={`f(${variableName})`}
              stroke="var(--chart-1)"
              strokeWidth={2.25}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            {showDerivative && (
              <Line
                type="monotone"
                dataKey="df"
                name={`f'(${variableName})`}
                stroke="var(--chart-2)"
                strokeWidth={1.75}
                strokeDasharray="5 3"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
            <Legend
              wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }}
              iconType="plainline"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <Switch
            id="show-derivative"
            checked={showDerivative}
            onCheckedChange={setShowDerivative}
          />
          <Label htmlFor="show-derivative" className="normal-case tracking-normal">
            Overlay derivative
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch id="show-integral" checked={showIntegral} onCheckedChange={setShowIntegral} />
          <Label htmlFor="show-integral" className="normal-case tracking-normal">
            Integrate over the window
          </Label>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-4 text-xs">
          <span className="numeric text-muted-foreground">
            window [{formatNumber(xMin, 2)}, {formatNumber(xMax, 2)}]
          </span>
          {valueAtCentre !== null && (
            <span className="numeric text-muted-foreground">
              f({formatNumber(centre, 2)}) ={" "}
              <span className="font-medium text-foreground">{formatNumber(valueAtCentre, 5)}</span>
            </span>
          )}
          {integral !== null && (
            <motion.span
              key={integral}
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              className="numeric rounded-md bg-accent/15 px-2 py-1 text-accent"
            >
              ∫ = {formatNumber(integral, 6)}
            </motion.span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Label htmlFor="canvas-centre" className="shrink-0 normal-case tracking-normal">
          Pan
        </Label>
        <input
          id="canvas-centre"
          type="range"
          min={-50}
          max={50}
          step={0.5}
          value={centre}
          onChange={(event) => setCentre(Number(event.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-sunken accent-[var(--primary)]"
          aria-label="Pan the plot window"
        />
        <span className="numeric w-16 shrink-0 text-right text-xs text-muted-foreground">
          {formatNumber(centre, 1)}
        </span>
      </div>
    </div>
  );
}
