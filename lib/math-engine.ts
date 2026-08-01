/**
 * MathForge — computation engine.
 *
 * A dependency-free implementation of everything the workbench computes:
 *
 *   1. Lexer / recursive-descent parser for infix mathematical notation
 *   2. Evaluator and LaTeX serialiser over the resulting AST
 *   3. Symbolic differentiation that emits a human-readable derivation
 *   4. Adaptive Simpson quadrature for definite integrals
 *   5. Dense linear algebra: LU determinant, Gauss-Jordan inverse, RREF rank,
 *      Jacobi eigenvalues for symmetric matrices
 *   6. Special functions (log-gamma, regularised incomplete gamma, erf/erfc,
 *      probit) and the probability distributions built on them
 *   7. Parametric survival models and the life-contingency functions
 *      (ₜp_x, e̊_x, Ā_x, ā_x) derived from them
 *   8. Interest theory: compound accumulation, cash-flow valuation, IRR
 *   9. A seeded RNG and a *batched, resumable* Monte Carlo runner, which is
 *      what lets long simulations execute without ever blocking the UI thread
 *
 * Deliberately free of external dependencies so the numerical behaviour is
 * fully auditable and identical in the browser, in the Web Worker, and in the
 * Node test runner.
 */

import type {
  ActuarialReserveConfig,
  BinaryNode,
  BinaryOperator,
  CallNode,
  CashFlow,
  CashFlowValuation,
  CompoundInterestInput,
  CompoundInterestResult,
  CompoundingFrequency,
  ConstantName,
  DerivationRule,
  DistributionMoments,
  DistributionParameters,
  DistributionSample,
  EngineError,
  EngineErrorCode,
  ExpressionNode,
  FunctionName,
  GeometricBrownianMotionConfig,
  HistogramBin,
  LifeContingencyResult,
  LuDecomposition,
  Matrix,
  MatrixAnalysis,
  PlotPoint,
  PlotWindow,
  Result,
  Scope,
  SimulationConfig,
  SimulationSummary,
  Solution,
  SolutionStep,
  SurvivalCurvePoint,
  SurvivalModelParameters,
  Token,
} from "@/types/math";
import { MATH_CONSTANTS, MATH_FUNCTIONS } from "@/types/math";

/* ================================================================== */
/* Result helpers                                                      */
/* ================================================================== */

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T>(
  code: EngineErrorCode,
  message: string,
  position?: number,
  token?: string,
): Result<T> {
  const error: EngineError =
    position === undefined
      ? token === undefined
        ? { code, message }
        : { code, message, token }
      : token === undefined
        ? { code, message, position }
        : { code, message, position, token };
  return { ok: false, error };
}

const CONSTANT_SET: ReadonlySet<string> = new Set<string>(MATH_CONSTANTS);
const FUNCTION_SET: ReadonlySet<string> = new Set<string>(MATH_FUNCTIONS);

function isConstantName(name: string): name is ConstantName {
  return CONSTANT_SET.has(name);
}

function isFunctionName(name: string): name is FunctionName {
  return FUNCTION_SET.has(name);
}

/** Canonical spellings for aliases users habitually type. */
const FUNCTION_ALIASES: Readonly<Record<string, FunctionName>> = {
  arcsin: "asin",
  arccos: "acos",
  arctan: "atan",
  ln: "ln",
  loge: "ln",
  lg: "log10",
  Phi: "normcdf",
  phi_pdf: "normpdf",
};

/* ================================================================== */
/* 1. Lexer                                                            */
/* ================================================================== */

const OPERATOR_CHARS = "+-*/^";

/** Tokenise an infix expression. Whitespace is insignificant. */
export function tokenize(source: string): Result<Token[]> {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    const char = source[i];

    if (char === " " || char === "\t" || char === "\n" || char === "\r") {
      i += 1;
      continue;
    }

    if (char >= "0" && char <= "9") {
      const start = i;
      let seenDot = false;
      let seenExponent = false;
      while (i < source.length) {
        const c = source[i];
        if (c >= "0" && c <= "9") {
          i += 1;
        } else if (c === "." && !seenDot && !seenExponent) {
          seenDot = true;
          i += 1;
        } else if ((c === "e" || c === "E") && !seenExponent && i + 1 < source.length) {
          // Only treat `e` as a scientific-notation marker when digits follow,
          // otherwise it is Euler's constant in an implicit product like `2e`.
          const next = source[i + 1];
          const afterSign = i + 2 < source.length ? source[i + 2] : "";
          const isExponent =
            (next >= "0" && next <= "9") ||
            ((next === "+" || next === "-") && afterSign >= "0" && afterSign <= "9");
          if (!isExponent) break;
          seenExponent = true;
          i += next === "+" || next === "-" ? 2 : 1;
        } else {
          break;
        }
      }
      const raw = source.slice(start, i);
      const value = Number.parseFloat(raw);
      if (!Number.isFinite(value)) {
        return fail("LEX_ERROR", `"${raw}" is not a valid number.`, start, raw);
      }
      tokens.push({ type: "number", value: raw, position: start });
      continue;
    }

    if (char === "." && i + 1 < source.length && source[i + 1] >= "0" && source[i + 1] <= "9") {
      const start = i;
      i += 1;
      while (i < source.length && source[i] >= "0" && source[i] <= "9") i += 1;
      tokens.push({ type: "number", value: source.slice(start, i), position: start });
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      const start = i;
      while (i < source.length && /[A-Za-z0-9_]/.test(source[i])) i += 1;
      tokens.push({ type: "identifier", value: source.slice(start, i), position: start });
      continue;
    }

    if (OPERATOR_CHARS.includes(char)) {
      tokens.push({ type: "operator", value: char, position: i });
      i += 1;
      continue;
    }

    if (char === "(" || char === "[" || char === "{") {
      tokens.push({ type: "lparen", value: "(", position: i });
      i += 1;
      continue;
    }

    if (char === ")" || char === "]" || char === "}") {
      tokens.push({ type: "rparen", value: ")", position: i });
      i += 1;
      continue;
    }

    if (char === ",") {
      tokens.push({ type: "comma", value: ",", position: i });
      i += 1;
      continue;
    }

    return fail("LEX_ERROR", `Unexpected character "${char}".`, i, char);
  }

  tokens.push({ type: "eof", value: "", position: source.length });
  return ok(tokens);
}

/* ================================================================== */
/* 2. Parser                                                           */
/* ================================================================== */

const BINARY_PRECEDENCE: Readonly<Record<BinaryOperator, number>> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
  "^": 4,
};

/** Arity accepted by each built-in function. */
const FUNCTION_ARITY: Readonly<Record<FunctionName, readonly number[]>> = {
  sin: [1],
  cos: [1],
  tan: [1],
  sec: [1],
  csc: [1],
  cot: [1],
  asin: [1],
  acos: [1],
  atan: [1],
  sinh: [1],
  cosh: [1],
  tanh: [1],
  exp: [1],
  ln: [1],
  log: [1, 2],
  log10: [1],
  sqrt: [1],
  cbrt: [1],
  abs: [1],
  sign: [1],
  floor: [1],
  ceil: [1],
  round: [1],
  gamma: [1],
  lgamma: [1],
  erf: [1],
  erfc: [1],
  normpdf: [1, 3],
  normcdf: [1, 3],
  min: [2],
  max: [2],
  pow: [2],
};

class Parser {
  private index = 0;

  constructor(private readonly tokens: readonly Token[]) {}

  private peek(): Token {
    return this.tokens[this.index];
  }

  private advance(): Token {
    const token = this.tokens[this.index];
    if (token.type !== "eof") this.index += 1;
    return token;
  }

  parse(): Result<ExpressionNode> {
    const expression = this.parseExpression(0);
    if (!expression.ok) return expression;
    const next = this.peek();
    if (next.type !== "eof") {
      return fail(
        "PARSE_ERROR",
        `Unexpected "${next.value}" — check for a missing operator or an extra bracket.`,
        next.position,
        next.value,
      );
    }
    return expression;
  }

  private parseExpression(minPrecedence: number): Result<ExpressionNode> {
    const first = this.parseUnary();
    if (!first.ok) return first;
    let left: ExpressionNode = first.value;

    for (;;) {
      const token = this.peek();

      // Implicit multiplication: `2x`, `3sin(x)`, `(x+1)(x-1)`, `2(x)`.
      if (
        minPrecedence <= 2 &&
        (token.type === "number" || token.type === "identifier" || token.type === "lparen")
      ) {
        const right = this.parseExpression(3);
        if (!right.ok) return right;
        left = binary("*", left, right.value);
        continue;
      }

      if (token.type !== "operator") break;
      const operator = token.value as BinaryOperator;
      const precedence = BINARY_PRECEDENCE[operator];
      if (precedence === undefined || precedence < minPrecedence) break;

      this.advance();
      // `^` is right-associative; every other operator is left-associative.
      const nextMin = operator === "^" ? precedence : precedence + 1;
      const right = this.parseExpression(nextMin);
      if (!right.ok) return right;
      left = binary(operator, left, right.value);
    }

    return ok(left);
  }

  private parseUnary(): Result<ExpressionNode> {
    const token = this.peek();
    if (token.type === "operator" && (token.value === "-" || token.value === "+")) {
      this.advance();
      // Unary binds tighter than +/- but looser than ^, so -x^2 = -(x^2).
      const operand = this.parseExpression(3);
      if (!operand.ok) return operand;
      if (token.value === "+") return operand;
      return ok(negate(operand.value));
    }
    return this.parsePower();
  }

  /** A primary optionally followed by `^`, so that `sin(x)^2` parses. */
  private parsePower(): Result<ExpressionNode> {
    const base = this.parsePrimary();
    if (!base.ok) return base;
    const token = this.peek();
    if (token.type === "operator" && token.value === "^") {
      this.advance();
      const exponent = this.parseUnary();
      if (!exponent.ok) return exponent;
      return ok(binary("^", base.value, exponent.value));
    }
    return base;
  }

  private parsePrimary(): Result<ExpressionNode> {
    const token = this.advance();

    if (token.type === "number") {
      return ok(num(Number.parseFloat(token.value)));
    }

    if (token.type === "lparen") {
      const inner = this.parseExpression(0);
      if (!inner.ok) return inner;
      const closing = this.peek();
      if (closing.type !== "rparen") {
        return fail("PARSE_ERROR", "Missing a closing bracket.", closing.position, closing.value);
      }
      this.advance();
      return inner;
    }

    if (token.type === "identifier") {
      const canonical = FUNCTION_ALIASES[token.value] ?? token.value;

      if (isFunctionName(canonical) && this.peek().type === "lparen") {
        this.advance(); // consume '('
        const args: ExpressionNode[] = [];
        if (this.peek().type !== "rparen") {
          for (;;) {
            const arg = this.parseExpression(0);
            if (!arg.ok) return arg;
            args.push(arg.value);
            if (this.peek().type === "comma") {
              this.advance();
              continue;
            }
            break;
          }
        }
        const closing = this.peek();
        if (closing.type !== "rparen") {
          return fail(
            "PARSE_ERROR",
            `Missing a closing bracket for ${canonical}(…).`,
            closing.position,
            closing.value,
          );
        }
        this.advance();
        const allowed = FUNCTION_ARITY[canonical];
        if (!allowed.includes(args.length)) {
          return fail(
            "PARSE_ERROR",
            `${canonical}() takes ${allowed.join(" or ")} argument(s), received ${args.length}.`,
            token.position,
            canonical,
          );
        }
        return ok(call(canonical, args));
      }

      if (isConstantName(token.value)) {
        return ok({ kind: "constant", name: token.value });
      }

      if (isFunctionName(canonical)) {
        return fail(
          "PARSE_ERROR",
          `${canonical} is a function — write ${canonical}(x).`,
          token.position,
          token.value,
        );
      }

      return ok({ kind: "variable", name: token.value });
    }

    if (token.type === "eof") {
      return fail("PARSE_ERROR", "The expression ends unexpectedly.", token.position);
    }

    return fail(
      "PARSE_ERROR",
      `Unexpected "${token.value}".`,
      token.position,
      token.value,
    );
  }
}

/** Parse an infix expression string into an AST. */
export function parse(source: string): Result<ExpressionNode> {
  const trimmed = source.trim();
  if (trimmed.length === 0) {
    return fail("PARSE_ERROR", "Enter an expression to begin.", 0);
  }
  const tokens = tokenize(trimmed);
  if (!tokens.ok) return tokens;
  return new Parser(tokens.value).parse();
}

/* ================================================================== */
/* AST constructors and structural helpers                             */
/* ================================================================== */

export function num(value: number): ExpressionNode {
  return { kind: "number", value };
}

export function variable(name: string): ExpressionNode {
  return { kind: "variable", name };
}

export function binary(
  operator: BinaryOperator,
  left: ExpressionNode,
  right: ExpressionNode,
): BinaryNode {
  return { kind: "binary", operator, left, right };
}

export function call(callee: FunctionName, args: readonly ExpressionNode[]): CallNode {
  return { kind: "call", callee, args };
}

export function negate(operand: ExpressionNode): ExpressionNode {
  return { kind: "unary", operator: "-", operand };
}

const ZERO = num(0);
const ONE = num(1);

function isNumber(node: ExpressionNode, value?: number): node is { kind: "number"; value: number } {
  return node.kind === "number" && (value === undefined || node.value === value);
}

/** Structural equality — used by the simplifier to cancel matching subtrees. */
export function nodesEqual(a: ExpressionNode, b: ExpressionNode): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "number":
      return a.value === (b as typeof a).value;
    case "constant":
      return a.name === (b as typeof a).name;
    case "variable":
      return a.name === (b as typeof a).name;
    case "unary": {
      const other = b as typeof a;
      return a.operator === other.operator && nodesEqual(a.operand, other.operand);
    }
    case "binary": {
      const other = b as typeof a;
      return (
        a.operator === other.operator &&
        nodesEqual(a.left, other.left) &&
        nodesEqual(a.right, other.right)
      );
    }
    case "call": {
      const other = b as typeof a;
      return (
        a.callee === other.callee &&
        a.args.length === other.args.length &&
        a.args.every((arg, index) => nodesEqual(arg, other.args[index]))
      );
    }
  }
}

