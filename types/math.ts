/**
 * MathForge — core domain types.
 *
 * Everything the computation engine speaks is declared here: the expression
 * grammar, linear-algebra containers, probability distributions, actuarial
 * survival models, and the message protocol used to talk to the simulation
 * Web Worker. No `any` appears anywhere in this file (or in any module that
 * consumes it) — failure states are modelled as discriminated unions instead.
 */

/* ------------------------------------------------------------------ */
/* Result envelope                                                     */
/* ------------------------------------------------------------------ */

/** A computation that either produced a value or a structured failure. */
export type Result<TValue, TError = EngineError> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly error: TError };

/** Categories of failure the engine can report to the UI. */
export type EngineErrorCode =
  | "LEX_ERROR"
  | "PARSE_ERROR"
  | "EVAL_ERROR"
  | "DOMAIN_ERROR"
  | "DIMENSION_ERROR"
  | "SINGULAR_MATRIX"
  | "UNSUPPORTED_OPERATION"
  | "CONVERGENCE_FAILURE";

export interface EngineError {
  readonly code: EngineErrorCode;
  /** Human-readable, safe to render directly in the UI. */
  readonly message: string;
  /** Zero-based offset into the source string, when the failure is positional. */
  readonly position?: number;
  /** The offending token or symbol, when known. */
  readonly token?: string;
}

/* ------------------------------------------------------------------ */
/* Lexing                                                              */
/* ------------------------------------------------------------------ */

export type TokenType =
  | "number"
  | "identifier"
  | "operator"
  | "lparen"
  | "rparen"
  | "comma"
  | "eof";

export interface Token {
  readonly type: TokenType;
  readonly value: string;
  readonly position: number;
}

/* ------------------------------------------------------------------ */
/* Expression grammar (AST)                                            */
/* ------------------------------------------------------------------ */

export type BinaryOperator = "+" | "-" | "*" | "/" | "^";
export type UnaryOperator = "-" | "+";

/** Named constants recognised by the lexer. */
export const MATH_CONSTANTS = ["pi", "e", "phi"] as const;
export type ConstantName = (typeof MATH_CONSTANTS)[number];

/** Built-in unary/binary functions the evaluator understands. */
export const MATH_FUNCTIONS = [
  "sin",
  "cos",
  "tan",
  "sec",
  "csc",
  "cot",
  "asin",
  "acos",
  "atan",
  "sinh",
  "cosh",
  "tanh",
  "exp",
  "ln",
  "log",
  "log10",
  "sqrt",
  "cbrt",
  "abs",
  "sign",
  "floor",
  "ceil",
  "round",
  "gamma",
  "lgamma",
  "erf",
  "erfc",
  "normpdf",
  "normcdf",
  "min",
  "max",
  "pow",
] as const;
export type FunctionName = (typeof MATH_FUNCTIONS)[number];

export interface NumberNode {
  readonly kind: "number";
  readonly value: number;
}

export interface ConstantNode {
  readonly kind: "constant";
  readonly name: ConstantName;
}

export interface VariableNode {
  readonly kind: "variable";
  readonly name: string;
}

export interface UnaryNode {
  readonly kind: "unary";
  readonly operator: UnaryOperator;
  readonly operand: ExpressionNode;
}

export interface BinaryNode {
  readonly kind: "binary";
  readonly operator: BinaryOperator;
  readonly left: ExpressionNode;
  readonly right: ExpressionNode;
}

export interface CallNode {
  readonly kind: "call";
  readonly callee: FunctionName;
  readonly args: readonly ExpressionNode[];
}

export type ExpressionNode =
  | NumberNode
  | ConstantNode
  | VariableNode
  | UnaryNode
  | BinaryNode
  | CallNode;

/** Variable bindings supplied at evaluation time. */
export type Scope = Readonly<Record<string, number>>;

/* ------------------------------------------------------------------ */
/* Step-by-step solutions                                              */
/* ------------------------------------------------------------------ */

