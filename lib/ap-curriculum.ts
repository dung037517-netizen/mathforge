/**
 * AP Calculus AB/BC and AP Statistics curriculum map.
 *
 * Each entry is a real exam-style prompt that the engine can actually solve —
 * clicking one loads it into the solver and produces the full step-by-step
 * derivation, so the platform teaches the method rather than just printing an
 * answer.
 *
 * The `actuarialLink` field is the point of the whole project: it names the
 * professional technique each high-school topic turns into. Related rates
 * become sensitivity analysis; improper integrals become the expected present
 * value of a life annuity.
 */

export type ApCourse = "Calculus AB" | "Calculus BC" | "Statistics";

export type ApUnit =
  | "Limits & Continuity"
  | "Differentiation"
  | "Applications of Differentiation"
  | "Integration"
  | "Applications of Integration"
  | "Series"
  | "Probability & Distributions"
  | "Sampling Distributions"
  | "Inference";

export interface ApProblem {
  readonly id: string;
  readonly course: ApCourse;
  readonly unit: ApUnit;
  /** Short exam-style title. */
  readonly title: string;
  /** The prompt, in plain language. */
  readonly prompt: string;
  /** LaTeX statement of the problem. */
  readonly latex: string;
  /** Expression loaded into the solver, in the engine's infix syntax. */
  readonly expression: string;
  /** Which solver mode this problem is posed in. */
  readonly mode: "derivative" | "integral";
  /** Integration limits, when the mode is `integral`. */
  readonly lower?: number;
  readonly upper?: number;
  /** How this topic reappears in actuarial or quantitative practice. */
  readonly actuarialLink: string;
}