/** Collect every free variable name appearing in an expression, sorted. */
export function collectVariables(node: ExpressionNode): string[] {
  const found = new Set<string>();
  const walk = (current: ExpressionNode): void => {
    switch (current.kind) {
      case "variable":
        found.add(current.name);
        return;
      case "unary":
        walk(current.operand);
        return;
      case "binary":
        walk(current.left);
        walk(current.right);
        return;
      case "call":
        current.args.forEach(walk);
        return;
      default:
        return;
    }
  };
  walk(node);
  return [...found].sort();
}

/** True when `node` contains no occurrence of `name`. */
export function isConstantIn(node: ExpressionNode, name: string): boolean {
  return !collectVariables(node).includes(name);
}

/* ================================================================== */
/* 3. Evaluation                                                       */
/* ================================================================== */

const CONSTANT_VALUES: Readonly<Record<ConstantName, number>> = {
  pi: Math.PI,
  e: Math.E,
  phi: (1 + Math.sqrt(5)) / 2,
};

/**
 * Evaluate an AST. Throws `EvaluationError` on unbound variables so the hot
 * plotting loop does not have to allocate a Result per sample; callers that
 * need a Result use {@link evaluate}.
 */
export class EvaluationError extends Error {
  constructor(
    message: string,
    readonly code: EngineErrorCode = "EVAL_ERROR",
  ) {
    super(message);
    this.name = "EvaluationError";
  }
}

export function evaluateNode(node: ExpressionNode, scope: Scope): number {
  switch (node.kind) {
    case "number":
      return node.value;
    case "constant":
      return CONSTANT_VALUES[node.name];
    case "variable": {
      const bound = scope[node.name];
      if (bound === undefined) {
        throw new EvaluationError(`"${node.name}" has no value in the current scope.`);
      }
      return bound;
    }
    case "unary": {
      const value = evaluateNode(node.operand, scope);
      return node.operator === "-" ? -value : value;
    }
    case "binary": {
      const left = evaluateNode(node.left, scope);
      const right = evaluateNode(node.right, scope);
      switch (node.operator) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return left / right;
        case "^":
          return Math.pow(left, right);
      }
    }

    case "call":
      return applyFunction(
        node.callee,
        node.args.map((arg) => evaluateNode(arg, scope)),
      );
  }
}

function applyFunction(name: FunctionName, args: readonly number[]): number {
  const x = args[0];
  switch (name) {
    case "sin":
      return Math.sin(x);
    case "cos":
      return Math.cos(x);
    case "tan":
      return Math.tan(x);
    case "sec":
      return 1 / Math.cos(x);
    case "csc":
      return 1 / Math.sin(x);
    case "cot":
      return 1 / Math.tan(x);
    case "asin":
      return Math.asin(x);
    case "acos":
      return Math.acos(x);
    case "atan":
      return Math.atan(x);
    case "sinh":
      return Math.sinh(x);
    case "cosh":
      return Math.cosh(x);
    case "tanh":
      return Math.tanh(x);
    case "exp":
      return Math.exp(x);
    case "ln":
      return Math.log(x);
    case "log":
      return args.length === 2 ? Math.log(args[1]) / Math.log(x) : Math.log(x);
    case "log10":
      return Math.log10(x);
    case "sqrt":
      return Math.sqrt(x);
    case "cbrt":
      return Math.cbrt(x);
    case "abs":
      return Math.abs(x);
    case "sign":
      return Math.sign(x);
    case "floor":
      return Math.floor(x);
    case "ceil":
      return Math.ceil(x);
    case "round":
      return Math.round(x);
    case "gamma":
      return gammaFunction(x);
    case "lgamma":
      return logGamma(x);
    case "erf":
      return erf(x);
    case "erfc":
      return erfc(x);
    case "normpdf":
      return args.length === 3 ? normalPdf(x, args[1], args[2]) : normalPdf(x, 0, 1);
    case "normcdf":
      return args.length === 3 ? normalCdf(x, args[1], args[2]) : normalCdf(x, 0, 1);
    case "min":
      return Math.min(x, args[1]);
    case "max":
      return Math.max(x, args[1]);
    case "pow":
      return Math.pow(x, args[1]);
  }
}

/** Evaluate an AST, converting thrown failures into a Result. */
export function evaluate(node: ExpressionNode, scope: Scope = {}): Result<number> {
  try {
    return ok(evaluateNode(node, scope));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Evaluation failed.";
    const code = error instanceof EvaluationError ? error.code : "EVAL_ERROR";
    return fail(code, message);
  }
}

/** Parse and evaluate in one call. */
export function evaluateExpression(source: string, scope: Scope = {}): Result<number> {
  const ast = parse(source);
  if (!ast.ok) return ast;
  return evaluate(ast.value, scope);
}

/** Compile an AST into a fast single-variable closure for plotting. */
export function compile(
  node: ExpressionNode,
  variableName: string,
  extraScope: Scope = {},
): (x: number) => number {
  const scope: Record<string, number> = { ...extraScope, [variableName]: 0 };
  return (x: number): number => {
    scope[variableName] = x;
    try {
      return evaluateNode(node, scope);
    } catch {
      return Number.NaN;
    }
  };
}

/* ================================================================== */
/* 4. LaTeX serialisation                                              */
/* ================================================================== */

const LATEX_FUNCTION_NAMES: Readonly<Record<FunctionName, string>> = {
  sin: "\\sin",
  cos: "\\cos",
  tan: "\\tan",
  sec: "\\sec",
  csc: "\\csc",
  cot: "\\cot",
  asin: "\\arcsin",
  acos: "\\arccos",
  atan: "\\arctan",
  sinh: "\\sinh",
  cosh: "\\cosh",
  tanh: "\\tanh",
  exp: "\\exp",
  ln: "\\ln",
  log: "\\log",
  log10: "\\log_{10}",
  sqrt: "\\sqrt",
  cbrt: "\\sqrt[3]",
  abs: "\\left|",
  sign: "\\operatorname{sgn}",
  floor: "\\lfloor",
  ceil: "\\lceil",
  round: "\\operatorname{round}",
  gamma: "\\Gamma",
  lgamma: "\\ln\\Gamma",
  erf: "\\operatorname{erf}",
  erfc: "\\operatorname{erfc}",
  normpdf: "\\varphi",
  normcdf: "\\Phi",
  min: "\\min",
  max: "\\max",
  pow: "\\operatorname{pow}",
};

const GREEK_VARIABLES: ReadonlySet<string> = new Set([
  "alpha",
  "beta",
  "gamma",
  "delta",
  "epsilon",
  "theta",
  "lambda",
  "mu",
  "sigma",
  "tau",
  "omega",
  "rho",
]);

function nodePrecedence(node: ExpressionNode): number {
  switch (node.kind) {
    case "binary":
      return BINARY_PRECEDENCE[node.operator];
    case "unary":
      return 3;
    default:
      return 10;
  }
}

function wrap(node: ExpressionNode, minPrecedence: number): string {
  const rendered = toLatex(node);
  return nodePrecedence(node) < minPrecedence ? `\\left(${rendered}\\right)` : rendered;
}

function formatLatexNumber(value: number): string {
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value);
  if (!Number.isFinite(value)) return value > 0 ? "\\infty" : "-\\infty";
  const magnitude = Math.abs(value);
  if (magnitude !== 0 && (magnitude < 1e-4 || magnitude >= 1e6)) {
    const [mantissa, exponent] = value.toExponential(4).split("e");
    return `${Number.parseFloat(mantissa)} \\times 10^{${Number.parseInt(exponent, 10)}}`;
  }
  return String(Number.parseFloat(value.toPrecision(10)));
}

/** Render an AST as LaTeX suitable for KaTeX. */
export function toLatex(node: ExpressionNode): string {
  switch (node.kind) {
    case "number":
      return formatLatexNumber(node.value);

    case "constant":
      return node.name === "pi" ? "\\pi" : node.name === "phi" ? "\\varphi" : "e";

    case "variable":
      return GREEK_VARIABLES.has(node.name) ? `\\${node.name}` : node.name;

    case "unary":
      return `${node.operator}${wrap(node.operand, 3)}`;

    case "binary": {
      const { operator, left, right } = node;
      if (operator === "/") {
        return `\\frac{${toLatex(left)}}{${toLatex(right)}}`;
      }
      if (operator === "^") {
        return `${wrap(left, 5)}^{${toLatex(right)}}`;
      }
      if (operator === "*") {
        const leftText = wrap(left, 2);
        const rightText = wrap(right, 2);
        // Omit the dot when juxtaposition is unambiguous (e.g. 2x, x\sin x).
        const needsDot = isNumber(right) || right.kind === "number";
        return `${leftText} ${needsDot ? "\\cdot" : ""} ${rightText}`.replace(/\s+/g, " ").trim();
      }
      return `${wrap(left, 1)} ${operator} ${wrap(right, 1)}`;
    }

    case "call": {
      const { callee, args } = node;
      const rendered = args.map((arg) => toLatex(arg));
      switch (callee) {
        case "sqrt":
          return `\\sqrt{${rendered[0]}}`;
        case "cbrt":
          return `\\sqrt[3]{${rendered[0]}}`;
        case "abs":
          return `\\left|${rendered[0]}\\right|`;
        case "floor":
          return `\\left\\lfloor ${rendered[0]} \\right\\rfloor`;
        case "ceil":
          return `\\left\\lceil ${rendered[0]} \\right\\rceil`;
        case "exp":
          return `e^{${rendered[0]}}`;
        case "log":
          return rendered.length === 2
            ? `\\log_{${rendered[0]}}\\left(${rendered[1]}\\right)`
            : `\\log\\left(${rendered[0]}\\right)`;
        default:
          return `${LATEX_FUNCTION_NAMES[callee]}\\left(${rendered.join(", ")}\\right)`;
      }
    }
  }
}

/** Parse a string and render it as LaTeX, or report why it could not parse. */
export function sourceToLatex(source: string): Result<string> {
  const ast = parse(source);
  if (!ast.ok) return ast;
  return ok(toLatex(ast.value));
}

/* ================================================================== */
/* 5. Simplification                                                   */
/* ================================================================== */

/**
 * Apply algebraic identities until a fixed point is reached. This is what
 * keeps derivative output legible: without it, differentiating `x^3` yields
 * `3·x^2·1 + 0·…` instead of `3x^2`.
 */
export function simplify(node: ExpressionNode): ExpressionNode {
  let current = simplifyOnce(node);
  for (let pass = 0; pass < 12; pass += 1) {
    const next = simplifyOnce(current);
    if (nodesEqual(next, current)) return next;
    current = next;
  }
  return current;
}

function simplifyOnce(node: ExpressionNode): ExpressionNode {
  switch (node.kind) {
    case "number":
    case "constant":
    case "variable":
      return node;

    case "unary": {
      const operand = simplifyOnce(node.operand);
      if (node.operator === "+") return operand;
      if (isNumber(operand)) return num(-operand.value);
      if (operand.kind === "unary" && operand.operator === "-") return operand.operand;
      return negate(operand);
    }

    case "call": {
      const args = node.args.map(simplifyOnce);
      if (args.every((arg) => arg.kind === "number")) {
        const value = applyFunction(
          node.callee,
          args.map((arg) => (arg as { kind: "number"; value: number }).value),
        );
        if (Number.isFinite(value)) return num(roundArtifacts(value));
      }
      // ln(e^u) = u and exp(ln u) = u.
      if (node.callee === "ln" && args[0].kind === "call" && args[0].callee === "exp") {
        return args[0].args[0];
      }
      if (node.callee === "exp" && args[0].kind === "call" && args[0].callee === "ln") {
        return args[0].args[0];
      }
      return call(node.callee, args);
    }

    case "binary": {
      const left = simplifyOnce(node.left);
      const right = simplifyOnce(node.right);
      const operator = node.operator;

      if (isNumber(left) && isNumber(right)) {
        const folded = foldConstants(operator, left.value, right.value);
        if (folded !== null) return num(folded);
      }

      switch (operator) {
        case "+":
          if (isNumber(left, 0)) return right;
          if (isNumber(right, 0)) return left;
          if (nodesEqual(left, right)) return binary("*", num(2), left);
          // a + (-b) => a - b
          if (right.kind === "unary" && right.operator === "-") {
            return binary("-", left, right.operand);
          }
          break;

        case "-":
          if (isNumber(right, 0)) return left;
          if (isNumber(left, 0)) return negate(right);
          if (nodesEqual(left, right)) return ZERO;
          break;

        case "*":
          if (isNumber(left, 0) || isNumber(right, 0)) return ZERO;
          if (isNumber(left, 1)) return right;
          if (isNumber(right, 1)) return left;
          if (isNumber(left, -1)) return negate(right);
          if (isNumber(right, -1)) return negate(left);
          // Move numeric factors to the front so `x·3` prints as `3x`.
          if (isNumber(right) && !isNumber(left)) return binary("*", right, left);
          if (nodesEqual(left, right)) return binary("^", left, num(2));
          // (a^m)(a^n) = a^(m+n)
          if (
            left.kind === "binary" &&
            left.operator === "^" &&
            right.kind === "binary" &&
            right.operator === "^" &&
            nodesEqual(left.left, right.left)
          ) {
            return binary("^", left.left, binary("+", left.right, right.right));
          }
          // Fold nested numeric coefficients: c1·(c2·u) = (c1c2)·u
          if (
            isNumber(left) &&
            right.kind === "binary" &&
            right.operator === "*" &&
            isNumber(right.left)
          ) {
            return binary("*", num(left.value * right.left.value), right.right);
          }
          break;

        case "/":
          if (isNumber(right, 1)) return left;
          if (isNumber(left, 0)) return ZERO;
          if (nodesEqual(left, right)) return ONE;
          break;

        case "^":
          if (isNumber(right, 0)) return ONE;
          if (isNumber(right, 1)) return left;
          if (isNumber(left, 1)) return ONE;
          // (a^m)^n = a^(mn) when both exponents are numeric.
          if (
            left.kind === "binary" &&
            left.operator === "^" &&
            isNumber(left.right) &&
            isNumber(right)
          ) {
            return binary("^", left.left, num(left.right.value * right.value));
          }
          break;
      }

      return binary(operator, left, right);
    }
  }
}

