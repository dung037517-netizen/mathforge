import { Cpu, Dices, GitBranch, Layers, Sigma, Zap } from "lucide-react";

import { ActuarialVisualizer } from "@/components/math/actuarial-visualizer";
import { SimulationLab } from "@/components/math/simulation-lab";
import { Workbench } from "@/components/math/workbench";
import { SiteHeader } from "@/components/site/site-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CAPABILITIES: readonly {
  readonly icon: typeof Sigma;
  readonly title: string;
  readonly description: string;
}[] = [
  {
    icon: Sigma,
    title: "Symbolic calculus",
    description:
      "A hand-written recursive-descent parser feeds a differentiator that names every rule it " +
      "applies — product, quotient, chain, and logarithmic differentiation.",
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
    title: "Life contingencies",
    description:
      "Gompertz, Makeham, De Moivre and Weibull mortality laws, with ₜpₓ, e̊ₓ, Āₓ and āₓ " +
      "obtained by adaptive Simpson quadrature.",
  },
  {
    icon: Cpu,
    title: "Non-blocking simulation",
    description:
      "Monte Carlo runs execute in a Web Worker, with a cooperative main-thread scheduler as a " +
      "fallback. Neither path can produce a long task.",
  },
];

const STATS: readonly { readonly label: string; readonly value: string }[] = [
  { label: "Zero runtime math dependencies", value: "0" },
  { label: "Mortality laws implemented", value: "5" },
  { label: "Probability distributions", value: "9" },
  { label: "Engine unit tests", value: "43" },
];

export default function HomePage() {
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
              <GitBranch className="size-3" aria-hidden />
              Actuarial science · quantitative finance · computer science
            </Badge>

            <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              An interactive workbench for{" "}
              <span className="text-gradient">actuarial and probability computing</span>
            </h1>

            <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              MathForge parses, differentiates, integrates, factorises and simulates entirely in
              the browser. Every number on this page is computed from a dependency-free engine
              written from first principles — no computer-algebra library, no server round-trip,
              and no blocked frames.
            </p>

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
          {CAPABILITIES.map((capability) => {
            const Icon = capability.icon;
            return (
              <Card key={capability.title} className="bg-surface">
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
            );
          })}
        </div>
      </section>

      {/* Solver + graphing + matrices */}
      <section id="workbench" className="mx-auto max-w-[1400px] scroll-mt-20 px-4 pb-12 sm:px-6">
        <header className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Workbench</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            One expression drives the derivation, the plot and the definite integral at once.
          </p>
        </header>
        <Workbench />
      </section>

      {/* Actuarial visualiser */}
      <section id="actuarial" className="mx-auto max-w-[1400px] scroll-mt-20 px-4 pb-12 sm:px-6">
        <header className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Actuarial models</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Parametric mortality laws and probability distributions, with the life-contingency
            functions that follow from them.
          </p>
        </header>
        <ActuarialVisualizer />
      </section>

      {/* Simulation */}
      <section id="simulation" className="mx-auto max-w-[1400px] scroll-mt-20 px-4 pb-16 sm:px-6">
        <header className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Monte Carlo laboratory</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Seeded, reproducible simulation with a live comparison against the closed-form answer
            wherever one exists.
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