/** The named rule that justifies a derivation step. */
export type DerivationRule =
  | "constant-rule"
  | "power-rule"
  | "sum-rule"
  | "difference-rule"
  | "product-rule"
  | "quotient-rule"
  | "chain-rule"
  | "exponential-rule"
  | "logarithmic-rule"
  | "trigonometric-rule"
  | "generalised-power-rule"
  | "simplification"
  | "substitution"
  | "numerical-method"
  | "definition";

export interface SolutionStep {
  /** Stable identity for React keys and accordion state. */
  readonly id: string;
  /** Short imperative title, e.g. "Apply the product rule". */
  readonly title: string;
  /** Prose explanation of what happens and why. */
  readonly explanation: string;
  /** Display-mode LaTeX for the state of the expression after this step. */
  readonly latex: string;
  /** The rule invoked, used for the badge shown next to the step. */
  readonly rule: DerivationRule;
  /** Nested sub-derivations (e.g. the two halves of a product rule). */
  readonly substeps?: readonly SolutionStep[];
}

export type SolutionKind =
  | "derivative"
  | "integral"
  | "evaluation"
  | "matrix"
  | "survival"
  | "annuity";

export interface Solution {
  readonly kind: SolutionKind;
  /** LaTeX of the original problem statement. */
  readonly problem: string;
  /** LaTeX of the final answer. */
  readonly result: string;
  /** Numeric answer when the problem reduces to a scalar. */
  readonly numeric?: number;
  readonly steps: readonly SolutionStep[];
}

/* ------------------------------------------------------------------ */
/* Linear algebra                                                      */
/* ------------------------------------------------------------------ */

export interface Matrix {
  readonly rows: number;
  readonly cols: number;
  /** Row-major, `rows` arrays of length `cols`. */
  readonly data: readonly (readonly number[])[];
}

export interface LuDecomposition {
  readonly lower: Matrix;
  readonly upper: Matrix;
  /** Row permutation applied during partial pivoting. */
  readonly permutation: readonly number[];
  /** (-1)^(number of row swaps) — the sign correction for the determinant. */
  readonly sign: 1 | -1;
}

export interface MatrixAnalysis {
  readonly matrix: Matrix;
  readonly isSquare: boolean;
  readonly determinant: number | null;
  readonly rank: number;
  readonly trace: number | null;
  readonly transpose: Matrix;
  readonly inverse: Matrix | null;
  readonly conditionEstimate: number | null;
  /** Real eigenvalues, populated for symmetric matrices via the Jacobi method. */
  readonly eigenvalues: readonly number[] | null;
}

/* ------------------------------------------------------------------ */
/* Probability distributions                                           */
/* ------------------------------------------------------------------ */

export type ContinuousDistributionKind =
  | "normal"
  | "lognormal"
  | "exponential"
  | "uniform"
  | "gamma"
  | "weibull";

export type DiscreteDistributionKind = "binomial" | "poisson" | "geometric";

export type DistributionKind = ContinuousDistributionKind | DiscreteDistributionKind;

/**
 * Distribution parameters are a closed union so the engine can exhaustively
 * switch on `kind` and the UI can render exactly the right controls.
 */
export type DistributionParameters =
  | { readonly kind: "normal"; readonly mu: number; readonly sigma: number }
  | { readonly kind: "lognormal"; readonly mu: number; readonly sigma: number }
  | { readonly kind: "exponential"; readonly lambda: number }
  | { readonly kind: "uniform"; readonly a: number; readonly b: number }
  | { readonly kind: "gamma"; readonly shape: number; readonly rate: number }
  | { readonly kind: "weibull"; readonly shape: number; readonly scale: number }
  | { readonly kind: "binomial"; readonly n: number; readonly p: number }
  | { readonly kind: "poisson"; readonly lambda: number }
  | { readonly kind: "geometric"; readonly p: number };

export interface DistributionMoments {
  readonly mean: number;
  readonly variance: number;
  readonly standardDeviation: number;
  readonly skewness: number;
  readonly excessKurtosis: number;
}

export interface DistributionSample {
  readonly x: number;
  /** Density for continuous kinds, probability mass for discrete kinds. */
  readonly density: number;
  readonly cumulative: number;
}

/* ------------------------------------------------------------------ */
/* Actuarial survival models                                           */
/* ------------------------------------------------------------------ */