function foldConstants(operator: BinaryOperator, left: number, right: number): number | null {
  let value: number;
  switch (operator) {
    case "+":
      value = left + right;
      break;
    case "-":
      value = left - right;
      break;
    case "*":
      value = left * right;
      break;
    case "/":
      if (right === 0) return null;
      value = left / right;
      break;
    case "^":
      value = Math.pow(left, right);
      break;
  }
  return Number.isFinite(value) ? roundArtifacts(value) : null;
}

/** Snap values such as 0.30000000000000004 back to 0.3. */
function roundArtifacts(value: number): number {
  const rounded = Number.parseFloat(value.toPrecision(12));
  return Object.is(rounded, -0) ? 0 : rounded;
}

/* ================================================================== */
/* 6. Symbolic differentiation with a derivation trace                 */
/* ================================================================== */

interface Derivation {
  readonly node: ExpressionNode;
  readonly steps: SolutionStep[];
}

let stepCounter = 0;
function nextStepId(): string {
  stepCounter += 1;
  return `step-${stepCounter}`;
}

function makeStep(
  title: string,
  explanation: string,
  latex: string,
  rule: DerivationRule,
  substeps: readonly SolutionStep[] = [],
): SolutionStep {
  return substeps.length > 0
    ? { id: nextStepId(), title, explanation, latex, rule, substeps }
    : { id: nextStepId(), title, explanation, latex, rule };
}

function derivativeLatex(node: ExpressionNode, variableName: string): string {
  return `\\frac{d}{d${variableName}}\\left[${toLatex(node)}\\right]`;
}

/**
 * Differentiate `node` with respect to `variableName`, recording the rule used
 * at each level of the tree.
 */
export function differentiate(node: ExpressionNode, variableName: string): Derivation {
  const steps: SolutionStep[] = [];
  const result = differentiateNode(node, variableName, steps);
  return { node: simplify(result), steps };
}

function differentiateNode(
  node: ExpressionNode,
  v: string,
  steps: SolutionStep[],
): ExpressionNode {
  switch (node.kind) {
    case "number":
    case "constant":
      return ZERO;

    case "variable":
      return node.name === v ? ONE : ZERO;

    case "unary": {
      const inner = differentiateNode(node.operand, v, steps);
      return node.operator === "-" ? negate(inner) : inner;
    }

    case "binary":
      return differentiateBinary(node, v, steps);

    case "call":
      return differentiateCall(node, v, steps);
  }
}

function differentiateBinary(node: BinaryNode, v: string, steps: SolutionStep[]): ExpressionNode {
  const { operator, left, right } = node;

  if (operator === "+" || operator === "-") {
    const dLeft = differentiateNode(left, v, steps);
    const dRight = differentiateNode(right, v, steps);
    const result = simplify(binary(operator, dLeft, dRight));
    steps.push(
      makeStep(
        operator === "+" ? "Apply the sum rule" : "Apply the difference rule",
        `Differentiation is linear, so the derivative of a ${
          operator === "+" ? "sum" : "difference"
        } is the ${operator === "+" ? "sum" : "difference"} of the derivatives.`,
        `${derivativeLatex(node, v)} = ${toLatex(simplify(dLeft))} ${operator} ${toLatex(
          simplify(dRight),
        )} = ${toLatex(result)}`,
        operator === "+" ? "sum-rule" : "difference-rule",
      ),
    );
    return result;
  }

  if (operator === "*") {
    // Constant multiple is a special case worth naming explicitly.
    if (isConstantIn(left, v)) {
      const dRight = differentiateNode(right, v, steps);
      const result = simplify(binary("*", left, dRight));
      steps.push(
        makeStep(
          "Pull out the constant factor",
          `${toLatex(left)} does not depend on ${v}, so it passes straight through the derivative.`,
          `${derivativeLatex(node, v)} = ${toLatex(left)} \\cdot ${toLatex(
            simplify(dRight),
          )} = ${toLatex(result)}`,
          "constant-rule",
        ),
      );
      return result;
    }
    if (isConstantIn(right, v)) {
      const dLeft = differentiateNode(left, v, steps);
      const result = simplify(binary("*", right, dLeft));
      steps.push(
        makeStep(
          "Pull out the constant factor",
          `${toLatex(right)} does not depend on ${v}, so it passes straight through the derivative.`,
          `${derivativeLatex(node, v)} = ${toLatex(right)} \\cdot ${toLatex(
            simplify(dLeft),
          )} = ${toLatex(result)}`,
          "constant-rule",
        ),
      );
      return result;
    }

    const substeps: SolutionStep[] = [];
    const dLeft = differentiateNode(left, v, substeps);
    const dRight = differentiateNode(right, v, substeps);
    const result = simplify(
      binary("+", binary("*", dLeft, right), binary("*", left, dRight)),
    );
    steps.push(
      makeStep(
        "Apply the product rule",
        "For a product of two non-constant factors, (uv)' = u'v + uv'.",
        `${derivativeLatex(node, v)} = ${toLatex(simplify(dLeft))}\\cdot ${toLatex(
          right,
        )} + ${toLatex(left)}\\cdot ${toLatex(simplify(dRight))} = ${toLatex(result)}`,
        "product-rule",
        substeps,
      ),
    );
    return result;
  }

  if (operator === "/") {
    if (isConstantIn(right, v)) {
      const dLeft = differentiateNode(left, v, steps);
      const result = simplify(binary("/", dLeft, right));
      steps.push(
        makeStep(
          "Divide by the constant denominator",
          `${toLatex(right)} is free of ${v}, so it is simply carried along.`,
          `${derivativeLatex(node, v)} = ${toLatex(result)}`,
          "constant-rule",
        ),
      );
      return result;
    }

    const substeps: SolutionStep[] = [];
    const dLeft = differentiateNode(left, v, substeps);
    const dRight = differentiateNode(right, v, substeps);
    const result = simplify(
      binary(
        "/",
        binary("-", binary("*", dLeft, right), binary("*", left, dRight)),
        binary("^", right, num(2)),
      ),
    );
    steps.push(
      makeStep(
        "Apply the quotient rule",
        "For u/v, the derivative is (u'v − uv') / v².",
        `${derivativeLatex(node, v)} = \\frac{${toLatex(simplify(dLeft))}\\cdot ${toLatex(
          right,
        )} - ${toLatex(left)}\\cdot ${toLatex(simplify(dRight))}}{${toLatex(
          binary("^", right, num(2)),
        )}} = ${toLatex(result)}`,
        "quotient-rule",
        substeps,
      ),
    );
    return result;
  }

  // operator === "^"
  const baseIsConstant = isConstantIn(left, v);
  const exponentIsConstant = isConstantIn(right, v);

  if (exponentIsConstant && !baseIsConstant) {
    const substeps: SolutionStep[] = [];
    const dBase = differentiateNode(left, v, substeps);
    const loweredExponent = simplify(binary("-", right, ONE));
    const result = simplify(
      binary("*", binary("*", right, binary("^", left, loweredExponent)), dBase),
    );
    const isSimpleVariable = left.kind === "variable" && left.name === v;
    steps.push(
      makeStep(
        isSimpleVariable ? "Apply the power rule" : "Apply the generalised power rule",
        isSimpleVariable
          ? "Bring the exponent down as a coefficient and reduce it by one."
          : "Differentiate the outer power, then multiply by the derivative of the inner function.",
        `${derivativeLatex(node, v)} = ${toLatex(right)}\\,${toLatex(
          binary("^", left, loweredExponent),
        )}${isSimpleVariable ? "" : ` \\cdot ${toLatex(simplify(dBase))}`} = ${toLatex(result)}`,
        isSimpleVariable ? "power-rule" : "generalised-power-rule",
        substeps,
      ),
    );
    return result;
  }

  if (baseIsConstant && !exponentIsConstant) {
    const substeps: SolutionStep[] = [];
    const dExponent = differentiateNode(right, v, substeps);
    const result = simplify(binary("*", binary("*", node, call("ln", [left])), dExponent));
    steps.push(
      makeStep(
        "Differentiate the exponential",
        "For a constant base a, d/dx[a^u] = a^u · ln(a) · u'.",
        `${derivativeLatex(node, v)} = ${toLatex(node)}\\ln\\left(${toLatex(
          left,
        )}\\right)\\cdot ${toLatex(simplify(dExponent))} = ${toLatex(result)}`,
        "exponential-rule",
        substeps,
      ),
    );
    return result;
  }

  if (baseIsConstant && exponentIsConstant) {
    return ZERO;
  }

  // Both base and exponent depend on v — logarithmic differentiation.
  const substeps: SolutionStep[] = [];
  const dBase = differentiateNode(left, v, substeps);
  const dExponent = differentiateNode(right, v, substeps);
  const bracket = binary(
    "+",
    binary("*", dExponent, call("ln", [left])),
    binary("/", binary("*", right, dBase), left),
  );
  const result = simplify(binary("*", node, bracket));
  steps.push(
    makeStep(
      "Use logarithmic differentiation",
      "When the variable appears in both the base and the exponent, take logs first: " +
        "ln y = v·ln u, then differentiate implicitly.",
      `${derivativeLatex(node, v)} = ${toLatex(node)}\\left[${toLatex(bracket)}\\right] = ${toLatex(
        result,
      )}`,
      "chain-rule",
      substeps,
    ),
  );
  return result;
}

/** The outer derivative of each supported unary function. */
function outerDerivative(callee: FunctionName, u: ExpressionNode): ExpressionNode | null {
  switch (callee) {
    case "sin":
      return call("cos", [u]);
    case "cos":
      return negate(call("sin", [u]));
    case "tan":
      return binary("^", call("sec", [u]), num(2));
    case "sec":
      return binary("*", call("sec", [u]), call("tan", [u]));
    case "csc":
      return negate(binary("*", call("csc", [u]), call("cot", [u])));
    case "cot":
      return negate(binary("^", call("csc", [u]), num(2)));
    case "asin":
      return binary("/", ONE, call("sqrt", [binary("-", ONE, binary("^", u, num(2)))]));
    case "acos":
      return negate(binary("/", ONE, call("sqrt", [binary("-", ONE, binary("^", u, num(2)))])));
    case "atan":
      return binary("/", ONE, binary("+", ONE, binary("^", u, num(2))));
    case "sinh":
      return call("cosh", [u]);
    case "cosh":
      return call("sinh", [u]);
    case "tanh":
      return binary("-", ONE, binary("^", call("tanh", [u]), num(2)));
    case "exp":
      return call("exp", [u]);
    case "ln":
      return binary("/", ONE, u);
    case "log10":
      return binary("/", ONE, binary("*", u, call("ln", [num(10)])));
    case "sqrt":
      return binary("/", ONE, binary("*", num(2), call("sqrt", [u])));
    case "cbrt":
      return binary("/", ONE, binary("*", num(3), binary("^", call("cbrt", [u]), num(2))));
    case "erf":
      return binary(
        "*",
        binary("/", num(2), call("sqrt", [{ kind: "constant", name: "pi" }])),
        call("exp", [negate(binary("^", u, num(2)))]),
      );
    case "erfc":
      return negate(
        binary(
          "*",
          binary("/", num(2), call("sqrt", [{ kind: "constant", name: "pi" }])),
          call("exp", [negate(binary("^", u, num(2)))]),
        ),
      );
    case "normcdf":
      return call("normpdf", [u]);
    case "normpdf":
      return negate(binary("*", u, call("normpdf", [u])));
    case "abs":
      return call("sign", [u]);
    default:
      return null;
  }
}

const TRIG_FUNCTIONS: ReadonlySet<FunctionName> = new Set<FunctionName>([
  "sin",
  "cos",
  "tan",
  "sec",
  "csc",
  "cot",
  "asin",
  "acos",
  "atan",
]);

function differentiateCall(node: CallNode, v: string, steps: SolutionStep[]): ExpressionNode {
  const { callee, args } = node;

  if (args.every((arg) => isConstantIn(arg, v))) return ZERO;

  // log(base, u) with a constant base reduces to ln(u)/ln(base).
  if (callee === "log" && args.length === 2) {
    const rewritten = binary("/", call("ln", [args[1]]), call("ln", [args[0]]));
    steps.push(
      makeStep(
        "Rewrite using the change-of-base identity",
        "Converting to natural logarithms lets the standard log rule apply.",
        `${toLatex(node)} = ${toLatex(rewritten)}`,
        "logarithmic-rule",
      ),
    );
    return differentiateNode(rewritten, v, steps);
  }

  if (callee === "pow" && args.length === 2) {
    return differentiateNode(binary("^", args[0], args[1]), v, steps);
  }

  if (args.length !== 1) {
    // min/max are piecewise; differentiate the branch that varies and note it.
    const varying = args.find((arg) => !isConstantIn(arg, v));
    if (varying === undefined) return ZERO;
    steps.push(
      makeStep(
        `Differentiate ${callee} piecewise`,
        `${callee}() is differentiable away from the crossing point; on each branch the derivative is that of the selected argument.`,
        `${derivativeLatex(node, v)} = ${derivativeLatex(varying, v)}`,
        "definition",
      ),
    );
    return differentiateNode(varying, v, steps);
  }

  const inner = args[0];
  const outer = outerDerivative(callee, inner);
  if (outer === null) {
    steps.push(
      makeStep(
        `${callee}() has no closed-form derivative here`,
        "MathForge falls back to a central finite difference for this function when a numeric value is requested.",
        `${derivativeLatex(node, v)} \\approx \\frac{f(${v}+h) - f(${v}-h)}{2h}`,
        "numerical-method",
      ),
    );
    return ZERO;
  }

  const innerIsVariable = inner.kind === "variable" && inner.name === v;

  if (innerIsVariable) {
    const result = simplify(outer);
    steps.push(
      makeStep(
        `Differentiate ${callee}`,
        TRIG_FUNCTIONS.has(callee)
          ? "Apply the standard trigonometric derivative."
          : "Apply the standard derivative for this elementary function.",
        `${derivativeLatex(node, v)} = ${toLatex(result)}`,
        TRIG_FUNCTIONS.has(callee)
          ? "trigonometric-rule"
          : callee === "ln" || callee === "log10"
            ? "logarithmic-rule"
            : callee === "exp"
              ? "exponential-rule"
              : "definition",
      ),
    );
    return result;
  }

  const substeps: SolutionStep[] = [];
  const dInner = differentiateNode(inner, v, substeps);
  const result = simplify(binary("*", outer, dInner));
  steps.push(
    makeStep(
      "Apply the chain rule",
      `Differentiate the outer function ${callee}(·) at the inner expression, then multiply by the derivative of the inside.`,
      `${derivativeLatex(node, v)} = ${toLatex(outer)} \\cdot ${toLatex(
        simplify(dInner),
      )} = ${toLatex(result)}`,
      "chain-rule",
      substeps,
    ),
  );
  return result;
}

