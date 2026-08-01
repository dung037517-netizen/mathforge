import { describe, expect, it } from "vitest";

import {
  analyseMatrix,
  annuityImmediatePresentValue,
  compoundInterest,
  completeLifeExpectancy,
  conditionalSurvival,
  continuousLifeAnnuity,
  createMatrix,
  centralLimitPrediction,
  createSimulation,
  determinant,
  differentiate,
  distributionCdf,
  distributionMoments,
  distributionPdf,
  effectiveAnnualRate,
  erf,
  evaluateExpression,
  evaluateNode,
  integrateNumeric,
  internalRateOfReturn,
  invertMatrix,
  logGamma,
  multiplyMatrices,
  normalCdf,
  normalQuantile,
  parse,
  sampleDistributionValue,
  sampleFutureLifetime,
  simplify,
  solveDerivative,
  solveDefiniteIntegral,
  survivalProbability,
  symmetricEigenvalues,
  toLatex,
  validateSimulationConfig,
  valueCashFlows,
  wholeLifeInsurance,
  SeededRandom,
} from "@/lib/math-engine";
import type {
  DistributionParameters,
  Matrix,
  SurvivalModelParameters,
} from "@/types/math";

/** Unwrap a Result, failing the test with the engine's own message. */
function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: { message: string } }): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function matrixOf(data: number[][]): Matrix {
  return unwrap(createMatrix(data));
}

describe("parser and evaluator", () => {
  it("respects operator precedence and associativity", () => {
    expect(unwrap(evaluateExpression("2 + 3 * 4"))).toBe(14);
    expect(unwrap(evaluateExpression("2 ^ 3 ^ 2"))).toBe(512); // right-associative
    expect(unwrap(evaluateExpression("(2 + 3) * 4"))).toBe(20);
    expect(unwrap(evaluateExpression("-3^2"))).toBe(-9); // unary binds looser than ^
  });

  it("handles implicit multiplication", () => {
    expect(unwrap(evaluateExpression("2x", { x: 5 }))).toBe(10);
    expect(unwrap(evaluateExpression("3(x + 1)", { x: 2 }))).toBe(9);
    expect(unwrap(evaluateExpression("(x+1)(x-1)", { x: 4 }))).toBe(15);
  });

  it("distinguishes scientific notation from Euler's constant", () => {
    expect(unwrap(evaluateExpression("1e3"))).toBe(1000);
    expect(unwrap(evaluateExpression("2e"))).toBeCloseTo(2 * Math.E, 12);
  });

  it("evaluates built-in functions and constants", () => {
    expect(unwrap(evaluateExpression("sin(pi/2)"))).toBeCloseTo(1, 12);
    expect(unwrap(evaluateExpression("ln(e)"))).toBeCloseTo(1, 12);
    expect(unwrap(evaluateExpression("log(2, 8)"))).toBeCloseTo(3, 12);
    expect(unwrap(evaluateExpression("sqrt(16) + abs(-3)"))).toBe(7);
  });

  it("reports errors with a position instead of throwing", () => {
    const result = parse("2 +");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PARSE_ERROR");
      expect(typeof result.error.position).toBe("number");
    }
  });

  it("rejects unbound variables at evaluation time", () => {
    const result = evaluateExpression("x + 1");
    expect(result.ok).toBe(false);
  });
});

describe("LaTeX serialisation", () => {
  it("renders fractions, powers and functions", () => {
    expect(toLatex(unwrap(parse("x/2")))).toBe("\\frac{x}{2}");
    expect(toLatex(unwrap(parse("x^2")))).toBe("x^{2}");
    expect(toLatex(unwrap(parse("sqrt(x)")))).toBe("\\sqrt{x}");
    expect(toLatex(unwrap(parse("sin(x)")))).toContain("\\sin");
  });
});

describe("simplification", () => {
  it("removes identity operations", () => {
    expect(toLatex(simplify(unwrap(parse("x + 0"))))).toBe("x");
    expect(toLatex(simplify(unwrap(parse("1 * x"))))).toBe("x");
    expect(toLatex(simplify(unwrap(parse("x^1"))))).toBe("x");
    expect(toLatex(simplify(unwrap(parse("0 * x"))))).toBe("0");
  });

  it("folds constant subexpressions", () => {
    expect(toLatex(simplify(unwrap(parse("2 * 3 + 4"))))).toBe("10");
  });
});

