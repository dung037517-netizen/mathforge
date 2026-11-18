"use client";

import { Cpu, Dices, Rocket } from "lucide-react";
import * as React from "react";

import { ActuarialVisualizer } from "@/components/math/actuarial-visualizer";
import { SimulationLab } from "@/components/math/simulation-lab";
import { Workbench } from "@/components/math/workbench";
import { PageHeading, PageShell } from "@/components/site/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * The exploration tools: a step-by-step solver, distribution and survival
 * model visualizers, and a Monte Carlo laboratory, all running on the same
 * hand-written engine that audits the practice questions.
 */
export function LabPage() {
  const [demoSignal, setDemoSignal] = React.useState(0);

  const runDemo = (): void => {
    setDemoSignal((current) => current + 1);
    document.getElementById("workbench")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <PageShell width="wide">
      <PageHeading
        title="Lab"
        description="Tools for exploring an idea rather than being tested on it. Type any expression and the engine differentiates it rule by rule, plots it and integrates it; then see where the same mathematics leads in probability and actuarial work."
      >
        <Button onClick={runDemo}>
          <Rocket aria-hidden />
          Load a worked example
        </Button>
      </PageHeading>

      <section id="workbench" className="scroll-mt-28 pb-12">
        <header className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Workbench</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            One expression drives the derivation, the plot and the definite integral at once. Pick an AP problem below
            and it loads here, fully solved.
          </p>
        </header>
        <Workbench demoSignal={demoSignal} />
      </section>

      <section id="actuarial" className="scroll-mt-28 pb-12">
        <header className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Probability, statistics &amp; where they lead</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            The distributions on the AP Statistics formula sheet, plus the parametric mortality laws they turn into
            once you reach actuarial work.
          </p>
        </header>
        <ActuarialVisualizer />
      </section>

      <section id="simulation" className="scroll-mt-28">
        <header className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Monte Carlo laboratory</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Opens on the Central Limit Theorem: average a strongly skewed population and watch the sampling
            distribution become normal, with the simulated spread checked against σ/√n.
          </p>
        </header>
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Dices className="size-4 text-primary" aria-hidden />
                  Stochastic simulation
                </CardTitle>
                <CardDescription>
                  Runs off the main thread, so the interface stays responsive at half a million paths.
                </CardDescription>
              </div>
              <Badge variant="accent" className="shrink-0">
                <Cpu className="size-3" aria-hidden />
                worker-offloaded
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <SimulationLab />
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