/**
 * Full derivative pipeline: parse, differentiate, simplify, and package the
 * derivation for the step-by-step UI.
 */
export function solveDerivative(source: string, variableName = "x"): Result<Solution> {
  const ast = parse(source);
  if (!ast.ok) return ast;

  const original = simplify(ast.value);
  const { node, steps } = differentiate(original, variableName);

  const allSteps: SolutionStep[] = [
    makeStep(
      "Identify the structure",
      `The expression is differentiated with respect to ${variableName}. ` +
        (collectVariables(original).length > 1
          ? `Other symbols (${collectVariables(original)
              .filter((name) => name !== variableName)
              .join(", ")}) are treated as constants.`
          : "Every other symbol is treated as a constant."),
      `f(${variableName}) = ${toLatex(original)}`,
      "definition",
    ),
    ...steps,
  ];

  if (!nodesEqual(node, simplifyOnce(node))) {
    allSteps.push(
      makeStep(
        "Simplify the result",
        "Collect like terms and remove trivial factors.",
        `f'(${variableName}) = ${toLatex(node)}`,
        "simplification",
      ),
    );
  }

  return ok({
    kind: "derivative",
    problem: `\\frac{d}{d${variableName}}\\left[${toLatex(original)}\\right]`,
    result: toLatex(node),
    steps: allSteps,
  });
}

/** Central finite difference — the numerical safety net for f'(a). */
export function numericDerivative(
  fn: (x: number) => number,
  at: number,
  h = 1e-5,
): number {
  const step = h * Math.max(1, Math.abs(at));
  return (fn(at + step) - fn(at - step)) / (2 * step);
}

/* ================================================================== */
/* 7. Numerical integration                                            */
/* ================================================================== */

function simpsonRule(fn: (x: number) => number, a: number, b: number, fa: number, fm: number, fb: number): number {
  return ((b - a) / 6) * (fa + 4 * fm + fb);
}

function adaptiveSimpson(
  fn: (x: number) => number,
  a: number,
  b: number,
  fa: number,
  fm: number,
  fb: number,
  whole: number,
  tolerance: number,
  depth: number,
): number {
  const m = (a + b) / 2;
  const lm = (a + m) / 2;
  const rm = (m + b) / 2;
  const flm = fn(lm);
  const frm = fn(rm);
  const left = simpsonRule(fn, a, m, fa, flm, fm);
  const right = simpsonRule(fn, m, b, fm, frm, fb);
  const delta = left + right - whole;
  if (depth <= 0 || Math.abs(delta) <= 15 * tolerance) {
    return left + right + delta / 15;
  }
  return (
    adaptiveSimpson(fn, a, m, fa, flm, fm, left, tolerance / 2, depth - 1) +
    adaptiveSimpson(fn, m, b, fm, frm, fb, right, tolerance / 2, depth - 1)
  );
}

/** Adaptive Simpson quadrature with Richardson extrapolation. */
export function integrateNumeric(
  fn: (x: number) => number,
  lower: number,
  upper: number,
  tolerance = 1e-10,
  maxDepth = 50,
): number {
  if (lower === upper) return 0;
  if (lower > upper) return -integrateNumeric(fn, upper, lower, tolerance, maxDepth);

  const m = (lower + upper) / 2;
  const fa = fn(lower);
  const fm = fn(m);
  const fb = fn(upper);
  const whole = simpsonRule(fn, lower, upper, fa, fm, fb);
  const value = adaptiveSimpson(fn, lower, upper, fa, fm, fb, whole, tolerance, maxDepth);
  return Number.isFinite(value) ? value : integrateTrapezoid(fn, lower, upper, 20000);
}

/** Composite trapezoid fallback for integrands with mild singularities. */
export function integrateTrapezoid(
  fn: (x: number) => number,
  lower: number,
  upper: number,
  intervals = 4096,
): number {
  const h = (upper - lower) / intervals;
  let total = 0;
  for (let i = 0; i <= intervals; i += 1) {
    const x = lower + i * h;
    const y = fn(x);
    if (!Number.isFinite(y)) continue;
    total += i === 0 || i === intervals ? y / 2 : y;
  }
  return total * h;
}

/**
 * Integrate over a semi-infinite range [lower, ∞) by substituting
 * x = lower + t/(1 − t), which maps the tail onto the unit interval.
 */
export function integrateToInfinity(
  fn: (x: number) => number,
  lower: number,
  tolerance = 1e-10,
): number {
  const transformed = (t: number): number => {
    if (t >= 1) return 0;
    const x = lower + t / (1 - t);
    const jacobian = 1 / ((1 - t) * (1 - t));
    const y = fn(x) * jacobian;
    return Number.isFinite(y) ? y : 0;
  };
  return integrateNumeric(transformed, 0, 1 - 1e-12, tolerance, 40);
}

/** Definite integral of a parsed expression, with a derivation trace. */
export function solveDefiniteIntegral(
  source: string,
  variableName: string,
  lower: number,
  upper: number,
): Result<Solution> {
  const ast = parse(source);
  if (!ast.ok) return ast;

  const simplified = simplify(ast.value);
  const fn = compile(simplified, variableName);
  const value = integrateNumeric(fn, lower, upper);
  if (!Number.isFinite(value)) {
    return fail(
      "CONVERGENCE_FAILURE",
      "The integral did not converge on this interval — check for a singularity inside the limits.",
    );
  }

  const coarse = integrateTrapezoid(fn, lower, upper, 512);
  const steps: SolutionStep[] = [
    makeStep(
      "State the definite integral",
      `Integrate with respect to ${variableName} from ${lower} to ${upper}.`,
      `\\int_{${formatLatexNumber(lower)}}^{${formatLatexNumber(upper)}} ${toLatex(
        simplified,
      )}\\,d${variableName}`,
      "definition",
    ),
    makeStep(
      "Apply adaptive Simpson quadrature",
      "The interval is bisected recursively; each half is compared against Simpson's estimate for " +
        "the whole, and subdivision stops once the Richardson error estimate falls below tolerance.",
      `\\int_a^b f\\,d${variableName} \\approx \\frac{b-a}{6}\\left[f(a) + 4f\\!\\left(\\tfrac{a+b}{2}\\right) + f(b)\\right]`,
      "numerical-method",
    ),
    makeStep(
      "Check the estimate against a coarse rule",
      `A 512-interval trapezoid rule gives ${coarse.toPrecision(8)}; agreement with the adaptive ` +
        "result to within the displayed precision indicates a well-behaved integrand.",
      `\\text{trapezoid} = ${formatLatexNumber(
        roundArtifacts(coarse),
      )} \\quad\\Longrightarrow\\quad \\text{Simpson} = ${formatLatexNumber(roundArtifacts(value))}`,
      "numerical-method",
    ),
  ];

  return ok({
    kind: "integral",
    problem: `\\int_{${formatLatexNumber(lower)}}^{${formatLatexNumber(upper)}} ${toLatex(
      simplified,
    )}\\,d${variableName}`,
    result: formatLatexNumber(roundArtifacts(value)),
    numeric: value,
    steps,
  });
}

/* ================================================================== */
/* 8. Plot sampling                                                    */
/* ================================================================== */

/**
 * Sample a compiled function across a window, inserting `null` where the
 * function is undefined or jumps discontinuously so the renderer breaks the
 * line rather than drawing a false vertical asymptote.
 */
export function samplePlot(
  fn: (x: number) => number,
  window: PlotWindow,
): PlotPoint[] {
  const { xMin, xMax, samples } = window;
  const count = Math.max(2, Math.min(4000, Math.floor(samples)));
  const step = (xMax - xMin) / (count - 1);
  const points: PlotPoint[] = [];
  let previous: number | null = null;

  for (let i = 0; i < count; i += 1) {
    const x = xMin + i * step;
    const y = fn(x);
    if (!Number.isFinite(y) || Math.abs(y) > 1e8) {
      points.push({ x, y: null });
      previous = null;
      continue;
    }
    // A jump larger than a quarter of the visible span across one sample is a
    // pole, not a feature of the curve.
    if (previous !== null && Math.abs(y - previous) > 1e6 * Math.max(1, Math.abs(step))) {
      points.push({ x, y: null });
      previous = y;
      continue;
    }
    points.push({ x, y: roundArtifacts(y) });
    previous = y;
  }

  return points;
}

/* ================================================================== */
/* 9. Linear algebra                                                   */
/* ================================================================== */

export function createMatrix(data: readonly (readonly number[])[]): Result<Matrix> {
  if (data.length === 0) {
    return fail("DIMENSION_ERROR", "A matrix needs at least one row.");
  }
  const cols = data[0].length;
  if (cols === 0) {
    return fail("DIMENSION_ERROR", "A matrix needs at least one column.");
  }
  if (data.some((row) => row.length !== cols)) {
    return fail("DIMENSION_ERROR", "Every row must have the same number of entries.");
  }
  if (data.some((row) => row.some((entry) => !Number.isFinite(entry)))) {
    return fail("DIMENSION_ERROR", "Matrix entries must be finite numbers.");
  }
  return ok({ rows: data.length, cols, data: data.map((row) => [...row]) });
}

export function identityMatrix(size: number): Matrix {
  const data: number[][] = [];
  for (let i = 0; i < size; i += 1) {
    const row = new Array<number>(size).fill(0);
    row[i] = 1;
    data.push(row);
  }
  return { rows: size, cols: size, data };
}

export function transpose(matrix: Matrix): Matrix {
  const data: number[][] = [];
  for (let c = 0; c < matrix.cols; c += 1) {
    const row: number[] = [];
    for (let r = 0; r < matrix.rows; r += 1) row.push(matrix.data[r][c]);
    data.push(row);
  }
  return { rows: matrix.cols, cols: matrix.rows, data };
}

export function addMatrices(a: Matrix, b: Matrix): Result<Matrix> {
  if (a.rows !== b.rows || a.cols !== b.cols) {
    return fail(
      "DIMENSION_ERROR",
      `Cannot add a ${a.rows}×${a.cols} matrix to a ${b.rows}×${b.cols} matrix.`,
    );
  }
  const data = a.data.map((row, r) => row.map((entry, c) => entry + b.data[r][c]));
  return ok({ rows: a.rows, cols: a.cols, data });
}

export function scaleMatrix(matrix: Matrix, scalar: number): Matrix {
  return {
    rows: matrix.rows,
    cols: matrix.cols,
    data: matrix.data.map((row) => row.map((entry) => entry * scalar)),
  };
}

export function multiplyMatrices(a: Matrix, b: Matrix): Result<Matrix> {
  if (a.cols !== b.rows) {
    return fail(
      "DIMENSION_ERROR",
      `Inner dimensions disagree: ${a.rows}×${a.cols} times ${b.rows}×${b.cols}.`,
    );
  }
  const data: number[][] = [];
  for (let r = 0; r < a.rows; r += 1) {
    const row = new Array<number>(b.cols).fill(0);
    for (let k = 0; k < a.cols; k += 1) {
      const factor = a.data[r][k];
      if (factor === 0) continue;
      for (let c = 0; c < b.cols; c += 1) row[c] += factor * b.data[k][c];
    }
    data.push(row.map(roundArtifacts));
  }
  return ok({ rows: a.rows, cols: b.cols, data });
}

/** Doolittle LU factorisation with partial pivoting. */
export function luDecompose(matrix: Matrix): Result<LuDecomposition> {
  if (matrix.rows !== matrix.cols) {
    return fail("DIMENSION_ERROR", "LU decomposition requires a square matrix.");
  }
  const n = matrix.rows;
  const upper = matrix.data.map((row) => [...row]);
  const lower = identityMatrix(n).data.map((row) => [...row]);
  const permutation = Array.from({ length: n }, (_, i) => i);
  let sign: 1 | -1 = 1;

  for (let k = 0; k < n; k += 1) {
    let pivotRow = k;
    let pivotMagnitude = Math.abs(upper[k][k]);
    for (let r = k + 1; r < n; r += 1) {
      const magnitude = Math.abs(upper[r][k]);
      if (magnitude > pivotMagnitude) {
        pivotMagnitude = magnitude;
        pivotRow = r;
      }
    }

    if (pivotMagnitude < 1e-14) continue; // singular column; determinant is 0

    if (pivotRow !== k) {
      [upper[k], upper[pivotRow]] = [upper[pivotRow], upper[k]];
      [permutation[k], permutation[pivotRow]] = [permutation[pivotRow], permutation[k]];
      for (let c = 0; c < k; c += 1) {
        [lower[k][c], lower[pivotRow][c]] = [lower[pivotRow][c], lower[k][c]];
      }
      sign = sign === 1 ? -1 : 1;
    }

    for (let r = k + 1; r < n; r += 1) {
      const factor = upper[r][k] / upper[k][k];
      lower[r][k] = factor;
      for (let c = k; c < n; c += 1) upper[r][c] -= factor * upper[k][c];
    }
  }

  return ok({
    lower: { rows: n, cols: n, data: lower.map((row) => row.map(roundArtifacts)) },
    upper: { rows: n, cols: n, data: upper.map((row) => row.map(roundArtifacts)) },
    permutation,
    sign,
  });
}