describe("symbolic differentiation", () => {
  const derivativeOf = (source: string): string => unwrap(solveDerivative(source, "x")).result;

  it("applies the power rule", () => {
    expect(derivativeOf("x^3")).toBe("3 x^{2}");
    expect(derivativeOf("x")).toBe("1");
    expect(derivativeOf("5")).toBe("0");
  });

  it("applies the product and quotient rules", () => {
    // d/dx[x·sin x] = sin x + x·cos x
    const product = unwrap(solveDerivative("x * sin(x)", "x"));
    expect(product.steps.some((step) => step.rule === "product-rule")).toBe(true);

    const quotient = unwrap(solveDerivative("sin(x)/x", "x"));
    expect(quotient.steps.some((step) => step.rule === "quotient-rule")).toBe(true);
  });

  it("applies the chain rule", () => {
    const solution = unwrap(solveDerivative("sin(x^2)", "x"));
    expect(solution.steps.some((step) => step.rule === "chain-rule")).toBe(true);
  });

  it("agrees with a central finite difference", () => {
    const cases: readonly (readonly [string, number])[] = [
      ["x^3 + 2*x", 1.7],
      ["sin(x)*cos(x)", 0.4],
      ["exp(x)/x", 2.1],
      ["ln(x^2 + 1)", 1.3],
      ["x^x", 1.6],
      ["tan(x)", 0.5],
      ["sqrt(x^2 + 1)", 2.2],
      ["atan(3*x)", 0.9],
      ["cosh(x)/x^2", 1.4],
    ];

    for (const [source, at] of cases) {
      const f = (x: number): number => unwrap(evaluateExpression(source, { x }));
      const h = 1e-6;
      const numeric = (f(at + h) - f(at - h)) / (2 * h);

      const symbolic = differentiate(unwrap(parse(source)), "x").node;
      const symbolicValue = evaluateNode(symbolic, { x: at });

      expect(symbolicValue).toBeCloseTo(numeric, 4);
    }
  });
});

describe("numerical integration", () => {
  it("integrates polynomials exactly", () => {
    expect(integrateNumeric((x) => x * x, 0, 3)).toBeCloseTo(9, 8);
  });

  it("integrates transcendental functions", () => {
    expect(integrateNumeric(Math.sin, 0, Math.PI)).toBeCloseTo(2, 8);
    expect(integrateNumeric((x) => Math.exp(-x * x), -5, 5)).toBeCloseTo(Math.sqrt(Math.PI), 6);
  });

  it("produces a solution with steps", () => {
    const solution = unwrap(solveDefiniteIntegral("x^2", "x", 0, 3));
    expect(solution.numeric).toBeCloseTo(9, 6);
    expect(solution.steps.length).toBeGreaterThan(0);
  });
});

describe("linear algebra", () => {
  const a = matrixOf([
    [4, 7],
    [2, 6],
  ]);

  it("computes determinants", () => {
    expect(unwrap(determinant(a))).toBeCloseTo(10, 10);
    expect(
      unwrap(
        determinant(
          matrixOf([
            [6, 1, 1],
            [4, -2, 5],
            [2, 8, 7],
          ]),
        ),
      ),
    ).toBeCloseTo(-306, 8);
  });

  it("inverts matrices so that A·A⁻¹ = I", () => {
    const inverse = unwrap(invertMatrix(a));
    const product = unwrap(multiplyMatrices(a, inverse));
    expect(product.data[0][0]).toBeCloseTo(1, 10);
    expect(product.data[0][1]).toBeCloseTo(0, 10);
    expect(product.data[1][0]).toBeCloseTo(0, 10);
    expect(product.data[1][1]).toBeCloseTo(1, 10);
  });

  it("refuses to invert a singular matrix", () => {
    const singular = matrixOf([
      [1, 2],
      [2, 4],
    ]);
    const result = invertMatrix(singular);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SINGULAR_MATRIX");
  });

  it("computes rank and eigenvalues", () => {
    expect(
      analyseMatrix(
        matrixOf([
          [1, 2],
          [2, 4],
        ]),
      ).rank,
    ).toBe(1);

    // Symmetric matrix with known eigenvalues 3 and 1.
    const eigenvalues = symmetricEigenvalues(
      matrixOf([
        [2, 1],
        [1, 2],
      ]),
    );
    expect(eigenvalues).not.toBeNull();
    if (eigenvalues !== null) {
      expect(eigenvalues[0]).toBeCloseTo(3, 8);
      expect(eigenvalues[1]).toBeCloseTo(1, 8);
    }
  });

  it("rejects mismatched dimensions", () => {
    const wide = matrixOf([[1, 2, 3]]);
    const result = multiplyMatrices(wide, wide);
    expect(result.ok).toBe(false);
  });
});