export type SurvivalModelKind = "exponential" | "gompertz" | "makeham" | "deMoivre" | "weibull";

/**
 * Classical parametric mortality laws.
 *
 *  - exponential : constant force  μ(x) = μ
 *  - gompertz    : μ(x) = B·c^x
 *  - makeham     : μ(x) = A + B·c^x
 *  - deMoivre    : uniform lifetime on [0, ω]
 *  - weibull     : μ(x) = (k/λ)·(x/λ)^(k-1)
 */
export type SurvivalModelParameters =
  | { readonly kind: "exponential"; readonly mu: number }
  | { readonly kind: "gompertz"; readonly b: number; readonly c: number }
  | { readonly kind: "makeham"; readonly a: number; readonly b: number; readonly c: number }
  | { readonly kind: "deMoivre"; readonly omega: number }
  | { readonly kind: "weibull"; readonly shape: number; readonly scale: number };

export interface SurvivalCurvePoint {
  /** Attained age x. */
  readonly age: number;
  /** S(x) — probability a newborn survives to age x. */
  readonly survival: number;
  /** μ(x) — instantaneous force of mortality at age x. */
  readonly hazard: number;
  /** f(x) = S(x)·μ(x) — density of the age at death. */
  readonly density: number;
  /** ₜp_x measured from the currently selected base age. */
  readonly conditionalSurvival: number;
}

export interface LifeContingencyResult {
  /** Base age x. */
  readonly age: number;
  /** ₜp_x for the selected projection horizon t. */
  readonly tPx: number;
  /** ₜq_x = 1 − ₜp_x. */
  readonly tQx: number;
  /** Complete expectation of future lifetime, e̊_x. */
  readonly lifeExpectancy: number;
  /** Curtate expectation of future lifetime, e_x. */
  readonly curtateExpectation: number;
  /** Ā_x — EPV of a whole-life insurance of 1 payable at death. */
  readonly wholeLifeInsurance: number;
  /** ā_x — EPV of a continuous whole-life annuity of 1 per year. */
  readonly lifeAnnuity: number;
  /** Continuous net annual premium P̄(Ā_x) = Ā_x / ā_x. */
  readonly netPremium: number;
  /** Force of interest δ used for the discounting above. */
  readonly forceOfInterest: number;
}

/* ------------------------------------------------------------------ */
/* Interest theory                                                     */
/* ------------------------------------------------------------------ */

export type CompoundingFrequency = 1 | 2 | 4 | 12 | 52 | 365 | "continuous";

export interface CompoundInterestInput {
  readonly principal: number;
  /** Nominal annual rate as a decimal, e.g. 0.055 for 5.5%. */
  readonly annualRate: number;
  readonly years: number;
  readonly frequency: CompoundingFrequency;
  /** Optional level deposit made at each compounding date. */
  readonly contribution?: number;
  /** Whether contributions land at the start (annuity-due) or end of a period. */
  readonly contributionTiming?: "begin" | "end";
}

export interface CompoundInterestResult {
  readonly futureValue: number;
  readonly totalContributed: number;
  readonly interestEarned: number;
  /** Annual effective rate implied by the nominal rate and frequency. */
  readonly effectiveAnnualRate: number;
  readonly schedule: readonly {
    readonly period: number;
    readonly year: number;
    readonly openingBalance: number;
    readonly contribution: number;
    readonly interest: number;
    readonly closingBalance: number;
  }[];
}

export interface CashFlow {
  /** Time in years from valuation date. */
  readonly time: number;
  readonly amount: number;
}

export interface CashFlowValuation {
  readonly presentValue: number;
  readonly futureValue: number;
  /** Macaulay duration in years. */
  readonly macaulayDuration: number;
  /** Modified duration = Macaulay / (1 + i). */
  readonly modifiedDuration: number;
  readonly convexity: number;
  /** Internal rate of return, or null when no sign change makes one exist. */
  readonly internalRateOfReturn: number | null;
}

/* ------------------------------------------------------------------ */
/* Monte Carlo simulation                                              */
/* ------------------------------------------------------------------ */

export type SimulationKind =
  | "actuarial-reserve"
  | "geometric-brownian-motion"
  | "pi-estimation"
  | "central-limit-theorem";