/** Determinant via LU factorisation — O(n³) and numerically stable. */
export function determinant(matrix: Matrix): Result<number> {
  if (matrix.rows !== matrix.cols) {
    return fail("DIMENSION_ERROR", "Only square matrices have a determinant.");
  }
  const lu = luDecompose(matrix);
  if (!lu.ok) return lu;
  let product = lu.value.sign as number;
  for (let i = 0; i < matrix.rows; i += 1) product *= lu.value.upper.data[i][i];
  return ok(roundArtifacts(product));
}

/** Inverse via Gauss-Jordan elimination on the augmented matrix [A | I]. */
export function invertMatrix(matrix: Matrix): Result<Matrix> {
  if (matrix.rows !== matrix.cols) {
    return fail("DIMENSION_ERROR", "Only square matrices can be inverted.");
  }
  const n = matrix.rows;
  const augmented = matrix.data.map((row, r) => [
    ...row,
    ...identityMatrix(n).data[r],
  ]);

  for (let k = 0; k < n; k += 1) {
    let pivotRow = k;
    let pivotMagnitude = Math.abs(augmented[k][k]);
    for (let r = k + 1; r < n; r += 1) {
      const magnitude = Math.abs(augmented[r][k]);
      if (magnitude > pivotMagnitude) {
        pivotMagnitude = magnitude;
        pivotRow = r;
      }
    }
    if (pivotMagnitude < 1e-12) {
      return fail(
        "SINGULAR_MATRIX",
        "This matrix is singular (determinant 0), so no inverse exists.",
      );
    }
    if (pivotRow !== k) [augmented[k], augmented[pivotRow]] = [augmented[pivotRow], augmented[k]];

    const pivot = augmented[k][k];
    for (let c = 0; c < 2 * n; c += 1) augmented[k][c] /= pivot;

    for (let r = 0; r < n; r += 1) {
      if (r === k) continue;
      const factor = augmented[r][k];
      if (factor === 0) continue;
      for (let c = 0; c < 2 * n; c += 1) augmented[r][c] -= factor * augmented[k][c];
    }
  }

  const data = augmented.map((row) => row.slice(n).map(roundArtifacts));
  return ok({ rows: n, cols: n, data });
}

/** Rank via reduced row echelon form. */
export function matrixRank(matrix: Matrix): number {
  const working = matrix.data.map((row) => [...row]);
  const { rows, cols } = matrix;
  let rank = 0;

  for (let col = 0; col < cols && rank < rows; col += 1) {
    let pivotRow = rank;
    let pivotMagnitude = Math.abs(working[rank][col]);
    for (let r = rank + 1; r < rows; r += 1) {
      const magnitude = Math.abs(working[r][col]);
      if (magnitude > pivotMagnitude) {
        pivotMagnitude = magnitude;
        pivotRow = r;
      }
    }
    if (pivotMagnitude < 1e-11) continue;

    [working[rank], working[pivotRow]] = [working[pivotRow], working[rank]];
    const pivot = working[rank][col];
    for (let c = col; c < cols; c += 1) working[rank][c] /= pivot;
    for (let r = 0; r < rows; r += 1) {
      if (r === rank) continue;
      const factor = working[r][col];
      if (factor === 0) continue;
      for (let c = col; c < cols; c += 1) working[r][c] -= factor * working[rank][c];
    }
    rank += 1;
  }

  return rank;
}

function isSymmetric(matrix: Matrix, tolerance = 1e-9): boolean {
  if (matrix.rows !== matrix.cols) return false;
  for (let r = 0; r < matrix.rows; r += 1) {
    for (let c = r + 1; c < matrix.cols; c += 1) {
      if (Math.abs(matrix.data[r][c] - matrix.data[c][r]) > tolerance) return false;
    }
  }
  return true;
}

/** Cyclic Jacobi eigenvalue iteration for real symmetric matrices. */
export function symmetricEigenvalues(matrix: Matrix, sweeps = 100): readonly number[] | null {
  if (!isSymmetric(matrix)) return null;
  const n = matrix.rows;
  const a = matrix.data.map((row) => [...row]);

  for (let sweep = 0; sweep < sweeps; sweep += 1) {
    let offDiagonal = 0;
    for (let r = 0; r < n; r += 1) {
      for (let c = r + 1; c < n; c += 1) offDiagonal += a[r][c] * a[r][c];
    }
    if (offDiagonal < 1e-24) break;

    for (let p = 0; p < n - 1; p += 1) {
      for (let q = p + 1; q < n; q += 1) {
        if (Math.abs(a[p][q]) < 1e-18) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t =
          Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k += 1) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k += 1) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
      }
    }
  }

  return Array.from({ length: n }, (_, i) => roundArtifacts(a[i][i])).sort((x, y) => y - x);
}

/** Full structural report on a matrix, used by the workbench panel. */
export function analyseMatrix(matrix: Matrix): MatrixAnalysis {
  const square = matrix.rows === matrix.cols;
  const det = square ? determinant(matrix) : null;
  const inverseResult = square ? invertMatrix(matrix) : null;
  const inverse = inverseResult !== null && inverseResult.ok ? inverseResult.value : null;

  let trace: number | null = null;
  if (square) {
    trace = 0;
    for (let i = 0; i < matrix.rows; i += 1) trace += matrix.data[i][i];
    trace = roundArtifacts(trace);
  }

  // Condition number estimated in the ∞-norm: ‖A‖∞ · ‖A⁻¹‖∞.
  let conditionEstimate: number | null = null;
  if (inverse !== null) {
    conditionEstimate = roundArtifacts(infinityNorm(matrix) * infinityNorm(inverse));
  }

  return {
    matrix,
    isSquare: square,
    determinant: det !== null && det.ok ? det.value : null,
    rank: matrixRank(matrix),
    trace,
    transpose: transpose(matrix),
    inverse,
    conditionEstimate,
    eigenvalues: square ? symmetricEigenvalues(matrix) : null,
  };
}

function infinityNorm(matrix: Matrix): number {
  return matrix.data.reduce(
    (best, row) => Math.max(best, row.reduce((sum, entry) => sum + Math.abs(entry), 0)),
    0,
  );
}

/** Solve Ax = b by Gauss-Jordan inversion, reporting singular systems. */
export function solveLinearSystem(a: Matrix, b: readonly number[]): Result<number[]> {
  if (a.rows !== a.cols) {
    return fail("DIMENSION_ERROR", "The coefficient matrix must be square.");
  }
  if (b.length !== a.rows) {
    return fail("DIMENSION_ERROR", `Expected ${a.rows} right-hand-side values, got ${b.length}.`);
  }
  const inverse = invertMatrix(a);
  if (!inverse.ok) return inverse;
  const solution = inverse.value.data.map((row) =>
    roundArtifacts(row.reduce((sum, entry, index) => sum + entry * b[index], 0)),
  );
  return ok(solution);
}

/** Render a matrix as a LaTeX bmatrix. */
export function matrixToLatex(matrix: Matrix): string {
  const body = matrix.data
    .map((row) => row.map((entry) => formatLatexNumber(roundArtifacts(entry))).join(" & "))
    .join(" \\\\ ");
  return `\\begin{bmatrix} ${body} \\end{bmatrix}`;
}

/** Step-by-step narrative for the matrix panel. */
export function solveMatrixAnalysis(matrix: Matrix): Solution {
  const analysis = analyseMatrix(matrix);
  const steps: SolutionStep[] = [
    makeStep(
      "Read the matrix",
      `A is ${matrix.rows}×${matrix.cols}${
        analysis.isSquare ? " and therefore square." : ", so determinant and inverse are undefined."
      }`,
      `A = ${matrixToLatex(matrix)}`,
      "definition",
    ),
  ];

  if (analysis.isSquare) {
    const lu = luDecompose(matrix);
    if (lu.ok) {
      steps.push(
        makeStep(
          "Factorise with partial pivoting",
          "Row-reduce to upper triangular form, recording the multipliers in L and the row swaps " +
            "in P. Partial pivoting keeps the multipliers bounded by 1, which controls round-off.",
          `PA = LU,\\quad L = ${matrixToLatex(lu.value.lower)},\\quad U = ${matrixToLatex(
            lu.value.upper,
          )}`,
          "numerical-method",
        ),
      );
    }
    steps.push(
      makeStep(
        "Take the determinant from U",
        "With PA = LU and det(L) = 1, det(A) is the product of U's diagonal, corrected by the " +
          "sign of the permutation.",
        `\\det(A) = ${lu.ok && lu.value.sign === -1 ? "-" : ""}\\prod_i u_{ii} = ${formatLatexNumber(
          analysis.determinant ?? 0,
        )}`,
        "numerical-method",
      ),
    );
    if (analysis.inverse !== null) {
      steps.push(
        makeStep(
          "Invert by Gauss-Jordan elimination",
          "Augment with the identity and reduce the left block to I; the right block becomes A⁻¹.",
          `A^{-1} = ${matrixToLatex(analysis.inverse)}`,
          "numerical-method",
        ),
      );
    } else {
      steps.push(
        makeStep(
          "The matrix is singular",
          "A zero determinant means the columns are linearly dependent, so no inverse exists and " +
            "the system Ax = b either has no solution or infinitely many.",
          `\\det(A) = 0 \\implies A^{-1} \\text{ undefined}`,
          "definition",
        ),
      );
    }
  }

  steps.push(
    makeStep(
      "Determine the rank",
      "Reduce to row echelon form and count the pivots — this is the dimension of the column space.",
      `\\operatorname{rank}(A) = ${analysis.rank}`,
      "numerical-method",
    ),
  );

  if (analysis.eigenvalues !== null) {
    steps.push(
      makeStep(
        "Extract eigenvalues (Jacobi rotations)",
        "A is symmetric, so repeated Givens rotations drive the off-diagonal entries to zero and " +
          "leave the eigenvalues on the diagonal.",
        `\\lambda = \\left\\{ ${analysis.eigenvalues
          .map((value) => formatLatexNumber(value))
          .join(",\\; ")} \\right\\}`,
        "numerical-method",
      ),
    );
  }

  return {
    kind: "matrix",
    problem: `A = ${matrixToLatex(matrix)}`,
    result:
      analysis.determinant !== null
        ? `\\det(A) = ${formatLatexNumber(analysis.determinant)}`
        : `\\operatorname{rank}(A) = ${analysis.rank}`,
    numeric: analysis.determinant ?? analysis.rank,
    steps,
  };
}

/* ================================================================== */
/* 10. Special functions                                               */
/* ================================================================== */

const LANCZOS_COEFFICIENTS = [
  676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
] as const;

/** Natural log of the gamma function via the Lanczos approximation. */
export function logGamma(x: number): number {
  if (x < 0.5) {
    // Reflection: Γ(x)Γ(1−x) = π / sin(πx)
    return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - logGamma(1 - x);
  }
  const z = x - 1;
  let series = 0.99999999999980993;
  for (let i = 0; i < LANCZOS_COEFFICIENTS.length; i += 1) {
    series += LANCZOS_COEFFICIENTS[i] / (z + i + 1);
  }
  const t = z + LANCZOS_COEFFICIENTS.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(series);
}

export function gammaFunction(x: number): number {
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gammaFunction(1 - x));
  return Math.exp(logGamma(x));
}

/** Regularised lower incomplete gamma P(a, x) by series expansion. */
function lowerGammaSeries(a: number, x: number): number {
  let term = 1 / a;
  let sum = term;
  for (let n = 1; n < 500; n += 1) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * 1e-16) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
}

/** Regularised upper incomplete gamma Q(a, x) by continued fraction. */
function upperGammaContinuedFraction(a: number, x: number): number {
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-16) break;
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

/** Regularised lower incomplete gamma function P(a, x). */
export function regularizedGammaP(a: number, x: number): number {
  if (x <= 0 || a <= 0) return 0;
  return x < a + 1 ? lowerGammaSeries(a, x) : 1 - upperGammaContinuedFraction(a, x);
}

/** Regularised upper incomplete gamma function Q(a, x) = 1 − P(a, x). */
export function regularizedGammaQ(a: number, x: number): number {
  if (x <= 0 || a <= 0) return 1;
  return x < a + 1 ? 1 - lowerGammaSeries(a, x) : upperGammaContinuedFraction(a, x);
}

/** Error function, accurate to near machine precision. */
export function erf(x: number): number {
  if (x === 0) return 0;
  const magnitude = regularizedGammaP(0.5, x * x);
  return x > 0 ? magnitude : -magnitude;
}

/** Complementary error function, evaluated directly to preserve tail accuracy. */
export function erfc(x: number): number {
  if (x === 0) return 1;
  return x > 0 ? regularizedGammaQ(0.5, x * x) : 1 + regularizedGammaP(0.5, x * x);
}

const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);

export function normalPdf(x: number, mu = 0, sigma = 1): number {
  if (sigma <= 0) return Number.NaN;
  const z = (x - mu) / sigma;
  return (INV_SQRT_2PI / sigma) * Math.exp(-0.5 * z * z);
}

export function normalCdf(x: number, mu = 0, sigma = 1): number {
  if (sigma <= 0) return Number.NaN;
  return 0.5 * erfc(-(x - mu) / (sigma * Math.SQRT2));
}

/** Inverse standard normal CDF (probit) — Acklam's rational approximation
 *  followed by one Halley refinement, giving ~1e-15 relative accuracy. */