describe("special functions", () => {
  it("matches known values of log-gamma", () => {
    expect(logGamma(1)).toBeCloseTo(0, 10);
    expect(logGamma(5)).toBeCloseTo(Math.log(24), 10);
    expect(logGamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 10);
  });

  it("matches known values of erf", () => {
    expect(erf(0)).toBe(0);
    expect(erf(1)).toBeCloseTo(0.8427007929497149, 10);
    expect(erf(-1)).toBeCloseTo(-0.8427007929497149, 10);
  });

  it("computes the normal CDF and its inverse consistently", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 12);
    expect(normalCdf(1.959963984540054)).toBeCloseTo(0.975, 10);
    for (const p of [0.001, 0.05, 0.25, 0.5, 0.75, 0.95, 0.999]) {
      expect(normalCdf(normalQuantile(p))).toBeCloseTo(p, 10);
    }
  });
});

describe("probability distributions", () => {
  it("integrates continuous densities to one", () => {
    const total = integrateNumeric((x) => distributionPdf({ kind: "normal", mu: 2, sigma: 3 }, x), -20, 24);
    expect(total).toBeCloseTo(1, 6);
  });

  it("agrees between pdf sums and cdf for discrete laws", () => {
    const poisson = { kind: "poisson", lambda: 4 } as const;
    let sum = 0;
    for (let k = 0; k <= 12; k += 1) sum += distributionPdf(poisson, k);
    expect(sum).toBeCloseTo(distributionCdf(poisson, 12), 10);
  });

  it("reports correct closed-form moments", () => {
    const binomial = distributionMoments({ kind: "binomial", n: 20, p: 0.3 });
    expect(binomial.mean).toBeCloseTo(6, 10);
    expect(binomial.variance).toBeCloseTo(4.2, 10);

    const exponential = distributionMoments({ kind: "exponential", lambda: 2 });
    expect(exponential.mean).toBeCloseTo(0.5, 10);
    expect(exponential.variance).toBeCloseTo(0.25, 10);
  });
});

describe("survival models and life contingencies", () => {
  const constantForce: SurvivalModelParameters = { kind: "exponential", mu: 0.02 };

  it("reproduces the closed form for a constant force of mortality", () => {
    // Under μ constant, ₜp_x = e^{-μt} regardless of x.
    expect(conditionalSurvival(constantForce, 40, 10)).toBeCloseTo(Math.exp(-0.2), 10);
    expect(conditionalSurvival(constantForce, 0, 10)).toBeCloseTo(Math.exp(-0.2), 10);
    expect(survivalProbability(constantForce, 50)).toBeCloseTo(Math.exp(-1), 10);
  });

  it("matches the analytic life expectancy 1/μ", () => {
    expect(completeLifeExpectancy(constantForce, 30)).toBeCloseTo(50, 3);
  });

  it("matches the analytic Ā_x = μ/(μ+δ) and ā_x = 1/(μ+δ)", () => {
    const delta = 0.05;
    const mu = 0.02;
    expect(wholeLifeInsurance(constantForce, 35, delta)).toBeCloseTo(mu / (mu + delta), 6);
    expect(continuousLifeAnnuity(constantForce, 35, delta)).toBeCloseTo(1 / (mu + delta), 4);
  });

  it("satisfies Ā_x = 1 − δ·ā_x", () => {
    const delta = 0.04;
    const gompertz: SurvivalModelParameters = { kind: "gompertz", b: 0.0003, c: 1.09 };
    const insurance = wholeLifeInsurance(gompertz, 45, delta);
    const annuity = continuousLifeAnnuity(gompertz, 45, delta);
    expect(insurance).toBeCloseTo(1 - delta * annuity, 4);
  });

  it("reproduces De Moivre's uniform survival law", () => {
    const deMoivre: SurvivalModelParameters = { kind: "deMoivre", omega: 100 };
    expect(survivalProbability(deMoivre, 40)).toBeCloseTo(0.6, 12);
    // ₜp_x = (ω − x − t)/(ω − x)
    expect(conditionalSurvival(deMoivre, 40, 20)).toBeCloseTo(40 / 60, 12);
    expect(completeLifeExpectancy(deMoivre, 40)).toBeCloseTo(30, 2);
  });

  it("samples future lifetimes consistent with the survival function", () => {
    const model: SurvivalModelParameters = { kind: "gompertz", b: 0.0004, c: 1.1 };
    const random = new SeededRandom(20260801);
    const horizon = 15;
    const trials = 40_000;
    let survivors = 0;
    for (let i = 0; i < trials; i += 1) {
      if (sampleFutureLifetime(model, 50, random.nextOpen()) > horizon) survivors += 1;
    }
    const empirical = survivors / trials;
    const analytic = conditionalSurvival(model, 50, horizon);
    expect(Math.abs(empirical - analytic)).toBeLessThan(0.01);
  });
});

