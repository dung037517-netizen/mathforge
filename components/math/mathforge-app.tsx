"use client";

import { motion } from "framer-motion";
import { Cpu, Dices, GraduationCap, Layers, Rocket, Sigma, Zap } from "lucide-react";
import * as React from "react";

import { ActuarialVisualizer } from "@/components/math/actuarial-visualizer";
import { SimulationLab } from "@/components/math/simulation-lab";
import { Workbench } from "@/components/math/workbench";
import { SiteHeader } from "@/components/site/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CAPABILITIES: readonly {
  readonly icon: typeof Sigma;
  readonly title: string;
  readonly description: string;
}[] = [
  {
    icon: GraduationCap,
    title: "AP-aligned, worked in full",
    description:
      "Twelve exam-style prompts across Calculus AB, BC and Statistics. Each one is solved by the " +
      "engine with a complete derivation — not a lookup table of answers.",
  },
  {
    icon: Sigma,
    title: "Symbolic calculus",
    description:
      "A hand-written recursive-descent parser feeds a differentiator that names every rule it " +
      "applies — product, quotient, chain, and logarithmic differentiation for cases like xˣ.",
  },
  {
    icon: Layers,
    title: "Dense linear algebra",
    description:
      "LU factorisation with partial pivoting for determinants, Gauss-Jordan for inverses, and " +
      "cyclic Jacobi rotations for symmetric eigenvalues.",
  },
  {
    icon: Zap,
    title: "Where the maths leads",
    description:
      "Five parametric mortality laws with ₜpₓ, e̊ₓ, Āₓ and āₓ — showing what an improper integral " +
      "from BC actually becomes in actuarial practice.",
  },
];

const STATS: readonly { readonly label: string; readonly value: string }[] = [
  { label: "AP problems solved step-by-step", value: "12" },
  { label: "Zero runtime math dependencies", value: "0" },
  { label: "Probability distributions", value: "9" },
  { label: "Engine unit tests", value: "48" },
];

/**
 * The whole workbench, as one client tree.
 *
 * Keeping the hero and the panels in a single component is what lets the
 * "explore the sample scenario" button reach into the solver — a reviewer gets
 * a fully worked AP problem on screen one click after landing, with no typing.
 */
export function MathForgeApp() {
  const [demoSignal, setDemoSignal] = React.useState(0);

  const runQuickDemo = React.useCallback(() => {
    setDemoSignal((current) => current + 1);
    document.getElementById("workbench")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 aurora" aria-hidden />
        <div className="pointer-events-none absolute inset-0 grid-backdrop" aria-hidden />

        <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-5">
              <GraduationCap className="size-3" aria-hidden />
              AP Calculus AB · BC · Statistics
            </Badge>

            <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Learn the method,{" "}
              <span className="text-gradient">not just the answer</span>
            </h1>

            <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              MathForge parses, differentiates and integrates entirely in your browser, then shows
              the argument rule by rule. Every AP topic is annotated with the professional technique
              it becomes — the chain rule you learn for the exam is the same one that prices an
              option.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button type="button" size="lg" onClick={runQuickDemo}>
                <Rocket />
                Explore a worked AP problem
              </Button>
              <Button type="button" variant="outline" size="lg" asChild>
                <a href="#simulation">
                  <Dices />
                  See the Central Limit Theorem
                </a>
              </Button>
              <span className="text-xs text-muted-foreground">
                Pre-solved on load — nothing to configure.
              </span>
            </div>

            <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="numeric text-2xl font-semibold text-primary sm:text-3xl">
                    {stat.value}
                  </dd>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {CAPABILITIES.map((capability, index) => {
            const Icon = capability.icon;
            return (
              <motion.div
                key={capability.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="h-full bg-surface">
                  <CardHeader>
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <CardTitle className="mt-2 text-sm">{capability.title}</CardTitle>
                    <CardDescription className="text-xs leading-relaxed">
                      {capability.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Solver, graphing, matrices, AP curriculum */}
      <section id="workbench" className="mx-auto max-w-[1400px] scroll-mt-20 px-4 pb-12 sm:px-6">
        <header className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Workbench</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            One expression drives the derivation, the plot and the definite integral at once. Pick
            an AP problem below and it loads here, fully solved.
          </p>
        </header>
        <Workbench demoSignal={demoSignal} />
      </section>

      {/* Distributions and survival models */}
      <section id="actuarial" className="mx-auto max-w-[1400px] scroll-mt-20 px-4 pb-12 sm:px-6">
        <header className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">
            Probability, statistics &amp; where they lead
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            The nine distributions on the AP Statistics formula sheet, plus the parametric mortality
            laws they turn into once you reach actuarial work.
          </p>
        </header>
        <ActuarialVisualizer />
      </section>

      {/* Simulation */}
      <section id="simulation" className="mx-auto max-w-[1400px] scroll-mt-20 px-4 pb-16 sm:px-6">
        <header className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Monte Carlo laboratory</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Opens on the Central Limit Theorem: average a strongly skewed population and watch the
            sampling distribution become normal, with the simulated spread checked against σ/√n.
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
                  Runs off the main thread, so the interface stays responsive at half a million
                  paths.
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

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            MathForge — built with Next.js, TypeScript and a math engine written from first
            principles.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a
              href="https://github.com/dung037517-netizen/mathforge"
              target="_blank"
              rel="noreferrer noopener"
              className="transition-colors hover:text-foreground"
            >
              Source
            </a>
            <a
              href="https://finhubtracker-maudung.vercel.app"
              target="_blank"
              rel="noreferrer noopener"
              className="transition-colors hover:text-foreground"
            >
              FinHub Tracker →
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