export interface ActuarialReserveConfig {
  readonly kind: "actuarial-reserve";
  readonly paths: number;
  readonly seed: number;
  /** Age of every life in the modelled cohort. */
  readonly age: number;
  /** Number of independent lives in the block of business. */
  readonly policies: number;
  /** Death benefit paid at the moment of death. */
  readonly benefit: number;
  readonly forceOfInterest: number;
  readonly survival: SurvivalModelParameters;
}

export interface GeometricBrownianMotionConfig {
  readonly kind: "geometric-brownian-motion";
  readonly paths: number;
  readonly seed: number;
  readonly spot: number;
  readonly drift: number;
  readonly volatility: number;
  readonly horizonYears: number;
  readonly steps: number;
}

export interface PiEstimationConfig {
  readonly kind: "pi-estimation";
  readonly paths: number;
  readonly seed: number;
}

/**
 * Central Limit Theorem demonstration — the AP Statistics headline result.
 *
 * Each "path" draws `sampleSize` observations from `population` and records
 * their mean. As `sampleSize` grows, the distribution of those means approaches
 * Normal(μ, σ/√n) regardless of how skewed the population is.
 */
export interface CentralLimitConfig {
  readonly kind: "central-limit-theorem";
  readonly paths: number;
  readonly seed: number;
  /** Observations averaged per sample, the `n` in σ/√n. */
  readonly sampleSize: number;
  readonly population: DistributionParameters;
}

export type SimulationConfig =
  | ActuarialReserveConfig
  | GeometricBrownianMotionConfig
  | PiEstimationConfig
  | CentralLimitConfig;

export interface HistogramBin {
  readonly start: number;
  readonly end: number;
  readonly count: number;
  readonly density: number;
}

export interface SimulationSummary {
  readonly kind: SimulationKind;
  readonly paths: number;
  readonly mean: number;
  readonly standardDeviation: number;
  /** Standard error of the mean, σ/√n — the honest precision of the estimate. */
  readonly standardError: number;
  /** 95% confidence interval for the mean. */
  readonly confidenceInterval: readonly [number, number];
  readonly median: number;
  readonly min: number;
  readonly max: number;
  /** Selected quantiles keyed by probability level. */
  readonly quantiles: readonly { readonly level: number; readonly value: number }[];
  readonly histogram: readonly HistogramBin[];
  /** Wall-clock duration of the simulation in milliseconds. */
  readonly elapsedMs: number;
}

/* ------------------------------------------------------------------ */
/* Worker protocol                                                     */
/* ------------------------------------------------------------------ */

export interface SimulationRunRequest {
  readonly type: "run";
  readonly requestId: string;
  readonly config: SimulationConfig;
}

export interface SimulationCancelRequest {
  readonly type: "cancel";
  readonly requestId: string;
}

export type SimulationRequest = SimulationRunRequest | SimulationCancelRequest;

export interface SimulationProgressMessage {
  readonly type: "progress";
  readonly requestId: string;
  /** Fraction complete in [0, 1]. */
  readonly progress: number;
  readonly completedPaths: number;
}

export interface SimulationDoneMessage {
  readonly type: "done";
  readonly requestId: string;
  readonly summary: SimulationSummary;
}

export interface SimulationErrorMessage {
  readonly type: "error";
  readonly requestId: string;
  readonly error: EngineError;
}

export interface SimulationCancelledMessage {
  readonly type: "cancelled";
  readonly requestId: string;
}

export type SimulationResponse =
  | SimulationProgressMessage
  | SimulationDoneMessage
  | SimulationErrorMessage
  | SimulationCancelledMessage;

/* ------------------------------------------------------------------ */
/* Plotting                                                            */
/* ------------------------------------------------------------------ */

export interface PlotPoint {
  readonly x: number;
  /** `null` marks a discontinuity so the chart breaks the line instead of
   *  drawing a vertical artefact through an asymptote. */
  readonly y: number | null;
}

export interface PlotSeries {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly points: readonly PlotPoint[];
}

export interface PlotWindow {
  readonly xMin: number;
  readonly xMax: number;
  readonly samples: number;
}