export function normalQuantile(p: number, mu = 0, sigma = 1): number {
  if (p <= 0) return Number.NEGATIVE_INFINITY;
  if (p >= 1) return Number.POSITIVE_INFINITY;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let z: number;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    z =
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    z =
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    z =
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  // Halley step against the high-accuracy erfc above.
  const error = 0.5 * erfc(-z / Math.SQRT2) - p;
  const density = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  if (density > 0) {
    const u = error / density;
    z -= u / (1 + (z * u) / 2);
  }

  return mu + sigma * z;
}

/** Natural log of the binomial coefficient, stable for large n. */
export function logBinomialCoefficient(n: number, k: number): number {
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

/* ================================================================== */
/* 11. Probability distributions                                       */
/* ================================================================== */

const DISCRETE_KINDS: ReadonlySet<string> = new Set(["binomial", "poisson", "geometric"]);

export function isDiscrete(parameters: DistributionParameters): boolean {
  return DISCRETE_KINDS.has(parameters.kind);
}

/** Probability density (continuous) or mass (discrete). */
export function distributionPdf(parameters: DistributionParameters, x: number): number {
  switch (parameters.kind) {
    case "normal":
      return normalPdf(x, parameters.mu, parameters.sigma);

    case "lognormal": {
      if (x <= 0 || parameters.sigma <= 0) return 0;
      const z = (Math.log(x) - parameters.mu) / parameters.sigma;
      return (INV_SQRT_2PI / (x * parameters.sigma)) * Math.exp(-0.5 * z * z);
    }

    case "exponential":
      if (x < 0 || parameters.lambda <= 0) return 0;
      return parameters.lambda * Math.exp(-parameters.lambda * x);

    case "uniform": {
      const { a, b } = parameters;
      if (b <= a) return 0;
      return x >= a && x <= b ? 1 / (b - a) : 0;
    }

    case "gamma": {
      const { shape, rate } = parameters;
      if (x <= 0 || shape <= 0 || rate <= 0) return 0;
      return Math.exp(
        shape * Math.log(rate) + (shape - 1) * Math.log(x) - rate * x - logGamma(shape),
      );
    }

    case "weibull": {
      const { shape, scale } = parameters;
      if (x < 0 || shape <= 0 || scale <= 0) return 0;
      const ratio = x / scale;
      return (shape / scale) * Math.pow(ratio, shape - 1) * Math.exp(-Math.pow(ratio, shape));
    }

    case "binomial": {
      const { n, p } = parameters;
      const k = Math.round(x);
      if (k < 0 || k > n || p < 0 || p > 1) return 0;
      if (p === 0) return k === 0 ? 1 : 0;
      if (p === 1) return k === n ? 1 : 0;
      return Math.exp(
        logBinomialCoefficient(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p),
      );
    }

    case "poisson": {
      const { lambda } = parameters;
      const k = Math.round(x);
      if (k < 0 || lambda <= 0) return 0;
      return Math.exp(-lambda + k * Math.log(lambda) - logGamma(k + 1));
    }

    case "geometric": {
      const { p } = parameters;
      const k = Math.round(x);
      if (k < 1 || p <= 0 || p > 1) return 0;
      return Math.pow(1 - p, k - 1) * p;
    }
  }
}

/** Cumulative distribution function. */
export function distributionCdf(parameters: DistributionParameters, x: number): number {
  switch (parameters.kind) {
    case "normal":
      return normalCdf(x, parameters.mu, parameters.sigma);

    case "lognormal":
      return x <= 0 ? 0 : normalCdf(Math.log(x), parameters.mu, parameters.sigma);

    case "exponential":
      return x <= 0 ? 0 : 1 - Math.exp(-parameters.lambda * x);

    case "uniform": {
      const { a, b } = parameters;
      if (b <= a) return x >= a ? 1 : 0;
      if (x <= a) return 0;
      if (x >= b) return 1;
      return (x - a) / (b - a);
    }

    case "gamma":
      return x <= 0 ? 0 : regularizedGammaP(parameters.shape, parameters.rate * x);

    case "weibull":
      return x <= 0 ? 0 : 1 - Math.exp(-Math.pow(x / parameters.scale, parameters.shape));

    case "binomial": {
      const k = Math.floor(x);
      if (k < 0) return 0;
      if (k >= parameters.n) return 1;
      let total = 0;
      for (let i = 0; i <= k; i += 1) total += distributionPdf(parameters, i);
      return Math.min(1, total);
    }

    case "poisson": {
      const k = Math.floor(x);
      if (k < 0) return 0;
      return regularizedGammaQ(k + 1, parameters.lambda);
    }

    case "geometric": {
      const k = Math.floor(x);
      return k < 1 ? 0 : 1 - Math.pow(1 - parameters.p, k);
    }
  }
}

/** Closed-form moments where they exist. */
export function distributionMoments(parameters: DistributionParameters): DistributionMoments {
  switch (parameters.kind) {
    case "normal": {
      const { mu, sigma } = parameters;
      return moments(mu, sigma * sigma, 0, 0);
    }
    case "lognormal": {
      const { mu, sigma } = parameters;
      const s2 = sigma * sigma;
      const mean = Math.exp(mu + s2 / 2);
      const variance = (Math.exp(s2) - 1) * Math.exp(2 * mu + s2);
      const skewness = (Math.exp(s2) + 2) * Math.sqrt(Math.exp(s2) - 1);
      const kurtosis =
        Math.exp(4 * s2) + 2 * Math.exp(3 * s2) + 3 * Math.exp(2 * s2) - 6;
      return moments(mean, variance, skewness, kurtosis);
    }
    case "exponential": {
      const { lambda } = parameters;
      return moments(1 / lambda, 1 / (lambda * lambda), 2, 6);
    }
    case "uniform": {
      const { a, b } = parameters;
      return moments((a + b) / 2, ((b - a) * (b - a)) / 12, 0, -6 / 5);
    }
    case "gamma": {
      const { shape, rate } = parameters;
      return moments(shape / rate, shape / (rate * rate), 2 / Math.sqrt(shape), 6 / shape);
    }
    case "weibull": {
      const { shape, scale } = parameters;
      const g1 = gammaFunction(1 + 1 / shape);
      const g2 = gammaFunction(1 + 2 / shape);
      const g3 = gammaFunction(1 + 3 / shape);
      const g4 = gammaFunction(1 + 4 / shape);
      const mean = scale * g1;
      const variance = scale * scale * (g2 - g1 * g1);
      const sd = Math.sqrt(variance);
      const skewness = (scale ** 3 * (g3 - 3 * g1 * g2 + 2 * g1 ** 3)) / sd ** 3;
      const kurtosis =
        (scale ** 4 * (g4 - 4 * g1 * g3 + 6 * g1 * g1 * g2 - 3 * g1 ** 4)) / variance ** 2 - 3;
      return moments(mean, variance, skewness, kurtosis);
    }
    case "binomial": {
      const { n, p } = parameters;
      const q = 1 - p;
      return moments(n * p, n * p * q, (q - p) / Math.sqrt(n * p * q), (1 - 6 * p * q) / (n * p * q));
    }
    case "poisson": {
      const { lambda } = parameters;
      return moments(lambda, lambda, 1 / Math.sqrt(lambda), 1 / lambda);
    }
    case "geometric": {
      const { p } = parameters;
      const q = 1 - p;
      return moments(1 / p, q / (p * p), (2 - p) / Math.sqrt(q), 6 + (p * p) / q);
    }
  }
}

function moments(
  mean: number,
  variance: number,
  skewness: number,
  excessKurtosis: number,
): DistributionMoments {
  return {
    mean: roundArtifacts(mean),
    variance: roundArtifacts(variance),
    standardDeviation: roundArtifacts(Math.sqrt(Math.max(0, variance))),
    skewness: roundArtifacts(skewness),
    excessKurtosis: roundArtifacts(excessKurtosis),
  };
}

/**
 * A sensible plotting window for a distribution: ±4σ for continuous laws,
 * clipped to the support, and integer-aligned for discrete ones.
 */
export function distributionSupport(
  parameters: DistributionParameters,
): readonly [number, number] {
  const { mean, standardDeviation } = distributionMoments(parameters);
  switch (parameters.kind) {
    case "uniform": {
      const pad = (parameters.b - parameters.a) * 0.15;
      return [parameters.a - pad, parameters.b + pad];
    }
    case "exponential":
    case "gamma":
    case "weibull":
    case "lognormal":
      return [0, Math.max(1e-6, mean + 4.5 * standardDeviation)];
    case "binomial":
      return [0, parameters.n];
    case "poisson":
      return [0, Math.max(5, Math.ceil(mean + 4 * standardDeviation))];
    case "geometric":
      return [1, Math.max(5, Math.ceil(mean + 4 * standardDeviation))];
    case "normal":
      return [mean - 4 * standardDeviation, mean + 4 * standardDeviation];
  }
}

/** Sample a distribution across its plotting window. */
export function sampleDistribution(
  parameters: DistributionParameters,
  samples = 240,
): DistributionSample[] {
  const [lower, upper] = distributionSupport(parameters);
  const points: DistributionSample[] = [];

  if (isDiscrete(parameters)) {
    const start = Math.max(0, Math.floor(lower));
    const end = Math.ceil(upper);
    const stride = Math.max(1, Math.ceil((end - start) / samples));
    for (let k = start; k <= end; k += stride) {
      points.push({
        x: k,
        density: roundArtifacts(distributionPdf(parameters, k)),
        cumulative: roundArtifacts(distributionCdf(parameters, k)),
      });
    }
    return points;
  }

  const step = (upper - lower) / (samples - 1);
  for (let i = 0; i < samples; i += 1) {
    const x = lower + i * step;
    points.push({
      x: roundArtifacts(x),
      density: roundArtifacts(distributionPdf(parameters, x)),
      cumulative: roundArtifacts(distributionCdf(parameters, x)),
    });
  }
  return points;
}

/** LaTeX for the density of each supported law — shown beside the plot. */
export function distributionLatex(parameters: DistributionParameters): string {
  switch (parameters.kind) {
    case "normal":
      return `f(x)=\\frac{1}{\\sigma\\sqrt{2\\pi}}\\exp\\!\\left(-\\frac{(x-\\mu)^2}{2\\sigma^2}\\right),\\quad \\mu=${parameters.mu},\\ \\sigma=${parameters.sigma}`;
    case "lognormal":
      return `f(x)=\\frac{1}{x\\sigma\\sqrt{2\\pi}}\\exp\\!\\left(-\\frac{(\\ln x-\\mu)^2}{2\\sigma^2}\\right),\\quad x>0`;
    case "exponential":
      return `f(x)=\\lambda e^{-\\lambda x},\\quad \\lambda=${parameters.lambda},\\ x\\ge 0`;
    case "uniform":
      return `f(x)=\\frac{1}{b-a}\\ \\text{on}\\ [${parameters.a}, ${parameters.b}]`;
    case "gamma":
      return `f(x)=\\frac{\\beta^{\\alpha}}{\\Gamma(\\alpha)}x^{\\alpha-1}e^{-\\beta x},\\quad \\alpha=${parameters.shape},\\ \\beta=${parameters.rate}`;
    case "weibull":
      return `f(x)=\\frac{k}{\\lambda}\\left(\\frac{x}{\\lambda}\\right)^{k-1}e^{-(x/\\lambda)^k},\\quad k=${parameters.shape},\\ \\lambda=${parameters.scale}`;
    case "binomial":
      return `P(X=k)=\\binom{n}{k}p^k(1-p)^{n-k},\\quad n=${parameters.n},\\ p=${parameters.p}`;
    case "poisson":
      return `P(X=k)=\\frac{\\lambda^k e^{-\\lambda}}{k!},\\quad \\lambda=${parameters.lambda}`;
    case "geometric":
      return `P(X=k)=(1-p)^{k-1}p,\\quad p=${parameters.p}`;
  }
}

/* ================================================================== */
/* 12. Survival models and life contingencies                          */
/* ================================================================== */

/** Force of mortality μ(x) for each parametric law. */
export function forceOfMortality(model: SurvivalModelParameters, age: number): number {
  if (age < 0) return 0;
  switch (model.kind) {
    case "exponential":
      return model.mu;
    case "gompertz":
      return model.b * Math.pow(model.c, age);
    case "makeham":
      return model.a + model.b * Math.pow(model.c, age);
    case "deMoivre":
      return age >= model.omega ? Number.POSITIVE_INFINITY : 1 / (model.omega - age);
    case "weibull":
      return (model.shape / model.scale) * Math.pow(age / model.scale, model.shape - 1);
  }
}

/** Cumulative hazard Λ(x) = ∫₀ˣ μ(s) ds, in closed form for every law. */
export function cumulativeHazard(model: SurvivalModelParameters, age: number): number {
  if (age <= 0) return 0;
  switch (model.kind) {
    case "exponential":
      return model.mu * age;
    case "gompertz":
      return (model.b / Math.log(model.c)) * (Math.pow(model.c, age) - 1);
    case "makeham":
      return model.a * age + (model.b / Math.log(model.c)) * (Math.pow(model.c, age) - 1);
    case "deMoivre":
      return age >= model.omega
        ? Number.POSITIVE_INFINITY
        : -Math.log(1 - age / model.omega);
    case "weibull":
      return Math.pow(age / model.scale, model.shape);
  }
}

/** Survival function S(x) — the probability a newborn reaches age x. */
export function survivalProbability(model: SurvivalModelParameters, age: number): number {
  if (age <= 0) return 1;
  if (model.kind === "deMoivre") {
    return age >= model.omega ? 0 : 1 - age / model.omega;
  }
  return Math.exp(-cumulativeHazard(model, age));
}

/** ₜp_x — the probability a life aged x survives a further t years. */
export function conditionalSurvival(
  model: SurvivalModelParameters,
  age: number,
  duration: number,
): number {
  if (duration <= 0) return 1;
  const base = survivalProbability(model, age);
  if (base <= 0) return 0;
  return Math.min(1, survivalProbability(model, age + duration) / base);
}

/** ₜq_x = 1 − ₜp_x. */
export function conditionalMortality(
  model: SurvivalModelParameters,
  age: number,
  duration: number,
): number {
  return 1 - conditionalSurvival(model, age, duration);
}

/** The largest age worth plotting for a model (S(x) below 1e-6). */
export function limitingAge(model: SurvivalModelParameters): number {
  if (model.kind === "deMoivre") return model.omega;
  let lower = 0;
  let upper = 1;
  while (survivalProbability(model, upper) > 1e-6 && upper < 1e6) upper *= 2;
  for (let i = 0; i < 200; i += 1) {
    const mid = (lower + upper) / 2;
    if (survivalProbability(model, mid) > 1e-6) lower = mid;
    else upper = mid;
  }
  return Math.min(upper, 1e6);
}

/**
 * e̊_x — complete expectation of future lifetime, ∫₀^∞ ₜp_x dt, evaluated by
 * adaptive quadrature over the model's effective support.
 */
export function completeLifeExpectancy(model: SurvivalModelParameters, age: number): number {
  const horizon = Math.max(1e-6, limitingAge(model) - age);
  if (horizon <= 0) return 0;
  return integrateNumeric(
    (t) => conditionalSurvival(model, age, t),
    0,
    horizon,
    1e-9,
    40,
  );
}

/** e_x — curtate expectation, Σ_{k≥1} ₖp_x. */
export function curtateLifeExpectancy(model: SurvivalModelParameters, age: number): number {
  const horizon = Math.ceil(Math.max(1, limitingAge(model) - age));
  let total = 0;
  for (let k = 1; k <= horizon; k += 1) {
    const p = conditionalSurvival(model, age, k);
    if (p < 1e-12) break;
    total += p;
  }
  return total;
}

/**
 * Ā_x — EPV of a whole-life insurance of 1 payable at the moment of death:
 *   Ā_x = ∫₀^∞ e^{-δt} · ₜp_x · μ(x+t) dt
 */
export function wholeLifeInsurance(
  model: SurvivalModelParameters,
  age: number,
  forceOfInterest: number,
): number {
  const horizon = Math.max(1e-6, limitingAge(model) - age);
  return integrateNumeric(
    (t) => {
      const p = conditionalSurvival(model, age, t);
      if (p <= 0) return 0;
      const hazard = forceOfMortality(model, age + t);
      if (!Number.isFinite(hazard)) return 0;
      return Math.exp(-forceOfInterest * t) * p * hazard;
    },
    0,
    horizon,
    1e-10,
    45,
  );
}

/**
 * ā_x — EPV of a continuous whole-life annuity of 1 per year:
 *   ā_x = ∫₀^∞ e^{-δt} · ₜp_x dt
 */
export function continuousLifeAnnuity(
  model: SurvivalModelParameters,
  age: number,
  forceOfInterest: number,
): number {
  const horizon = Math.max(1e-6, limitingAge(model) - age);
  return integrateNumeric(
    (t) => Math.exp(-forceOfInterest * t) * conditionalSurvival(model, age, t),
    0,
    horizon,
    1e-10,
    45,
  );
}

/** Sample the survival, hazard and death-density curves for plotting. */
export function sampleSurvivalCurve(
  model: SurvivalModelParameters,
  baseAge: number,
  samples = 200,
): SurvivalCurvePoint[] {
  const omega = limitingAge(model);
  const upper = model.kind === "deMoivre" ? omega * 0.999 : omega;
  const step = upper / (samples - 1);
  const points: SurvivalCurvePoint[] = [];

  for (let i = 0; i < samples; i += 1) {
    const age = i * step;
    const survival = survivalProbability(model, age);
    const hazardRaw = forceOfMortality(model, age);
    const hazard = Number.isFinite(hazardRaw) ? hazardRaw : 0;
    points.push({
      age: roundArtifacts(age),
      survival: roundArtifacts(survival),
      hazard: roundArtifacts(hazard),
      density: roundArtifacts(survival * hazard),
      conditionalSurvival: roundArtifacts(
        age < baseAge ? 1 : conditionalSurvival(model, baseAge, age - baseAge),
      ),
    });
  }

  return points;
}

/** Every life-contingency figure the dashboard shows, for one (x, δ) pair. */
export function computeLifeContingencies(
  model: SurvivalModelParameters,
  age: number,
  forceOfInterest: number,
  horizon: number,
): LifeContingencyResult {
  const insurance = wholeLifeInsurance(model, age, forceOfInterest);
  const annuity = continuousLifeAnnuity(model, age, forceOfInterest);
  const tPx = conditionalSurvival(model, age, horizon);

  return {
    age,
    tPx: roundArtifacts(tPx),
    tQx: roundArtifacts(1 - tPx),
    lifeExpectancy: roundArtifacts(completeLifeExpectancy(model, age)),
    curtateExpectation: roundArtifacts(curtateLifeExpectancy(model, age)),
    wholeLifeInsurance: roundArtifacts(insurance),
    lifeAnnuity: roundArtifacts(annuity),
    netPremium: annuity > 0 ? roundArtifacts(insurance / annuity) : 0,
    forceOfInterest,
  };
}

/** LaTeX for the force of mortality of each law. */
export function survivalModelLatex(model: SurvivalModelParameters): string {
  switch (model.kind) {
    case "exponential":
      return `\\mu_x = ${model.mu},\\qquad S(x) = e^{-\\mu x}`;
    case "gompertz":
      return `\\mu_x = Bc^{\\,x},\\quad B=${model.b},\\ c=${model.c},\\qquad S(x)=\\exp\\!\\left[-\\tfrac{B}{\\ln c}\\left(c^{\\,x}-1\\right)\\right]`;
    case "makeham":
      return `\\mu_x = A + Bc^{\\,x},\\quad A=${model.a},\\ B=${model.b},\\ c=${model.c}`;
    case "deMoivre":
      return `S(x) = 1 - \\tfrac{x}{\\omega},\\quad \\omega=${model.omega},\\qquad \\mu_x=\\tfrac{1}{\\omega-x}`;
    case "weibull":
      return `\\mu_x = \\tfrac{k}{\\lambda}\\left(\\tfrac{x}{\\lambda}\\right)^{k-1},\\quad k=${model.shape},\\ \\lambda=${model.scale}`;
  }
}

/** Step-by-step narrative for the actuarial panel. */
export function solveSurvival(
  model: SurvivalModelParameters,
  age: number,
  horizon: number,
  forceOfInterest: number,
): Solution {
  const result = computeLifeContingencies(model, age, forceOfInterest, horizon);
  const steps: SolutionStep[] = [
    makeStep(
      "State the mortality law",
      "Every life-contingent quantity below follows from this single force of mortality.",
      survivalModelLatex(model),
      "definition",
    ),
    makeStep(
      "Convert the force into a survival probability",
      "Integrating the hazard gives the cumulative hazard Λ, and S(x) = exp(−Λ(x)).",
      `S(${age}) = \\exp\\!\\left[-\\int_0^{${age}}\\mu_s\\,ds\\right] = ${formatLatexNumber(
        roundArtifacts(survivalProbability(model, age)),
      )}`,
      "definition",
    ),
    makeStep(
      "Condition on survival to age x",
      "The ratio of survival functions gives the probability a life aged x lasts another t years.",
      `{}_{${horizon}}p_{${age}} = \\frac{S(${age + horizon})}{S(${age})} = ${formatLatexNumber(
        result.tPx,
      )},\\qquad {}_{${horizon}}q_{${age}} = ${formatLatexNumber(result.tQx)}`,
      "definition",
    ),
    makeStep(
      "Integrate to get the expectation of life",
      "e̊_x is the area under the conditional survival curve; the curtate version sums it at " +
        "integer durations instead.",
      `\\mathring{e}_{${age}} = \\int_0^{\\infty} {}_tp_{${age}}\\,dt = ${formatLatexNumber(
        result.lifeExpectancy,
      )}\\ \\text{years}`,
      "numerical-method",
    ),
    makeStep(
      "Value the insurance and the annuity",
      "Discount each benefit at the force of interest δ and weight it by the probability the " +
        "cash flow actually occurs.",
      `\\bar{A}_{${age}} = \\int_0^{\\infty} e^{-\\delta t}\\,{}_tp_{${age}}\\,\\mu_{${age}+t}\\,dt = ${formatLatexNumber(
        result.wholeLifeInsurance,
      )},\\qquad \\bar{a}_{${age}} = \\int_0^{\\infty} e^{-\\delta t}\\,{}_tp_{${age}}\\,dt = ${formatLatexNumber(
        result.lifeAnnuity,
      )}`,
      "numerical-method",
    ),
    makeStep(
      "Apply the equivalence principle",
      "Setting EPV(premiums) = EPV(benefits) at issue gives the net annual premium.",
      `\\bar{P}(\\bar{A}_{${age}}) = \\frac{\\bar{A}_{${age}}}{\\bar{a}_{${age}}} = ${formatLatexNumber(
        result.netPremium,
      )}`,
      "definition",
    ),
  ];

  return {
    kind: "survival",
    problem: survivalModelLatex(model),
    result: `{}_{${horizon}}p_{${age}} = ${formatLatexNumber(result.tPx)}`,
    numeric: result.tPx,
    steps,
  };
}

/* ================================================================== */
/* 13. Interest theory                                                 */
/* ================================================================== */

/** Annual effective rate implied by a nominal rate at a given frequency. */
export function effectiveAnnualRate(
  annualRate: number,
  frequency: CompoundingFrequency,
): number {
  if (frequency === "continuous") return Math.exp(annualRate) - 1;
  return Math.pow(1 + annualRate / frequency, frequency) - 1;
}

/**
 * Accumulate a principal plus an optional level annuity, returning the full
 * period-by-period schedule so the UI can chart the interest/contribution split.
 */
export function compoundInterest(input: CompoundInterestInput): CompoundInterestResult {
  const { principal, annualRate, years, frequency } = input;
  const contribution = input.contribution ?? 0;
  const timing = input.contributionTiming ?? "end";
  const effective = effectiveAnnualRate(annualRate, frequency);

  // Continuous compounding is charted monthly so the schedule stays readable.
  const chartPeriods = frequency === "continuous" ? 12 : frequency;
  const totalPeriods = Math.max(1, Math.round(years * chartPeriods));
  const periodRate =
    frequency === "continuous"
      ? Math.exp(annualRate / chartPeriods) - 1
      : annualRate / frequency;

  const schedule: {
    period: number;
    year: number;
    openingBalance: number;
    contribution: number;
    interest: number;
    closingBalance: number;
  }[] = [];
  let balance = principal;
  let contributed = principal;

  for (let period = 1; period <= totalPeriods; period += 1) {
    const openingBalance = balance;
    let interest: number;

    if (timing === "begin") {
      balance += contribution;
      interest = balance * periodRate;
      balance += interest;
    } else {
      interest = balance * periodRate;
      balance += interest + contribution;
    }
    contributed += contribution;

    schedule.push({
      period,
      year: roundArtifacts(period / chartPeriods),
      openingBalance: roundArtifacts(openingBalance),
      contribution: roundArtifacts(contribution),
      interest: roundArtifacts(interest),
      closingBalance: roundArtifacts(balance),
    });
  }

  return {
    futureValue: roundArtifacts(balance),
    totalContributed: roundArtifacts(contributed),
    interestEarned: roundArtifacts(balance - contributed),
    effectiveAnnualRate: roundArtifacts(effective),
    schedule,
  };
}

/** Present value of a level annuity-immediate, a_n⌉ = (1 − v^n)/i. */
export function annuityImmediatePresentValue(
  payment: number,
  rate: number,
  periods: number,
): number {
  if (rate === 0) return payment * periods;
  return roundArtifacts((payment * (1 - Math.pow(1 + rate, -periods))) / rate);
}

/** Present value of a level annuity-due, ä_n⌉ = a_n⌉ · (1 + i). */
export function annuityDuePresentValue(
  payment: number,
  rate: number,
  periods: number,
): number {
  return roundArtifacts(annuityImmediatePresentValue(payment, rate, periods) * (1 + rate));
}

/** Accumulated value of a level annuity-immediate, s_n⌉ = ((1+i)^n − 1)/i. */
export function annuityFutureValue(payment: number, rate: number, periods: number): number {
  if (rate === 0) return payment * periods;
  return roundArtifacts((payment * (Math.pow(1 + rate, periods) - 1)) / rate);
}

/** Net present value of an arbitrary cash-flow stream at annual effective i. */
export function netPresentValue(cashFlows: readonly CashFlow[], rate: number): number {
  return cashFlows.reduce(
    (total, flow) => total + flow.amount * Math.pow(1 + rate, -flow.time),
    0,
  );
}

/**
 * Internal rate of return by bisection on [-0.999, 10]. Bisection rather than
 * Newton because cash-flow NPV curves are frequently flat near the root, and a
 * bracketed method cannot diverge.
 */
export function internalRateOfReturn(cashFlows: readonly CashFlow[]): number | null {
  const npvAt = (rate: number): number => netPresentValue(cashFlows, rate);
  let lower = -0.9999;
  let upper = 10;
  let lowerValue = npvAt(lower);
  let upperValue = npvAt(upper);

  if (!Number.isFinite(lowerValue) || !Number.isFinite(upperValue)) return null;
  if (lowerValue * upperValue > 0) return null;

  for (let i = 0; i < 300; i += 1) {
    const mid = (lower + upper) / 2;
    const midValue = npvAt(mid);
    if (Math.abs(midValue) < 1e-12 || upper - lower < 1e-14) return roundArtifacts(mid);
    if (lowerValue * midValue < 0) {
      upper = mid;
      upperValue = midValue;
    } else {
      lower = mid;
      lowerValue = midValue;
    }
  }
  return roundArtifacts((lower + upper) / 2);
}

/** Present value, duration and convexity of a cash-flow stream. */
export function valueCashFlows(
  cashFlows: readonly CashFlow[],
  rate: number,
): CashFlowValuation {
  const presentValue = netPresentValue(cashFlows, rate);
  const horizon = cashFlows.reduce((latest, flow) => Math.max(latest, flow.time), 0);

  let weightedTime = 0;
  let weightedTimeSquared = 0;
  for (const flow of cashFlows) {
    const discounted = flow.amount * Math.pow(1 + rate, -flow.time);
    weightedTime += flow.time * discounted;
    weightedTimeSquared += flow.time * (flow.time + 1) * discounted;
  }

  const macaulay = presentValue !== 0 ? weightedTime / presentValue : 0;
  const convexity =
    presentValue !== 0 ? weightedTimeSquared / (presentValue * Math.pow(1 + rate, 2)) : 0;

  return {
    presentValue: roundArtifacts(presentValue),
    futureValue: roundArtifacts(presentValue * Math.pow(1 + rate, horizon)),
    macaulayDuration: roundArtifacts(macaulay),
    modifiedDuration: roundArtifacts(macaulay / (1 + rate)),
    convexity: roundArtifacts(convexity),
    internalRateOfReturn: internalRateOfReturn(cashFlows),
  };
}

/* ================================================================== */
/* 14. Seeded pseudo-random numbers                                    */
/* ================================================================== */

/**
 * mulberry32 — a small, fast, well-distributed 32-bit generator. Seeding makes
 * every simulation in the workbench exactly reproducible, which matters when a
 * figure has to be defensible rather than merely pretty.
 */
export class SeededRandom {
  private state: number;
  private spareNormal: number | null = null;

  constructor(seed: number) {
    // Ensure a non-zero 32-bit state even for seed 0.
    this.state = (Math.floor(seed) || 0x2f6e2b1) >>> 0;
  }

  /** Uniform on [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform on (0, 1) — safe to pass to a logarithm. */
  nextOpen(): number {
    let u = this.next();
    while (u <= 0) u = this.next();
    return u;
  }

  /** Standard normal via the polar Box-Muller transform. */
  nextNormal(): number {
    if (this.spareNormal !== null) {
      const value = this.spareNormal;
      this.spareNormal = null;
      return value;
    }
    let u: number;
    let v: number;
    let s: number;
    do {
      u = this.next() * 2 - 1;
      v = this.next() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const factor = Math.sqrt((-2 * Math.log(s)) / s);
    this.spareNormal = v * factor;
    return u * factor;
  }
}

/* ================================================================== */
/* 15. Descriptive statistics                                          */
/* ================================================================== */

/** Quantile of a *sorted* sample using linear interpolation (type 7). */
export function sortedQuantile(sorted: readonly number[], level: number): number {
  if (sorted.length === 0) return Number.NaN;
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * Math.min(1, Math.max(0, level));
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  if (lowerIndex === upperIndex) return sorted[lowerIndex];
  const weight = position - lowerIndex;
  return sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight;
}

/** Freedman-Diaconis histogram over a sorted sample. */
export function buildHistogram(sorted: readonly number[], maxBins = 48): HistogramBin[] {
  const n = sorted.length;
  if (n === 0) return [];
  const min = sorted[0];
  const max = sorted[n - 1];
  if (max === min) {
    return [{ start: min, end: min, count: n, density: 1 }];
  }

  const iqr = sortedQuantile(sorted, 0.75) - sortedQuantile(sorted, 0.25);
  const fdWidth = iqr > 0 ? (2 * iqr) / Math.cbrt(n) : 0;
  const binCount =
    fdWidth > 0
      ? Math.max(8, Math.min(maxBins, Math.ceil((max - min) / fdWidth)))
      : Math.min(maxBins, Math.max(8, Math.ceil(Math.sqrt(n))));

  const width = (max - min) / binCount;
  const counts = new Array<number>(binCount).fill(0);
  for (const value of sorted) {
    const index = Math.min(binCount - 1, Math.floor((value - min) / width));
    counts[index] += 1;
  }

  return counts.map((count, index) => ({
    start: roundArtifacts(min + index * width),
    end: roundArtifacts(min + (index + 1) * width),
    count,
    density: roundArtifacts(count / (n * width)),
  }));
}

const DEFAULT_QUANTILE_LEVELS = [0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99] as const;

/** Summarise a raw Monte Carlo sample. */
export function summariseSample(
  kind: SimulationSummary["kind"],
  values: readonly number[],
  elapsedMs: number,
): SimulationSummary {
  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);

  let mean = 0;
  for (const value of values) mean += value;
  mean /= Math.max(1, n);

  let sumSquares = 0;
  for (const value of values) {
    const deviation = value - mean;
    sumSquares += deviation * deviation;
  }
  const variance = n > 1 ? sumSquares / (n - 1) : 0;
  const standardDeviation = Math.sqrt(variance);
  const standardError = n > 0 ? standardDeviation / Math.sqrt(n) : 0;

  return {
    kind,
    paths: n,
    mean: roundArtifacts(mean),
    standardDeviation: roundArtifacts(standardDeviation),
    standardError: roundArtifacts(standardError),
    confidenceInterval: [
      roundArtifacts(mean - 1.959963984540054 * standardError),
      roundArtifacts(mean + 1.959963984540054 * standardError),
    ],
    median: roundArtifacts(sortedQuantile(sorted, 0.5)),
    min: n > 0 ? roundArtifacts(sorted[0]) : 0,
    max: n > 0 ? roundArtifacts(sorted[n - 1]) : 0,
    quantiles: DEFAULT_QUANTILE_LEVELS.map((level) => ({
      level,
      value: roundArtifacts(sortedQuantile(sorted, level)),
    })),
    histogram: buildHistogram(sorted),
    elapsedMs: Math.round(elapsedMs),
  };
}

/* ================================================================== */
/* 16. Monte Carlo simulation (batched and resumable)                  */
/* ================================================================== */

/**
 * Inverse-transform sample of the future lifetime T_x.
 *
 * Solving S(x + t) = (1 − u)·S(x) has a closed form for every law except
 * Makeham, whose survival function mixes a linear and an exponential term; that
 * case is bracketed and bisected, which always converges because Λ is strictly
 * increasing.
 */
export function sampleFutureLifetime(
  model: SurvivalModelParameters,
  age: number,
  uniform: number,
): number {
  const target = -Math.log(1 - Math.min(0.999999999999, Math.max(0, uniform)));

  switch (model.kind) {
    case "exponential":
      return target / model.mu;

    case "deMoivre": {
      const remaining = Math.max(0, model.omega - age);
      return remaining * uniform;
    }

    case "weibull": {
      const scaled = Math.pow(age / model.scale, model.shape) + target;
      return model.scale * Math.pow(scaled, 1 / model.shape) - age;
    }

    case "gompertz": {
      const lnC = Math.log(model.c);
      const inner = Math.pow(model.c, age) + (target * lnC) / model.b;
      if (inner <= 0) return Number.POSITIVE_INFINITY;
      return Math.log(inner) / lnC - age;
    }

    case "makeham": {
      // Λ(x+t) − Λ(x) = A·t + (B/ln c)·c^x·(c^t − 1) = target
      const lnC = Math.log(model.c);
      const coefficient = (model.b / lnC) * Math.pow(model.c, age);
      const excess = (t: number): number =>
        model.a * t + coefficient * (Math.pow(model.c, t) - 1) - target;

      let upper = 1;
      while (excess(upper) < 0 && upper < 1e6) upper *= 2;
      let lower = 0;
      for (let i = 0; i < 120; i += 1) {
        const mid = (lower + upper) / 2;
        if (excess(mid) < 0) lower = mid;
        else upper = mid;
      }
      return (lower + upper) / 2;
    }
  }
}

/**
 * A simulation that runs in fixed-size batches.
 *
 * This is the mechanism behind the workbench's non-blocking behaviour: the
 * Web Worker drives it in a tight loop, and the main-thread fallback drives it
 * one batch per macrotask so the browser can paint and handle input between
 * batches. Neither path can ever produce a long task.
 */
export interface BatchedSimulation {
  readonly totalPaths: number;
  /** Run up to `size` more paths; returns the number actually completed. */
  runBatch(size: number): number;
  readonly completedPaths: number;
  readonly isComplete: boolean;
  /** Collapse the accumulated sample into a summary. */
  finish(elapsedMs: number): SimulationSummary;
}

class BatchedSimulationRunner implements BatchedSimulation {
  private readonly values: number[] = [];
  private readonly random: SeededRandom;
  private readonly drawPath: (random: SeededRandom) => number;

  constructor(
    readonly totalPaths: number,
    private readonly kind: SimulationSummary["kind"],
    seed: number,
    drawPath: (random: SeededRandom) => number,
  ) {
    this.random = new SeededRandom(seed);
    this.drawPath = drawPath;
  }

  get completedPaths(): number {
    return this.values.length;
  }

  get isComplete(): boolean {
    return this.values.length >= this.totalPaths;
  }

  runBatch(size: number): number {
    const remaining = this.totalPaths - this.values.length;
    const count = Math.max(0, Math.min(size, remaining));
    for (let i = 0; i < count; i += 1) {
      this.values.push(this.drawPath(this.random));
    }
    return count;
  }

  finish(elapsedMs: number): SimulationSummary {
    return summariseSample(this.kind, this.values, elapsedMs);
  }
}

function reserveDraw(config: ActuarialReserveConfig): (random: SeededRandom) => number {
  const { policies, benefit, forceOfInterest, survival, age } = config;
  return (random: SeededRandom): number => {
    let presentValue = 0;
    for (let policy = 0; policy < policies; policy += 1) {
      const lifetime = sampleFutureLifetime(survival, age, random.nextOpen());
      if (!Number.isFinite(lifetime)) continue;
      presentValue += benefit * Math.exp(-forceOfInterest * lifetime);
    }
    return presentValue;
  };
}

function gbmDraw(config: GeometricBrownianMotionConfig): (random: SeededRandom) => number {
  const { spot, drift, volatility, horizonYears, steps } = config;
  const stepCount = Math.max(1, Math.floor(steps));
  const dt = horizonYears / stepCount;
  const drAdjusted = (drift - 0.5 * volatility * volatility) * dt;
  const diffusion = volatility * Math.sqrt(dt);

  return (random: SeededRandom): number => {
    let logPrice = Math.log(spot);
    for (let step = 0; step < stepCount; step += 1) {
      logPrice += drAdjusted + diffusion * random.nextNormal();
    }
    return Math.exp(logPrice);
  };
}

/** Build a resumable runner for any supported simulation configuration. */
export function createSimulation(config: SimulationConfig): BatchedSimulation {
  const paths = Math.max(1, Math.floor(config.paths));
  switch (config.kind) {
    case "actuarial-reserve":
      return new BatchedSimulationRunner(
        paths,
        "actuarial-reserve",
        config.seed,
        reserveDraw(config),
      );
    case "geometric-brownian-motion":
      return new BatchedSimulationRunner(
        paths,
        "geometric-brownian-motion",
        config.seed,
        gbmDraw(config),
      );
    case "pi-estimation":
      return new BatchedSimulationRunner(paths, "pi-estimation", config.seed, (random) => {
        const x = random.next();
        const y = random.next();
        return x * x + y * y <= 1 ? 4 : 0;
      });
  }
}

/** Validate a configuration before it reaches the worker. */
export function validateSimulationConfig(config: SimulationConfig): Result<SimulationConfig> {
  if (!Number.isFinite(config.paths) || config.paths < 1) {
    return fail("DOMAIN_ERROR", "The simulation needs at least one path.");
  }
  if (config.paths > 2_000_000) {
    return fail("DOMAIN_ERROR", "Path counts above 2,000,000 are refused to protect the browser.");
  }

  switch (config.kind) {
    case "actuarial-reserve":
      if (config.policies < 1) {
        return fail("DOMAIN_ERROR", "The cohort needs at least one policy.");
      }
      if (config.age < 0) {
        return fail("DOMAIN_ERROR", "Age must be non-negative.");
      }
      if (config.survival.kind === "deMoivre" && config.age >= config.survival.omega) {
        return fail(
          "DOMAIN_ERROR",
          `Under De Moivre's law nobody survives past age ${config.survival.omega}.`,
        );
      }
      if (config.forceOfInterest < 0) {
        return fail("DOMAIN_ERROR", "The force of interest cannot be negative here.");
      }
      return ok(config);

    case "geometric-brownian-motion":
      if (config.spot <= 0) return fail("DOMAIN_ERROR", "The spot price must be positive.");
      if (config.volatility < 0) return fail("DOMAIN_ERROR", "Volatility cannot be negative.");
      if (config.horizonYears <= 0) return fail("DOMAIN_ERROR", "The horizon must be positive.");
      if (config.steps < 1) return fail("DOMAIN_ERROR", "At least one time step is required.");
      return ok(config);

    case "pi-estimation":
      return ok(config);
  }
}

/**
 * Run a simulation synchronously. Used by the Web Worker (where blocking is
 * harmless) and by the test suite; the main thread always goes through the
 * batched scheduler in `lib/simulation-client.ts` instead.
 */
export function runSimulationSync(
  config: SimulationConfig,
  onProgress?: (completed: number, total: number) => void,
  batchSize = 2000,
): SimulationSummary {
  const started = Date.now();
  const simulation = createSimulation(config);
  while (!simulation.isComplete) {
    simulation.runBatch(batchSize);
    onProgress?.(simulation.completedPaths, simulation.totalPaths);
  }
  return simulation.finish(Date.now() - started);
}

/** Human-readable description of what a simulation estimates. */
export function describeSimulation(config: SimulationConfig): string {
  switch (config.kind) {
    case "actuarial-reserve":
      return `Present value of death benefits for ${config.policies.toLocaleString()} independent lives aged ${config.age}, discounted at δ = ${config.forceOfInterest}.`;
    case "geometric-brownian-motion":
      return `Terminal price of a GBM asset after ${config.horizonYears} year(s) with μ = ${config.drift} and σ = ${config.volatility}.`;
    case "pi-estimation":
      return "Rejection-sampling estimate of π from uniform points in the unit square.";
  }
}