describe("interest theory", () => {
  it("converts nominal to effective rates", () => {
    expect(effectiveAnnualRate(0.12, 12)).toBeCloseTo(Math.pow(1.01, 12) - 1, 12);
    expect(effectiveAnnualRate(0.05, "continuous")).toBeCloseTo(Math.exp(0.05) - 1, 12);
  });

  it("accumulates a principal correctly", () => {
    const result = compoundInterest({
      principal: 1000,
      annualRate: 0.06,
      years: 10,
      frequency: 1,
    });
    expect(result.futureValue).toBeCloseTo(1000 * Math.pow(1.06, 10), 6);
    expect(result.interestEarned).toBeCloseTo(result.futureValue - 1000, 6);
  });

  it("values a level annuity-immediate", () => {
    // a_10⌉ at 5% = 7.721734929
    expect(annuityImmediatePresentValue(1, 0.05, 10)).toBeCloseTo(7.721734929, 7);
  });

  it("finds the internal rate of return of a simple project", () => {
    // 700v² + 500v − 1000 = 0 with v = 1/(1+i) gives v = (−500 + √3050000)/1400,
    // hence i = 1/v − 1 ≈ 0.1232125.
    const irr = internalRateOfReturn([
      { time: 0, amount: -1000 },
      { time: 1, amount: 500 },
      { time: 2, amount: 700 },
    ]);
    expect(irr).not.toBeNull();
    if (irr !== null) {
      const v = (-500 + Math.sqrt(3_050_000)) / 1400;
      expect(irr).toBeCloseTo(1 / v - 1, 8);
    }
  });

  it("computes Macaulay duration of a zero-coupon bond as its maturity", () => {
    const valuation = valueCashFlows([{ time: 7, amount: 1000 }], 0.04);
    expect(valuation.macaulayDuration).toBeCloseTo(7, 8);
    expect(valuation.modifiedDuration).toBeCloseTo(7 / 1.04, 8);
  });
});

describe("Monte Carlo simulation", () => {
  it("is reproducible for a fixed seed", () => {
    const config = {
      kind: "pi-estimation",
      paths: 20_000,
      seed: 42,
    } as const;

    const first = createSimulation(config);
    first.runBatch(20_000);
    const second = createSimulation(config);
    second.runBatch(20_000);

    expect(first.finish(0).mean).toBe(second.finish(0).mean);
  });

  it("estimates π within its own confidence interval", () => {
    const simulation = createSimulation({ kind: "pi-estimation", paths: 200_000, seed: 7 });
    simulation.runBatch(200_000);
    const summary = simulation.finish(0);
    expect(summary.mean).toBeGreaterThan(3.10);
    expect(summary.mean).toBeLessThan(3.18);
    expect(summary.confidenceInterval[0]).toBeLessThan(Math.PI);
    expect(summary.confidenceInterval[1]).toBeGreaterThan(Math.PI);
  });

  it("prices a block of whole-life policies close to the analytic EPV", () => {
    const mu = 0.03;
    const delta = 0.05;
    const policies = 1;
    const benefit = 1;
    const simulation = createSimulation({
      kind: "actuarial-reserve",
      paths: 60_000,
      seed: 2026,
      age: 40,
      policies,
      benefit,
      forceOfInterest: delta,
      survival: { kind: "exponential", mu },
    });
    simulation.runBatch(60_000);
    const summary = simulation.finish(0);

    // E[e^{-δT}] = μ/(μ+δ) for a constant force of mortality.
    const analytic = mu / (mu + delta);
    expect(Math.abs(summary.mean - analytic)).toBeLessThan(0.01);
  });

  it("reproduces the GBM lognormal mean E[S_T] = S₀e^{μT}", () => {
    const simulation = createSimulation({
      kind: "geometric-brownian-motion",
      paths: 120_000,
      seed: 99,
      spot: 100,
      drift: 0.07,
      volatility: 0.2,
      horizonYears: 1,
      steps: 12,
    });
    simulation.runBatch(120_000);
    const summary = simulation.finish(0);
    const analytic = 100 * Math.exp(0.07);
    expect(Math.abs(summary.mean - analytic)).toBeLessThan(1.0);
  });

  it("produces a histogram whose counts sum to the path count", () => {
    const simulation = createSimulation({
      kind: "geometric-brownian-motion",
      paths: 5000,
      seed: 3,
      spot: 50,
      drift: 0.03,
      volatility: 0.25,
      horizonYears: 2,
      steps: 24,
    });
    simulation.runBatch(5000);
    const summary = simulation.finish(0);
    const total = summary.histogram.reduce((sum, bin) => sum + bin.count, 0);
    expect(total).toBe(5000);
  });
});