export const AP_PROBLEMS: readonly ApProblem[] = [
  {
    id: "ab-power-rule",
    course: "Calculus AB",
    unit: "Differentiation",
    title: "Polynomial derivative",
    prompt: "Differentiate a cubic polynomial using the power and sum rules.",
    latex: "\\frac{d}{dx}\\left[x^3 - 4x^2 + 7x - 2\\right]",
    expression: "x^3 - 4*x^2 + 7*x - 2",
    mode: "derivative",
    actuarialLink:
      "Polynomial fits approximate mortality and lapse rates between the ages a life table actually tabulates.",
  },
  {
    id: "ab-product-rule",
    course: "Calculus AB",
    unit: "Differentiation",
    title: "Product rule",
    prompt: "Differentiate a product of a polynomial and a trigonometric function.",
    latex: "\\frac{d}{dx}\\left[x^2\\sin x\\right]",
    expression: "x^2 * sin(x)",
    mode: "derivative",
    actuarialLink:
      "Any reserve written as (amount) × (probability) needs the product rule to find its sensitivity.",
  },
  {
    id: "ab-quotient-rule",
    course: "Calculus AB",
    unit: "Differentiation",
    title: "Quotient rule",
    prompt: "Differentiate a quotient where both parts depend on x.",
    latex: "\\frac{d}{dx}\\left[\\frac{\\ln x}{x}\\right]",
    expression: "ln(x) / x",
    mode: "derivative",
    actuarialLink:
      "Loss ratios and funded ratios are quotients; their rate of change drives every solvency trigger.",
  },
  {
    id: "ab-chain-rule",
    course: "Calculus AB",
    unit: "Differentiation",
    title: "Chain rule",
    prompt: "Differentiate a composite function — the normal density's kernel.",
    latex: "\\frac{d}{dx}\\left[e^{-x^2/2}\\right]",
    expression: "exp(-x^2 / 2)",
    mode: "derivative",
    actuarialLink:
      "This exact function is the standard normal density, the backbone of Value at Risk and option pricing.",
  },
  {
    id: "bc-logarithmic",
    course: "Calculus BC",
    unit: "Differentiation",
    title: "Logarithmic differentiation",
    prompt: "Differentiate a function where x appears in both the base and the exponent.",
    latex: "\\frac{d}{dx}\\left[x^x\\right]",
    expression: "x^x",
    mode: "derivative",
    actuarialLink:
      "Take logs first — the same trick that turns compound-interest growth into a linear relationship.",
  },
  {
    id: "ab-related-rates",
    course: "Calculus AB",
    unit: "Applications of Differentiation",
    title: "Exponential decay rate",
    prompt: "Differentiate a decay model to find its instantaneous rate of change.",
    latex: "\\frac{d}{dx}\\left[100e^{-0.05x}\\right]",
    expression: "100 * exp(-0.05 * x)",
    mode: "derivative",
    actuarialLink:
      "e^(−δt) is the discount factor; its derivative is how a bond's price moves with time — duration.",
  },
  {
    id: "ab-definite-integral",
    course: "Calculus AB",
    unit: "Integration",
    title: "Definite integral of a polynomial",
    prompt: "Evaluate a definite integral using the Fundamental Theorem of Calculus.",
    latex: "\\int_{0}^{3} x^2\\,dx",
    expression: "x^2",
    mode: "integral",
    lower: 0,
    upper: 3,
    actuarialLink:
      "Accumulating a continuously varying quantity over time is exactly how continuous annuities are valued.",
  },
  {
    id: "ab-area-trig",
    course: "Calculus AB",
    unit: "Applications of Integration",
    title: "Area under a sine curve",
    prompt: "Find the area between the sine curve and the x-axis over one arch.",
    latex: "\\int_{0}^{\\pi} \\sin x\\,dx = 2",
    expression: "sin(x)",
    mode: "integral",
    lower: 0,
    upper: 3.14159265358979,
    actuarialLink:
      "A known closed-form answer (exactly 2) makes this the standard check that a quadrature routine is correct.",
  },
  {
    id: "stat-normal-area",
    course: "Statistics",
    unit: "Probability & Distributions",
    title: "Normal probability as an area",
    prompt: "Integrate the standard normal density between two z-scores.",
    latex: "\\int_{-1.96}^{1.96} \\frac{1}{\\sqrt{2\\pi}}e^{-z^2/2}\\,dz \\approx 0.95",
    expression: "normpdf(x)",
    mode: "integral",
    lower: -1.96,
    upper: 1.96,
    actuarialLink:
      "The 95% interval every confidence statement rests on — and the 1.96 in a parametric VaR.",
  },
  {
    id: "stat-exponential-mean",
    course: "Statistics",
    unit: "Probability & Distributions",
    title: "Expected value by integration",
    prompt: "Compute E[X] for an exponential distribution with rate 1 by integrating x·f(x).",
    latex: "\\mathbb{E}[X] = \\int_{0}^{\\infty} x\\lambda e^{-\\lambda x}\\,dx = \\frac{1}{\\lambda}",
    expression: "x * exp(-x)",
    mode: "integral",
    lower: 0,
    upper: 40,
    actuarialLink:
      "Under a constant force of mortality this integral is the complete expectation of life, e̊ₓ = 1/μ.",
  },
  {
    id: "bc-improper",
    course: "Calculus BC",
    unit: "Applications of Integration",
    title: "Improper integral (annuity value)",
    prompt: "Evaluate a discounted perpetuity as an improper integral.",
    latex: "\\int_{0}^{\\infty} e^{-0.05t}\\,dt = \\frac{1}{0.05} = 20",
    expression: "exp(-0.05 * x)",
    mode: "integral",
    lower: 0,
    upper: 400,
    actuarialLink:
      "This is ā for a perpetuity: the present value of 1 per year forever, discounted at δ = 5%.",
  },
  {
    id: "bc-series-term",
    course: "Calculus BC",
    unit: "Series",
    title: "Taylor coefficient",
    prompt: "Differentiate e^x·cos(x), whose Taylor expansion mixes two familiar series.",
    latex: "\\frac{d}{dx}\\left[e^{x}\\cos x\\right]",
    expression: "exp(x) * cos(x)",
    mode: "derivative",
    actuarialLink:
      "Series expansions are how Cornish-Fisher corrects a normal quantile for skewness and kurtosis.",
  },
];

/** Course filter chips shown above the problem grid. */
export const AP_COURSES: readonly ApCourse[] = ["Calculus AB", "Calculus BC", "Statistics"];

/** The problem the platform opens with, so nothing is ever blank. */
export const DEFAULT_AP_PROBLEM: ApProblem =
  AP_PROBLEMS.find((problem) => problem.id === "ab-product-rule") ?? AP_PROBLEMS[0];