describe("Central Limit Theorem", () => {
  it("samples each distribution with the right mean and variance", () => {
    const cases: readonly DistributionParameters[] = [
      { kind: "normal", mu: 3, sigma: 2 },
      { kind: "exponential", lambda: 0.5 },
      { kind: "uniform", a: -2, b: 6 },
      { kind: "gamma", shape: 3, rate: 2 },
      { kind: "gamma", shape: 0.4, rate: 1 },
      { kind: "weibull", shape: 2, scale: 3 },
      { kind: "lognormal", mu: 0, sigma: 0.5 },
      { kind: "poisson", lambda: 4 },
      { kind: "binomial", n: 12, p: 0.3 },
      { kind: "geometric", p: 0.25 },
    ];

    for (const parameters of cases) {
      const random = new SeededRandom(4242);
      const draws: number[] = [];
      for (let i = 0; i < 40_000; i += 1) {
        draws.push(sampleDistributionValue(parameters, random));
      }

      const empiricalMean = draws.reduce((sum, value) => sum + value, 0) / draws.length;
      const empiricalVariance =
        draws.reduce((sum, value) => sum + (value - empiricalMean) ** 2, 0) / (draws.length - 1);

      const { mean, variance } = distributionMoments(parameters);

      // Within 4 standard errors of the theoretical mean.
      const standardError = Math.sqrt(variance / draws.length);
      expect(Math.abs(empiricalMean - mean)).toBeLessThan(4 * standardError + 1e-9);
      // Variance within 8% is ample for 40k draws across these shapes.
      expect(Math.abs(empiricalVariance - variance) / variance).toBeLessThan(0.08);
    }
  });

  it("predicts the sampling distribution's centre and spread", () => {
    const population: DistributionParameters = { kind: "exponential", lambda: 1 };
    const prediction = centralLimitPrediction(population, 25);
    expect(prediction.mean).toBeCloseTo(1, 10);
    // σ = 1 for Exponential(1), so the standard error is 1/√25 = 0.2.
    expect(prediction.standardError).toBeCloseTo(0.2, 10);
  });

  it("reproduces σ/√n from a strongly skewed population", () => {
    const population: DistributionParameters = { kind: "exponential", lambda: 1 };

    for (const sampleSize of [1, 5, 30]) {
      const simulation = createSimulation({
        kind: "central-limit-theorem",
        paths: 60_000,
        seed: 1234,
        sampleSize,
        population,
      });
      simulation.runBatch(60_000);
      const summary = simulation.finish(0);
      const prediction = centralLimitPrediction(population, sampleSize);

      expect(Math.abs(summary.mean - prediction.mean)).toBeLessThan(0.02);
      // The simulated spread must match σ/√n to within a few percent.
      expect(
        Math.abs(summary.standardDeviation - prediction.standardError) /
          prediction.standardError,
      ).toBeLessThan(0.05);
    }
  });

  it("drives the sampling distribution toward symmetry as n grows", () => {
    const population: DistributionParameters = { kind: "exponential", lambda: 1 };

    const skewAt = (sampleSize: number): number => {
      const random = new SeededRandom(77);
      const means: number[] = [];
      for (let path = 0; path < 20_000; path += 1) {
        let total = 0;
        for (let i = 0; i < sampleSize; i += 1) {
          total += sampleDistributionValue(population, random);
        }
        means.push(total / sampleSize);
      }
      const mean = means.reduce((sum, value) => sum + value, 0) / means.length;
      const sd = Math.sqrt(
        means.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (means.length - 1),
      );
      return (
        means.reduce((sum, value) => sum + ((value - mean) / sd) ** 3, 0) / means.length
      );
    };

    // Exponential(1) has skewness 2; averaging drives it toward 0 as 2/√n.
    const skew1 = Math.abs(skewAt(1));
    const skew30 = Math.abs(skewAt(30));
    expect(skew1).toBeGreaterThan(1.5);
    expect(skew30).toBeLessThan(0.5);
    expect(skew30).toBeLessThan(skew1);
  });

  it("rejects an out-of-range sample size", () => {
    const result = validateSimulationConfig({
      kind: "central-limit-theorem",
      paths: 100,
      seed: 1,
      sampleSize: 0,
      population: { kind: "normal", mu: 0, sigma: 1 },
    });
    expect(result.ok).toBe(false);
  });
});
