/**
 * AP Calculus — limits, derivatives, integrals and series.
 *
 * Covers the AB course, with the series and integration techniques that BC
 * adds. Derivative and integral answers are audited numerically by the
 * expression engine, so a wrong key cannot pass the test suite.
 */

import {
  coefTex,
  exprNum,
  factorTex,
  fracTex,
  linearTex,
  numTex,
  polyExpr,
  polyTex,
  polyValue,
  sumTex,
  tidy,
} from "@/lib/practice/format";
import {
  intExcept,
  opt,
  optFrac,
  optText,
  slips,
  slipsFrac,
  step,
  wrong,
  wrongFrac,
  wrongText,
} from "@/lib/practice/templates/helpers";
import type { Distractor, Draft, TableSpec, Template } from "@/types/practice";

const TRIPLES: readonly (readonly [number, number, number])[] = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [8, 15, 17],
  [9, 12, 15],
  [12, 16, 20],
];

function cell(value: number): string {
  return `$${numTex(value)}$`;
}

export const AP_CALCULUS_TEMPLATES: readonly Template[] = [
  /* ------------------------------------------------------------------ */
  /* Limits and continuity                                               */
  /* ------------------------------------------------------------------ */
  {
    id: "limit-factor",
    skillId: "calc-limits",
    title: "Limit of an indeterminate quotient",
    levels: [1],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const a = rng.nonZero(-5, 5);
      const r = intExcept(rng, -6, 6, [a]);
      const b = -(a + r);
      const c = a * r;
      const numerator = polyTex([1, b, c]);
      const denominator = linearTex(1, -a);
      const answer = a - r;
      return {
        stem: `What is the value of $\\displaystyle\\lim_{x \\to ${a}} \\frac{${numerator}}{${denominator}}$?`,
        answer: opt(answer),
        distractors: [
          wrong(a + r, "A sign error was made when the numerator was factored."),
          wrong(0, "Direct substitution gives $\\frac{0}{0}$, which is an indeterminate form, not the value 0."),
          wrong(-r, `The simplified expression was evaluated at $x = 0$ instead of at $x = ${a}$.`),
          ...slips(answer),
        ],
        steps: [
          step("Try direct substitution", `At $x = ${a}$ both the numerator and the denominator are 0, so the form is indeterminate.`),
          step("Factor and cancel", `$${numerator} = (${denominator})(${linearTex(1, -r)})$, so for $x \\ne ${a}$ the quotient equals $${linearTex(1, -r)}$.`),
          step("Evaluate the simplified expression", `$${numTex(a)} ${r < 0 ? "+" : "-"} ${Math.abs(r)} = ${numTex(answer)}$.`),
        ],
        hint: "0/0 means there is a common factor to cancel.",
        audit: {
          kind: "limit",
          expression: `(${polyExpr([1, b, c])})/(x - ${exprNum(a)})`,
          variable: "x",
          at: a,
        },
      };
    },
  },
  {
    id: "limit-infinity",
    skillId: "calc-limits",
    title: "Limit at infinity of a rational function",
    levels: [1],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const a = rng.nonZero(-6, 6);
      const d = intExcept(rng, 2, 7, [Math.abs(a)]);
      const numerator = [a, rng.int(-9, 9), rng.int(-9, 9)];
      const denominator = [d, rng.int(-9, 9), rng.nonZero(-9, 9)];
      const distractors: Distractor[] = [
        wrong(0, "The limit is 0 only when the denominator has the higher degree. Here the degrees are equal."),
        wrongFrac(numerator[2], denominator[2], "The constant terms were compared. For large $x$ the highest-degree terms dominate."),
        wrongFrac(d, a, "The ratio of the leading coefficients was inverted."),
      ];
      if (denominator[1] !== 0) {
        distractors.push(wrongFrac(numerator[1], denominator[1], "The coefficients of $x$ were compared instead of the coefficients of $x^2$."));
      }
      distractors.push(...slipsFrac(a, d));
      return {
        stem: `What is the value of $\\displaystyle\\lim_{x \\to \\infty} \\frac{${polyTex(numerator)}}{${polyTex(denominator)}}$?`,
        answer: optFrac(a, d),
        distractors,
        steps: [
          step("Compare degrees", "The numerator and the denominator both have degree 2."),
          step(
            "Divide every term by the highest power",
            "Dividing the numerator and the denominator by $x^2$ leaves the leading coefficients plus terms that go to 0 as $x \\to \\infty$.",
          ),
          step("Take the ratio of leading coefficients", `The limit is $${fracTex(a, d)}$.`),
        ],
        hint: "When the degrees match, the limit at infinity is the ratio of the leading coefficients.",
        audit: {
          kind: "limit",
          expression: `(${polyExpr(numerator)})/(${polyExpr(denominator)})`,
          variable: "x",
          at: Number.POSITIVE_INFINITY,
        },
      };
    },
  },
  {
    id: "limit-lhopital",
    skillId: "calc-limits",
    title: "Limit using L'Hôpital's rule",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }): Draft {
      const a = rng.int(2, 6);
      const b = intExcept(rng, 2, 7, [a]);
      const variant = rng.int(0, 3);
      if (variant === 3) {
        return {
          stem: `What is the value of $\\displaystyle\\lim_{x \\to 0} \\frac{1 - \\cos(${a}x)}{${b}x^2}$?`,
          answer: optFrac(a * a, 2 * b),
          distractors: [
            wrongFrac(a, 2 * b, `Each differentiation of $\\cos(${a}x)$ brings out a factor of ${a}; only one was kept.`),
            wrongFrac(a * a, b, "The factor of 2 from differentiating $x^2$ twice was lost."),
            wrong(0, "$\\frac{0}{0}$ is an indeterminate form, not the value 0."),
            ...slipsFrac(a * a, 2 * b),
          ],
          steps: [
            step("Check the form", "At $x = 0$ the quotient is $\\frac{0}{0}$, so L'Hôpital's rule applies."),
            step("Differentiate top and bottom", `$\\dfrac{${a}\\sin(${a}x)}{${2 * b}x}$, which is still $\\frac{0}{0}$.`),
            step("Differentiate again", `$\\dfrac{${a * a}\\cos(${a}x)}{${2 * b}}$, which at $x = 0$ equals $${fracTex(a * a, 2 * b)}$.`),
          ],
          hint: "The form is 0/0 twice, so L'Hôpital's rule is needed twice.",
          audit: { kind: "limit", expression: `(1 - cos(${a}*x))/(${b}*x^2)`, variable: "x", at: 0 },
        };
      }
      const forms = [
        {
          tex: `\\frac{\\sin(${a}x)}{${b}x}`,
          expression: `sin(${a}*x)/(${b}*x)`,
          derivative: `\\dfrac{${a}\\cos(${a}x)}{${b}}`,
        },
        {
          tex: `\\frac{e^{${a}x} - 1}{${b}x}`,
          expression: `(exp(${a}*x) - 1)/(${b}*x)`,
          derivative: `\\dfrac{${a}e^{${a}x}}{${b}}`,
        },
        {
          tex: `\\frac{\\ln(1 + ${a}x)}{${b}x}`,
          expression: `ln(1 + ${a}*x)/(${b}*x)`,
          derivative: `\\dfrac{${a}}{${b}(1 + ${a}x)}`,
        },
      ];
      const form = forms[variant];
      return {
        stem: `What is the value of $\\displaystyle\\lim_{x \\to 0} ${form.tex}$?`,
        answer: optFrac(a, b),
        distractors: [
          wrong(1, "The coefficients were ignored. The standard limit equals 1 only when the coefficients match."),
          wrong(0, "$\\frac{0}{0}$ is an indeterminate form, not the value 0."),
          wrongFrac(b, a, "The ratio of the coefficients was inverted."),
          ...slipsFrac(a, b),
        ],
        steps: [
          step("Check the form", "At $x = 0$ the quotient is $\\frac{0}{0}$, so L'Hôpital's rule applies."),
          step("Differentiate top and bottom separately", `The quotient of the derivatives is $${form.derivative}$.`),
          step("Evaluate at 0", `The limit is $${fracTex(a, b)}$.`),
        ],
        hint: "For a 0/0 form, differentiate the numerator and the denominator separately.",
        audit: { kind: "limit", expression: form.expression, variable: "x", at: 0 },
      };
    },
  },
  {
    id: "continuity-piecewise",
    skillId: "calc-continuity",
    title: "Make a piecewise function continuous",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const a = rng.nonZero(-4, 4);
      const b = rng.nonZero(-6, 6);
      const c = rng.nonZero(-3, 3);
      const left = a * c + b;
      const k = left - c * c;
      return {
        stem: `Let $f$ be the function defined below, where $k$ is a constant.\n\n$$f(x) = \\begin{cases} ${linearTex(a, b)}, & x < ${c} \\\\ x^2 + k, & x \\ge ${c} \\end{cases}$$\n\nFor what value of $k$ is $f$ continuous at $x = ${c}$?`,
        answer: opt(k),
        distractors: [
          wrong(left, `That is the left-hand limit. The $${c * c}$ from the other piece still has to be subtracted.`),
          wrong(c * c - left, "The two one-sided limits were subtracted in the wrong order."),
          wrong(left + c * c, `The $${c * c}$ was added instead of subtracted.`),
          ...slips(k),
        ],
        steps: [
          step("Find the left-hand limit", `As $x \\to ${c}^-$, $f(x) \\to ${numTex(a)}(${numTex(c)}) ${b < 0 ? "-" : "+"} ${Math.abs(b)} = ${numTex(left)}$.`),
          step("Find the right-hand limit", `As $x \\to ${c}^+$, $f(x) \\to (${numTex(c)})^2 + k = ${c * c} + k$.`),
          step("Set them equal", `$${c * c} + k = ${numTex(left)}$, so $k = ${numTex(k)}$.`),
        ],
        hint: "Continuity at a point requires the two one-sided limits to agree.",
        audit: {
          kind: "root",
          expression: `${exprNum(a)}*${exprNum(c)} + ${exprNum(b)} - (${exprNum(c)}^2 + k)`,
          variable: "k",
        },
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Derivative rules                                                    */
  /* ------------------------------------------------------------------ */
  {
    id: "deriv-power",
    skillId: "calc-derivative-rules",
    title: "Differentiate a polynomial",
    levels: [1],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const coefficients = [rng.nonZero(-3, 3), rng.int(-5, 5), rng.int(-6, 6), rng.nonZero(-9, 9)];
      const [a, b, c, d] = coefficients;
      const k = rng.pick([-2, -1, 1, 2, 3]);
      const derivative = [3 * a, 2 * b, c];
      const answer = polyValue(derivative, k);
      return {
        stem: `If $f(x) = ${polyTex(coefficients)}$, what is the value of $f'(${k})$?`,
        answer: opt(answer),
        distractors: [
          wrong(polyValue(coefficients, k), `That is $f(${k})$: the function was evaluated, not its derivative.`),
          wrong(a * k * k + b * k + c, "The exponents were lowered, but the terms were not multiplied by the original exponents."),
          wrong(answer + d, "The derivative of the constant term is 0, so it should not appear."),
          ...slips(answer),
        ],
        steps: [
          step("Differentiate term by term", `$f'(x) = ${polyTex(derivative)}$.`),
          step("Evaluate", `$f'(${k}) = ${sumTex([3 * a * k * k, 2 * b * k, c].map((coefficient) => ({ coefficient, symbol: "" })))} = ${numTex(answer)}$.`),
        ],
        hint: "Use the power rule on each term, then substitute.",
        audit: { kind: "derivative", expression: polyExpr(coefficients), variable: "x", at: k },
      };
    },
  },
  {
    id: "deriv-product-quotient",
    skillId: "calc-derivative-rules",
    title: "Product and quotient rules from a table",
    levels: [2, 3],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      const c = rng.int(1, 5);
      const headers = ["$x$", "$f(x)$", "$f'(x)$", "$g(x)$", "$g'(x)$"];
      if (level === 2) {
        const f = rng.nonZero(-5, 5);
        const fp = rng.nonZero(-5, 5);
        const g = rng.nonZero(-5, 5);
        const gp = rng.nonZero(-5, 5);
        const answer = fp * g + f * gp;
        const table: TableSpec = { headers, rows: [[cell(c), cell(f), cell(fp), cell(g), cell(gp)]] };
        return {
          stem: `The table gives values of the differentiable functions $f$ and $g$ and of their derivatives at $x = ${c}$. If $h(x) = f(x)g(x)$, what is the value of $h'(${c})$?`,
          table,
          answer: opt(answer),
          distractors: [
            wrong(fp * gp, "The two derivatives were multiplied. The product rule is $f'g + fg'$."),
            wrong(fp * g - f * gp, "The two terms were subtracted, as in the quotient rule."),
            wrong(f * g, `That is $h(${c})$, not $h'(${c})$.`),
            ...slips(answer),
          ],
          steps: [
            step("Write the product rule", "$h'(x) = f'(x)g(x) + f(x)g'(x)$."),
            step("Substitute the table values", `$h'(${c}) = (${numTex(fp)})(${numTex(g)}) + (${numTex(f)})(${numTex(gp)}) = ${numTex(answer)}$.`),
          ],
          hint: "The derivative of a product is not the product of the derivatives.",
          audit: { kind: "value", expression: `${exprNum(fp)}*${exprNum(g)} + ${exprNum(f)}*${exprNum(gp)}` },
        };
      }
      const g = rng.pick([2, 3, -2, -3]);
      const u = rng.nonZero(-3, 3);
      const f = g * u;
      const gp = rng.nonZero(-4, 4);
      const answer = rng.nonZero(-5, 5);
      const fp = g * answer + u * gp;
      const table: TableSpec = { headers, rows: [[cell(c), cell(f), cell(fp), cell(g), cell(gp)]] };
      return {
        stem: `The table gives values of the differentiable functions $f$ and $g$ and of their derivatives at $x = ${c}$. If $h(x) = \\dfrac{f(x)}{g(x)}$, what is the value of $h'(${c})$?`,
        table,
        answer: opt(answer),
        distractors: [
          wrongFrac(fp, gp, "The two derivatives were divided. The quotient rule is $\\frac{f'g - fg'}{g^2}$."),
          wrong(-answer, "The two terms of the numerator were subtracted in the wrong order."),
          wrongFrac(fp * g + f * gp, g * g, "The terms of the numerator were added, as in the product rule."),
          wrong(fp * g - f * gp, "The numerator was not divided by the square of $g$."),
          ...slips(answer),
        ],
        steps: [
          step("Write the quotient rule", "$h'(x) = \\dfrac{f'(x)g(x) - f(x)g'(x)}{[g(x)]^2}$."),
          step(
            "Substitute the table values",
            `$h'(${c}) = \\dfrac{(${numTex(fp)})(${numTex(g)}) - (${numTex(f)})(${numTex(gp)})}{(${numTex(g)})^2} = \\dfrac{${numTex(fp * g - f * gp)}}{${g * g}} = ${numTex(answer)}$.`,
          ),
        ],
        hint: "Low d-high minus high d-low, over the square of what is below.",
        audit: {
          kind: "value",
          expression: `(${exprNum(fp)}*${exprNum(g)} - ${exprNum(f)}*${exprNum(gp)})/${exprNum(g)}^2`,
        },
      };
    },
  },
  {
    id: "deriv-exp-log",
    skillId: "calc-derivative-rules",
    title: "Differentiate exponential, logarithmic and trigonometric functions",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }): Draft {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        const a = rng.nonZero(-4, 4);
        const b = rng.pick([2, 3, 4, -2, -3]);
        const c = rng.nonZero(-5, 5);
        const answer = a * b + c;
        const exponential = `e^{${b}x}`;
        return {
          stem: `If $f(x) = ${sumTex([{ coefficient: a, symbol: exponential }, { coefficient: c, symbol: "x" }])}$, what is the value of $f'(0)$?`,
          answer: opt(answer),
          distractors: [
            wrong(a + c, `The chain-rule factor of $${b}$ from the exponent was left out.`),
            wrong(a * b, "The derivative of the linear term was dropped."),
            wrong(b + c, "The coefficient of the exponential was dropped."),
            ...slips(answer),
          ],
          steps: [
            step("Differentiate", `$f'(x) = ${sumTex([{ coefficient: a * b, symbol: exponential }, { coefficient: c, symbol: "" }])}$.`),
            step("Evaluate at 0", `$e^0 = 1$, so $f'(0) = ${numTex(a * b)} ${c < 0 ? "-" : "+"} ${Math.abs(c)} = ${numTex(answer)}$.`),
          ],
          hint: "The derivative of $e^{kx}$ is $ke^{kx}$.",
          audit: { kind: "derivative", expression: `${exprNum(a)}*exp(${exprNum(b)}*x) + ${exprNum(c)}*x`, variable: "x", at: 0 },
        };
      }
      if (variant === 1) {
        const k = rng.pick([1, 2, 3]);
        const multiple = rng.nonZero(-4, 4);
        const a = k * multiple;
        const b = rng.nonZero(-3, 3);
        const answer = multiple + 2 * b * k;
        return {
          stem: `If $f(x) = ${sumTex([{ coefficient: a, symbol: "\\ln x" }, { coefficient: b, symbol: "x^2" }])}$, what is the value of $f'(${k})$?`,
          answer: opt(answer),
          distractors: [
            wrong(a + 2 * b * k, "The derivative of $\\ln x$ is $\\frac{1}{x}$; the division by $x$ was missed."),
            wrong(multiple + b * k, "The factor of 2 from the power rule was left out."),
            wrong(multiple + 2 * b, "The value of $x$ was not substituted into the second term."),
            ...slips(answer),
          ],
          steps: [
            step("Differentiate", `$f'(x) = \\dfrac{${numTex(a)}}{x} ${b < 0 ? "-" : "+"} ${coefTex(Math.abs(2 * b), "x")}$.`),
            step("Evaluate", `$f'(${k}) = ${numTex(multiple)} ${b < 0 ? "-" : "+"} ${Math.abs(2 * b * k)} = ${numTex(answer)}$.`),
          ],
          hint: "The derivative of ln x is 1/x.",
          audit: { kind: "derivative", expression: `${exprNum(a)}*ln(x) + ${exprNum(b)}*x^2`, variable: "x", at: k },
        };
      }
      const a = rng.nonZero(-5, 5);
      const b = intExcept(rng, -5, 5, [0, a, -a]);
      const c = rng.nonZero(-4, 4);
      const atPi = rng.bool();
      const answer = (atPi ? -a : a) + c;
      return {
        stem: `If $f(x) = ${sumTex([{ coefficient: a, symbol: "\\sin x" }, { coefficient: b, symbol: "\\cos x" }, { coefficient: c, symbol: "x" }])}$, what is the value of $f'(${atPi ? "\\pi" : "0"})$?`,
        answer: opt(answer),
        distractors: [
          wrong((atPi ? -b : b) + c, "The derivatives of sine and cosine were swapped."),
          wrong(atPi ? -a : a, "The derivative of the linear term was dropped."),
          wrong((atPi ? a : -a) + c, "A sign error was made in the trigonometric part."),
          ...slips(answer),
        ],
        steps: [
          step(
            "Differentiate",
            `$f'(x) = ${sumTex([{ coefficient: a, symbol: "\\cos x" }, { coefficient: -b, symbol: "\\sin x" }, { coefficient: c, symbol: "" }])}$.`,
          ),
          step(
            "Evaluate",
            atPi
              ? `$\\cos \\pi = -1$ and $\\sin \\pi = 0$, so $f'(\\pi) = ${numTex(-a)} ${c < 0 ? "-" : "+"} ${Math.abs(c)} = ${numTex(answer)}$.`
              : `$\\cos 0 = 1$ and $\\sin 0 = 0$, so $f'(0) = ${numTex(a)} ${c < 0 ? "-" : "+"} ${Math.abs(c)} = ${numTex(answer)}$.`,
          ),
        ],
        hint: "The derivative of sin x is cos x; the derivative of cos x is −sin x.",
        audit: {
          kind: "derivative",
          expression: `${exprNum(a)}*sin(x) + ${exprNum(b)}*cos(x) + ${exprNum(c)}*x`,
          variable: "x",
          at: atPi ? Math.PI : 0,
        },
      };
    },
  },
  {
    id: "deriv-chain",
    skillId: "calc-chain-rule",
    title: "Apply the chain rule",
    levels: [2, 3],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      if (level === 2) {
        const n = rng.int(3, 5);
        const a = rng.pick([2, 3, 4, -2]);
        const inner = rng.pick([-2, -1, 1, 2]);
        const k = rng.int(-2, 3);
        const b = inner - a * k;
        const answer = n * a * inner ** (n - 1);
        return {
          stem: `If $f(x) = (${linearTex(a, b)})^{${n}}$, what is the value of $f'(${k})$?`,
          answer: opt(answer),
          distractors: [
            wrong(n * inner ** (n - 1), `The derivative of the inner function, $${a}$, was left out.`),
            wrong(n * a * inner ** n, "The exponent was not reduced by 1."),
            wrong(inner ** n, `That is $f(${k})$, not $f'(${k})$.`),
            ...slips(answer),
          ],
          steps: [
            step("Differentiate the outer power", `$${n}(${linearTex(a, b)})^{${n - 1}}$.`),
            step("Multiply by the derivative of the inside", `$f'(x) = ${n}(${linearTex(a, b)})^{${n - 1}} \\cdot (${numTex(a)})$.`),
            step("Evaluate", `At $x = ${k}$ the inside equals $${numTex(inner)}$, so $f'(${k}) = ${n}(${numTex(inner)})^{${n - 1}}(${numTex(a)}) = ${numTex(answer)}$.`),
          ],
          hint: "Differentiate the outside, keep the inside, then multiply by the derivative of the inside.",
          audit: { kind: "derivative", expression: `(${exprNum(a)}*x + ${exprNum(b)})^${n}`, variable: "x", at: k },
        };
      }
      const c = rng.int(1, 4);
      const d = intExcept(rng, 1, 6, [c]);
      const gpAtC = rng.nonZero(-4, 4);
      const fpAtD = rng.nonZero(-5, 5);
      const fpAtC = intExcept(rng, -5, 5, [0, fpAtD]);
      const gpAtD = intExcept(rng, -4, 4, [0, gpAtC]);
      const rowFor = (x: number): string[] =>
        x === c
          ? [cell(c), cell(rng.int(-6, 6)), cell(fpAtC), cell(d), cell(gpAtC)]
          : [cell(d), cell(rng.int(-6, 6)), cell(fpAtD), cell(rng.int(-6, 6)), cell(gpAtD)];
      const table: TableSpec = {
        headers: ["$x$", "$f(x)$", "$f'(x)$", "$g(x)$", "$g'(x)$"],
        rows: [Math.min(c, d), Math.max(c, d)].map(rowFor),
      };
      const answer = fpAtD * gpAtC;
      return {
        stem: `The table gives selected values of the differentiable functions $f$ and $g$ and of their derivatives. If $h(x) = f(g(x))$, what is the value of $h'(${c})$?`,
        table,
        answer: opt(answer),
        distractors: [
          wrong(fpAtC * gpAtC, `$f'$ was evaluated at $x = ${c}$ instead of at $g(${c}) = ${d}$.`),
          wrong(fpAtD, `The factor $g'(${c})$ was left out.`),
          wrong(fpAtD * gpAtD, `$g'$ was evaluated at $x = ${d}$ instead of at $x = ${c}$.`),
          ...slips(answer),
        ],
        steps: [
          step("Write the chain rule", "$h'(x) = f'(g(x)) \\cdot g'(x)$."),
          step("Find the inner value", `$g(${c}) = ${d}$, so $f'$ is evaluated at ${d}.`),
          step("Multiply", `$h'(${c}) = f'(${d}) \\cdot g'(${c}) = (${numTex(fpAtD)})(${numTex(gpAtC)}) = ${numTex(answer)}$.`),
        ],
        hint: "Evaluate f′ at g(c), not at c.",
        audit: { kind: "value", expression: `${exprNum(fpAtD)}*${exprNum(gpAtC)}` },
      };
    },
  },
  {
    id: "deriv-implicit",
    skillId: "calc-chain-rule",
    title: "Implicit differentiation",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const a = rng.int(1, 3);
      const b = rng.pick([0, 1, -1, 2]);
      const c = rng.int(1, 3);
      const x0 = rng.nonZero(-3, 3);
      const banned = [0];
      if ((b * x0) % (2 * c) === 0) banned.push(-(b * x0) / (2 * c));
      if (b !== 0 && (2 * a * x0) % b === 0) banned.push(-(2 * a * x0) / b);
      const y0 = intExcept(rng, -3, 3, banned);
      const total = a * x0 * x0 + b * x0 * y0 + c * y0 * y0;
      const top = -(2 * a * x0 + b * y0);
      const bottom = b * x0 + 2 * c * y0;
      const curve = sumTex([
        { coefficient: a, symbol: "x^2" },
        { coefficient: b, symbol: "xy" },
        { coefficient: c, symbol: "y^2" },
      ]);
      const general =
        b === 0
          ? `\\dfrac{dy}{dx} = -\\dfrac{${coefTex(2 * a, "x")}}{${coefTex(2 * c, "y")}}`
          : `\\dfrac{dy}{dx} = -\\dfrac{${sumTex([{ coefficient: 2 * a, symbol: "x" }, { coefficient: b, symbol: "y" }])}}{${sumTex([{ coefficient: b, symbol: "x" }, { coefficient: 2 * c, symbol: "y" }])}}`;
      return {
        stem: `What is the slope of the line tangent to the curve $${curve} = ${total}$ at the point $(${x0}, ${y0})$?`,
        answer: optFrac(top, bottom),
        distractors: [
          wrongFrac(-top, bottom, "The negative sign that appears when the terms are rearranged was dropped."),
          wrongFrac(-bottom, -top, "The expression for $\\frac{dy}{dx}$ was inverted."),
          wrongFrac(-2 * a * x0, 2 * c * y0, "The term $xy$ was not differentiated with the product rule."),
          wrongFrac(-x0, y0, "The coefficients were dropped when differentiating."),
          ...slipsFrac(top, bottom),
        ],
        steps: [
          step(
            "Differentiate both sides with respect to x",
            b === 0
              ? `$${coefTex(2 * a, "x")} + ${coefTex(2 * c, "y")}\\dfrac{dy}{dx} = 0$.`
              : "Every $y$ is a function of $x$, so $y^2$ needs the chain rule and $xy$ needs the product rule.",
          ),
          step("Solve for the derivative", `$${general}$.`),
          step("Substitute the point", `At $(${x0}, ${y0})$ the slope is $${fracTex(top, bottom)}$.`),
        ],
        hint: "Differentiate both sides, treating y as a function of x, then solve for dy/dx.",
        audit: {
          kind: "value",
          expression: `-(2*${a}*${exprNum(x0)} + ${exprNum(b)}*${exprNum(y0)})/(${exprNum(b)}*${exprNum(x0)} + 2*${c}*${exprNum(y0)})`,
        },
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Applications of the derivative                                      */
  /* ------------------------------------------------------------------ */
  {
    id: "tangent-line",
    skillId: "calc-tangents-motion",
    title: "Equation of a tangent line",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const a = rng.nonZero(-3, 3);
      const b = rng.int(-5, 5);
      const c0 = rng.int(-6, 6);
      const k = rng.nonZero(-3, 3);
      const value = a * k * k + b * k + c0;
      const slope = 2 * a * k + b;
      const intercept = value - slope * k;
      return {
        stem: `Let $f(x) = ${polyTex([a, b, c0])}$. The line tangent to the graph of $f$ at $x = ${k}$ has equation $y = mx + c$. What is the value of $c$?`,
        answer: opt(intercept),
        distractors: [
          wrong(value, `That is $f(${k})$, the $y$-coordinate of the point of tangency.`),
          wrong(c0, "That is the $y$-intercept of the curve, not of the tangent line."),
          wrong(value + slope * k, "A sign error was made when solving for the intercept."),
          wrong(slope, "That is $m$, the slope of the tangent line."),
          ...slips(intercept),
        ],
        steps: [
          step("Find the slope", `$f'(x) = ${linearTex(2 * a, b)}$, so $m = f'(${k}) = ${numTex(slope)}$.`),
          step("Find the point", `$f(${k}) = ${numTex(value)}$, so the line passes through $(${k}, ${numTex(value)})$.`),
          step("Solve for the intercept", `$${numTex(value)} = (${numTex(slope)})(${numTex(k)}) + c$, so $c = ${numTex(intercept)}$.`),
        ],
        hint: "The tangent line has slope f′(k) and passes through (k, f(k)).",
        audit: {
          kind: "value",
          expression: `(${exprNum(a)}*${exprNum(k)}^2 + ${exprNum(b)}*${exprNum(k)} + ${exprNum(c0)}) - (2*${exprNum(a)}*${exprNum(k)} + ${exprNum(b)})*${exprNum(k)}`,
        },
      };
    },
  },
  {
    id: "motion",
    skillId: "calc-tangents-motion",
    title: "Particle motion",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }): Draft {
      const r1 = rng.int(1, 4);
      const r2 = r1 + rng.pick([2, 4]);
      const position = [1, -1.5 * (r1 + r2), 3 * r1 * r2, 0];
      const velocity = [3, -3 * (r1 + r2), 3 * r1 * r2];
      const setup = `A particle moves along the $x$-axis so that its position at time $t \\ge 0$ is $x(t) = ${polyTex(position, "t")}$.`;
      if (rng.bool()) {
        return {
          stem: `${setup} At what time $t$ is the particle first at rest?`,
          answer: opt(r1),
          distractors: [
            wrong(r2, "That is the second time the velocity is zero."),
            wrong((r1 + r2) / 2, "That is when the acceleration is zero, not the velocity."),
            wrong(0, "$t = 0$ is when the position is zero. At rest means the velocity is zero."),
            ...slips(r1),
          ],
          steps: [
            step("Find the velocity", `$v(t) = x'(t) = ${polyTex(velocity, "t")}$.`),
            step("Set it equal to zero", `$3(t - ${r1})(t - ${r2}) = 0$, so $t = ${r1}$ or $t = ${r2}$.`),
            step("Choose the first time", `The particle is first at rest at $t = ${r1}$.`),
          ],
          hint: "At rest means velocity is zero, and velocity is the derivative of position.",
          audit: { kind: "root", expression: polyExpr(velocity, "t"), variable: "t" },
        };
      }
      const k = intExcept(rng, 1, 5, [(r1 + r2) / 2]);
      const acceleration = 6 * k - 3 * (r1 + r2);
      return {
        stem: `${setup} What is the acceleration of the particle at time $t = ${k}$?`,
        answer: opt(acceleration),
        distractors: [
          wrong(polyValue(velocity, k), "That is the velocity at that time. Acceleration is the derivative of velocity."),
          wrong(polyValue(position, k), "That is the position at that time."),
          wrong(6 * k, "The constant term of the second derivative was dropped."),
          ...slips(acceleration),
        ],
        steps: [
          step("Find the velocity", `$v(t) = x'(t) = ${polyTex(velocity, "t")}$.`),
          step("Find the acceleration", `$a(t) = v'(t) = ${linearTex(6, -3 * (r1 + r2), "t")}$.`),
          step("Evaluate", `$a(${k}) = ${6 * k} - ${3 * (r1 + r2)} = ${numTex(acceleration)}$.`),
        ],
        hint: "Acceleration is the second derivative of position.",
        audit: { kind: "derivative", expression: polyExpr(velocity, "t"), variable: "t", at: k },
      };
    },
  },
  {
    id: "critical-points",
    skillId: "calc-optimization",
    title: "Locate a local extremum",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const p = rng.int(-4, 2);
      const q = p + rng.pick([2, 4, 6]);
      const c = rng.int(-5, 5);
      const f = [1, -1.5 * (p + q), 3 * p * q, c];
      const derivative = [3, -3 * (p + q), 3 * p * q];
      const askMin = rng.bool();
      const answer = askMin ? q : p;
      const other = askMin ? p : q;
      return {
        stem: `Let $f(x) = ${polyTex(f)}$. At what value of $x$ does $f$ have a local ${askMin ? "minimum" : "maximum"}?`,
        answer: opt(answer),
        distractors: [
          wrong(
            other,
            askMin
              ? `At $x = ${other}$ the derivative changes from positive to negative, which is a local maximum.`
              : `At $x = ${other}$ the derivative changes from negative to positive, which is a local minimum.`,
          ),
          wrong((p + q) / 2, "That is the inflection point, where $f''(x) = 0$."),
          ...slips(answer),
        ],
        steps: [
          step(
            "Find the critical points",
            `$f'(x) = ${polyTex(derivative)} = 3${p === 0 ? `x${factorTex(q)}` : q === 0 ? `x${factorTex(p)}` : `${factorTex(p)}${factorTex(q)}`}$, which is zero at $x = ${numTex(p)}$ and $x = ${numTex(q)}$.`,
          ),
          step(
            "Check the sign of the derivative",
            `$f'(x)$ is positive for $x < ${numTex(p)}$, negative between the critical points, and positive for $x > ${numTex(q)}$.`,
          ),
          step(
            "Classify",
            `$f$ rises then falls at $x = ${numTex(p)}$ (local maximum) and falls then rises at $x = ${numTex(q)}$ (local minimum).`,
          ),
        ],
        hint: "Find where f′ is zero, then check how its sign changes.",
        audit: { kind: "root", expression: polyExpr(derivative), variable: "x" },
      };
    },
  },
  {
    id: "optimization-fence",
    skillId: "calc-optimization",
    title: "Optimize an area",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }): Draft {
      const length = rng.pick([40, 60, 80, 100, 120, 160, 200, 240]);
      const width = length / 4;
      const area = (length * length) / 8;
      const setup = `A farmer has ${length} meters of fencing to build a rectangular pen along a straight river. No fence is needed on the side along the river.`;
      const steps = [
        step("Write the area in one variable", `Let $x$ be the length of each side perpendicular to the river. The side parallel to the river is $${length} - 2x$, so $A(x) = x(${length} - 2x) = ${length}x - 2x^2$.`),
        step("Set the derivative equal to zero", `$A'(x) = ${length} - 4x = 0$ gives $x = ${width}$.`),
        step("Confirm and evaluate", `$A''(x) = -4 < 0$, so this is a maximum. The pen is ${width} by ${length / 2} meters, with area $${numTex(area)}$ square meters.`),
      ];
      if (rng.bool()) {
        return {
          stem: `${setup} What is the greatest possible area, in square meters, of the pen?`,
          answer: opt(area),
          distractors: [
            wrong((length * length) / 16, "The pen was treated as a square fenced on all four sides."),
            wrong(tidy((length * length) / 9, 2), "The three fenced sides were made equal. The side along the river should be twice as long as the others."),
            wrong((length * length) / 4, "The whole length of fencing was used for a single side."),
            ...slips(area, length),
          ],
          steps,
          hint: "Write the area as a function of one side length, then set its derivative to zero.",
          audit: { kind: "value", expression: `(${length}/4)*(${length} - 2*(${length}/4))` },
        };
      }
      return {
        stem: `${setup} When the area of the pen is as large as possible, what is the length, in meters, of each side perpendicular to the river?`,
        answer: opt(width),
        distractors: [
          wrong(length / 2, "That is the side parallel to the river."),
          wrongFrac(length, 3, "Three equal sides do not give the greatest area."),
          wrong(area, "That is the greatest area, not a side length."),
          ...slips(width, 5),
        ],
        steps,
        hint: "Write the area as a function of one side length, then set its derivative to zero.",
        audit: { kind: "root", expression: `${length} - 4*x`, variable: "x" },
      };
    },
  },
  {
    id: "related-rates",
    skillId: "calc-related-rates",
    title: "Related rates",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }): Draft {
      const variant = rng.int(0, 2);
      const rate = rng.int(2, 5);
      const radius = rng.int(3, 9);
      if (variant === 0) {
        const answer = 2 * radius * rate;
        return {
          stem: `The radius of a circle is increasing at a constant rate of ${rate} centimeters per second. At the instant when the radius is ${radius} centimeters, the area of the circle is increasing at a rate of $k\\pi$ square centimeters per second. What is the value of $k$?`,
          answer: opt(answer),
          distractors: [
            wrong(radius * rate, "The factor of 2 from differentiating $r^2$ was left out."),
            wrong(radius * radius * rate, "The area formula was multiplied by the rate without being differentiated."),
            wrong(2 * radius, "The rate of change of the radius was not included."),
            ...slips(answer, rate),
          ],
          steps: [
            step("Relate the quantities", "$A = \\pi r^2$."),
            step("Differentiate with respect to time", "$\\dfrac{dA}{dt} = 2\\pi r \\dfrac{dr}{dt}$."),
            step("Substitute", `$\\dfrac{dA}{dt} = 2\\pi(${radius})(${rate}) = ${answer}\\pi$, so $k = ${answer}$.`),
          ],
          hint: "Differentiate the area formula with respect to time, using the chain rule.",
          audit: { kind: "value", expression: `2*${radius}*${rate}` },
        };
      }
      if (variant === 1) {
        const answer = 4 * radius * radius * rate;
        return {
          stem: `The radius of a spherical balloon is increasing at a constant rate of ${rate} centimeters per second. At the instant when the radius is ${radius} centimeters, the volume of the balloon is increasing at a rate of $k\\pi$ cubic centimeters per second. What is the value of $k$?`,
          answer: opt(answer),
          distractors: [
            wrongFrac(4 * radius ** 3 * rate, 3, "The volume formula was multiplied by the rate without being differentiated."),
            wrong(4 * radius * radius, "The rate of change of the radius was not included."),
            wrong(4 * radius * rate, "The derivative of $r^3$ is $3r^2$, not $3r$."),
            ...slips(answer, rate),
          ],
          steps: [
            step("Relate the quantities", "$V = \\dfrac{4}{3}\\pi r^3$."),
            step("Differentiate with respect to time", "$\\dfrac{dV}{dt} = 4\\pi r^2 \\dfrac{dr}{dt}$."),
            step("Substitute", `$\\dfrac{dV}{dt} = 4\\pi(${radius})^2(${rate}) = ${numTex(answer)}\\pi$, so $k = ${numTex(answer)}$.`),
          ],
          hint: "Differentiate the volume formula with respect to time, using the chain rule.",
          audit: { kind: "value", expression: `4*${radius}^2*${rate}` },
        };
      }
      const [x, y, ladder] = rng.pick(TRIPLES);
      return {
        stem: `A ${ladder}-foot ladder leans against a vertical wall. The bottom of the ladder slides away from the wall at a constant rate of ${rate} feet per second. At the instant when the bottom of the ladder is ${x} feet from the wall, at what rate, in feet per second, is the top of the ladder sliding down the wall?`,
        answer: optFrac(x * rate, y),
        distractors: [
          wrongFrac(y * rate, x, "The ratio of the two distances was inverted."),
          wrong(rate, "The two ends of the ladder do not move at the same speed."),
          wrongFrac(x * rate, ladder, "The length of the ladder was used in place of the height of its top."),
          ...slipsFrac(x * rate, y),
        ],
        steps: [
          step("Relate the quantities", `$x^2 + y^2 = ${ladder * ladder}$, where $x$ is the distance from the wall and $y$ is the height of the top.`),
          step("Differentiate with respect to time", "$2x\\dfrac{dx}{dt} + 2y\\dfrac{dy}{dt} = 0$, so $\\dfrac{dy}{dt} = -\\dfrac{x}{y}\\dfrac{dx}{dt}$."),
          step("Find the height at that instant", `$y = \\sqrt{${ladder * ladder} - ${x * x}} = ${y}$.`),
          step("Substitute", `$\\dfrac{dy}{dt} = -\\dfrac{${x}}{${y}}(${rate}) = ${fracTex(-x * rate, y)}$. The top slides down at $${fracTex(x * rate, y)}$ feet per second.`),
        ],
        hint: "Differentiate the Pythagorean relationship with respect to time.",
        audit: { kind: "value", expression: `${x}*${rate}/sqrt(${ladder}^2 - ${x}^2)` },
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Integrals                                                           */
  /* ------------------------------------------------------------------ */
  {
    id: "integral-power",
    skillId: "calc-definite-integrals",
    title: "Evaluate a definite integral",
    levels: [1],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const p = rng.pick([1, 2, -1]);
      const q = rng.int(-3, 3);
      const r = rng.int(-5, 5);
      const integrand = [3 * p, 2 * q, r];
      const antiderivative = [p, q, r, 0];
      const lower = rng.int(-2, 1);
      const upper = lower + rng.int(1, 3);
      const top = polyValue(antiderivative, upper);
      const bottom = polyValue(antiderivative, lower);
      const answer = top - bottom;
      return {
        stem: `What is the value of $\\displaystyle\\int_{${lower}}^{${upper}} \\left(${polyTex(integrand)}\\right)dx$?`,
        answer: opt(answer),
        distractors: [
          wrong(
            polyValue(integrand, upper) - polyValue(integrand, lower),
            "The integrand was evaluated at the limits. An antiderivative has to be found first.",
          ),
          wrong(top + bottom, "The two values of the antiderivative were added instead of subtracted."),
          wrong(bottom - top, "The limits were subtracted in the wrong order."),
          wrong(top, "The value of the antiderivative at the lower limit was not subtracted."),
          ...slips(answer),
        ],
        steps: [
          step("Find an antiderivative", `$F(x) = ${polyTex(antiderivative)}$.`),
          step("Evaluate at the limits", `$F(${upper}) = ${numTex(top)}$ and $F(${lower}) = ${numTex(bottom)}$.`),
          step("Subtract", `$${numTex(top)} - ${bottom < 0 ? `(${numTex(bottom)})` : numTex(bottom)} = ${numTex(answer)}$.`),
        ],
        hint: "Find an antiderivative, then subtract its value at the lower limit from its value at the upper limit.",
        audit: { kind: "integral", expression: polyExpr(integrand), variable: "x", lower, upper },
      };
    },
  },
  {
    id: "integral-usub",
    skillId: "calc-definite-integrals",
    title: "Integrate by substitution",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const n = rng.int(1, 3);
      const a = rng.int(1, 3);
      const k = rng.pick([1, 2]);
      const c = 2 * (n + 1);
      const power = n === 1 ? "" : `^{${n}}`;
      const top = (k * k + a) ** (n + 1);
      const bottom = a ** (n + 1);
      const answer = top - bottom;
      return {
        stem: `What is the value of $\\displaystyle\\int_{0}^{${k}} ${c}x\\left(x^2 + ${a}\\right)${power}dx$?`,
        answer: opt(answer),
        distractors: [
          wrong(top, "The value of the antiderivative at the lower limit was not subtracted."),
          wrong(k ** (n + 1), "The limits of integration were not converted to values of $u$."),
          wrong(c * k * (k * k + a) ** n, "The integrand was evaluated at the upper limit instead of being integrated."),
          ...slips(answer),
        ],
        steps: [
          step("Choose the substitution", `Let $u = x^2 + ${a}$, so $du = 2x\\,dx$ and $${c}x\\,dx = ${n + 1}\\,du$.`),
          step("Convert the limits", `When $x = 0$, $u = ${a}$. When $x = ${k}$, $u = ${k * k + a}$.`),
          step(
            "Integrate in u",
            `$\\displaystyle\\int_{${a}}^{${k * k + a}} ${n + 1}u${power}\\,du = \\Big[u^{${n + 1}}\\Big]_{${a}}^{${k * k + a}} = ${numTex(top)} - ${numTex(bottom)} = ${numTex(answer)}$.`,
          ),
        ],
        hint: "Let u be the expression inside the parentheses, and change the limits to match.",
        audit: { kind: "integral", expression: `${c}*x*(x^2 + ${a})^${n}`, variable: "x", lower: 0, upper: k },
      };
    },
  },
  {
    id: "riemann-trapezoid",
    skillId: "calc-definite-integrals",
    title: "Trapezoidal approximation from a table",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const xs = [rng.int(0, 2)];
      const widths = [rng.int(1, 3), rng.int(1, 3), rng.int(1, 3)];
      for (const width of widths) xs.push(xs[xs.length - 1] + width);
      const fs = [rng.int(2, 15), rng.int(2, 15), rng.int(2, 15), rng.int(2, 15)];
      const trapezoid = tidy(widths.reduce((total, width, index) => total + (width * (fs[index] + fs[index + 1])) / 2, 0));
      const left = widths.reduce((total, width, index) => total + width * fs[index], 0);
      const right = widths.reduce((total, width, index) => total + width * fs[index + 1], 0);
      const table: TableSpec = {
        headers: ["$x$", ...xs.map(cell)],
        rows: [["$f(x)$", ...fs.map(cell)]],
      };
      const terms = widths.map((width, index) => `\\tfrac{1}{2}(${width})(${fs[index]} + ${fs[index + 1]})`);
      return {
        stem: `The table gives values of a continuous function $f$ at selected values of $x$. What is the trapezoidal approximation of $\\displaystyle\\int_{${xs[0]}}^{${xs[3]}} f(x)\\,dx$ using the three subintervals indicated by the table?`,
        table,
        answer: opt(trapezoid),
        distractors: [
          wrong(left, "That is the left Riemann sum."),
          wrong(right, "That is the right Riemann sum."),
          wrong(2 * trapezoid, "The factor of $\\frac{1}{2}$ in the area of each trapezoid was left out."),
          ...slips(trapezoid),
        ],
        steps: [
          step("Find the width of each subinterval", `The widths are ${widths.join(", ")}. They need not be equal.`),
          step("Add the trapezoid areas", `Each trapezoid has area $\\tfrac{1}{2}(\\text{width})(\\text{left height} + \\text{right height})$: $${terms.join(" + ")}$.`),
          step("Simplify", `The sum is $${numTex(trapezoid)}$.`),
        ],
        hint: "Each trapezoid's area is its width times the average of its two heights.",
        audit: {
          kind: "value",
          expression: widths.map((width, index) => `${width}*(${fs[index]} + ${fs[index + 1]})/2`).join(" + "),
        },
      };
    },
  },
  {
    id: "ftc-derivative",
    skillId: "calc-ftc",
    title: "Differentiate an integral",
    levels: [2, 3],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      if (level === 2) {
        const lower = rng.int(-2, 2);
        const b = rng.int(-4, 4);
        const c = rng.int(-5, 5);
        const k = intExcept(rng, -3, 4, [lower]);
        const f = (t: number): number => t * t + b * t + c;
        return {
          stem: `Let $g(x) = \\displaystyle\\int_{${lower}}^{x} \\left(${polyTex([1, b, c], "t")}\\right)dt$. What is the value of $g'(${k})$?`,
          answer: opt(f(k)),
          distractors: [
            wrong(f(k) - f(lower), "The value of the integrand at the lower limit was subtracted. The lower limit is a constant and does not affect the derivative."),
            wrong(2 * k + b, "The integrand was differentiated instead of evaluated."),
            wrong(f(lower), "The integrand was evaluated at the lower limit instead of at $x$."),
            ...slips(f(k)),
          ],
          steps: [
            step("Apply the Fundamental Theorem of Calculus", `$\\dfrac{d}{dx}\\displaystyle\\int_{a}^{x} f(t)\\,dt = f(x)$, so $g'(x) = ${polyTex([1, b, c])}$.`),
            step("Evaluate", `$g'(${k}) = ${numTex(f(k))}$.`),
          ],
          hint: "Differentiating an integral with respect to its upper limit returns the integrand.",
          audit: {
            kind: "derivative",
            expression: `x^3/3 + ${exprNum(b)}*x^2/2 + ${exprNum(c)}*x`,
            variable: "x",
            at: k,
          },
        };
      }
      const a = rng.int(1, 4);
      const b = rng.nonZero(-5, 5);
      const k = rng.pick([-2, -1, 1, 2, 3]);
      const answer = (a * k * k + b) * 2 * k;
      return {
        stem: `Let $g(x) = \\displaystyle\\int_{1}^{x^2} \\left(${linearTex(a, b, "t")}\\right)dt$. What is the value of $g'(${k})$?`,
        answer: opt(answer),
        distractors: [
          wrong(a * k * k + b, "The chain-rule factor $2x$ from the upper limit was left out."),
          wrong((a * k + b) * 2 * k, "The upper limit $x^2$ was not substituted into the integrand."),
          wrong(a * k + b, "The integrand was evaluated at $x$ and the chain rule was not applied."),
          ...slips(answer),
        ],
        steps: [
          step("Apply the Fundamental Theorem with the chain rule", "$\\dfrac{d}{dx}\\displaystyle\\int_{a}^{u(x)} f(t)\\,dt = f(u(x)) \\cdot u'(x)$."),
          step("Substitute", `$g'(x) = \\left(${coefTex(a, "x^2")} ${b < 0 ? "-" : "+"} ${Math.abs(b)}\\right)(2x)$.`),
          step("Evaluate", `$g'(${k}) = (${numTex(a * k * k + b)})(${numTex(2 * k)}) = ${numTex(answer)}$.`),
        ],
        hint: "When the upper limit is a function of x, multiply by its derivative.",
        audit: {
          kind: "derivative",
          expression: `${a}*x^4/2 + ${exprNum(b)}*x^2`,
          variable: "x",
          at: k,
        },
      };
    },
  },
  {
    id: "average-value",
    skillId: "calc-integral-applications",
    title: "Average value of a function",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const p = rng.pick([1, 2]);
      const q = rng.int(-3, 3);
      const r = rng.int(-4, 6);
      const b = rng.int(2, 4);
      const f = [3 * p, 2 * q, r];
      const average = p * b * b + q * b + r;
      return {
        stem: `What is the average value of $f(x) = ${polyTex(f)}$ on the interval $[0, ${b}]$?`,
        answer: opt(average),
        distractors: [
          wrong(b * average, "The integral was not divided by the length of the interval."),
          wrong(tidy((polyValue(f, 0) + polyValue(f, b)) / 2), "The values at the two endpoints were averaged. The average value of a function uses its integral."),
          wrong(tidy(polyValue(f, b / 2)), "The function was evaluated at the midpoint of the interval."),
          ...slips(average),
        ],
        steps: [
          step("Write the formula", "The average value of $f$ on $[a, b]$ is $\\dfrac{1}{b - a}\\displaystyle\\int_{a}^{b} f(x)\\,dx$."),
          step("Integrate", `$\\displaystyle\\int_{0}^{${b}} \\left(${polyTex(f)}\\right)dx = \\Big[${polyTex([p, q, r, 0])}\\Big]_{0}^{${b}} = ${numTex(b * average)}$.`),
          step("Divide by the length of the interval", `$${numTex(b * average)} \\div ${b} = ${numTex(average)}$.`),
        ],
        hint: "Integrate over the interval, then divide by its length.",
        audit: { kind: "integral", expression: `(${polyExpr(f)})/${b}`, variable: "x", lower: 0, upper: b },
        insight: "The mean of a continuous random variable is an average value of exactly this kind, weighted by its density.",
      };
    },
  },
  {
    id: "area-between",
    skillId: "calc-integral-applications",
    title: "Area between two curves",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const p = rng.int(-3, 2);
      const width = rng.int(1, 5);
      const q = p + width;
      const line = linearTex(p + q, -p * q);
      const cube = width ** 3;
      return {
        stem: `What is the area of the region enclosed by the graphs of $y = x^2$ and $y = ${line}$?`,
        answer: optFrac(cube, 6),
        distractors: [
          wrongFrac(-cube, 6, "The upper curve was subtracted from the lower one. An area cannot be negative."),
          wrongFrac(cube, 4, "The greatest vertical gap was multiplied by the width, which gives a rectangle larger than the region."),
          wrongFrac(q ** 3 - p ** 3, 3, "Only the area under the parabola was found."),
          ...slipsFrac(cube, 6),
        ],
        steps: [
          step("Find where the curves meet", `$x^2 = ${line}$ gives $x = ${numTex(p)}$ and $x = ${numTex(q)}$.`),
          step("Decide which curve is on top", `Between the intersection points the line lies above the parabola.`),
          step(
            "Integrate top minus bottom",
            `$\\displaystyle\\int_{${p}}^{${q}} \\left(${line} - x^2\\right)dx = ${fracTex(cube, 6)}$.`,
          ),
        ],
        hint: "Integrate the upper curve minus the lower curve between the intersection points.",
        audit: {
          kind: "integral",
          expression: `${exprNum(p + q)}*x - ${exprNum(p * q)} - x^2`,
          variable: "x",
          lower: p,
          upper: q,
        },
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Series and further integration (BC)                                 */
  /* ------------------------------------------------------------------ */
  {
    id: "geometric-series",
    skillId: "calc-series",
    title: "Sum an infinite geometric series",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const a = rng.int(2, 9);
      const [rn, rd] = rng.pick([
        [1, 2],
        [1, 3],
        [2, 3],
        [1, 4],
        [3, 4],
        [-1, 2],
        [-1, 3],
        [2, 5],
        [-2, 3],
        [1, 5],
      ]);
      return {
        stem: `What is the sum of the infinite series $\\displaystyle\\sum_{n=0}^{\\infty} ${a}\\left(${fracTex(rn, rd)}\\right)^{n}$?`,
        answer: optFrac(a * rd, rd - rn),
        distractors: [
          wrongFrac(a * rd, rd + rn, "The sign of the ratio was reversed in $1 - r$."),
          wrongFrac(a * rn, rd - rn, "The first term was taken to be $ar$. The series starts at $n = 0$, so the first term is $a$."),
          wrongFrac(a * (rd - rn), rd, "The first term was multiplied by $1 - r$ instead of divided by it."),
          ...slipsFrac(a * rd, rd - rn),
        ],
        steps: [
          step("Identify the first term and ratio", `$a = ${a}$ and $r = ${fracTex(rn, rd)}$. Since $|r| < 1$, the series converges.`),
          step("Apply the formula", `$\\dfrac{a}{1 - r} = \\dfrac{${a}}{${fracTex(rd - rn, rd)}} = ${fracTex(a * rd, rd - rn)}$.`),
        ],
        hint: "A geometric series with |r| < 1 sums to a/(1 − r).",
        audit: { kind: "value", expression: `${a}/(1 - (${rn}/${rd}))` },
        insight: "The present value of a level perpetuity is a geometric series in the discount factor, summed with this same formula.",
      };
    },
  },
  {
    id: "taylor-coefficient",
    skillId: "calc-series",
    title: "Coefficient of a Maclaurin series",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const factorials = [1, 1, 2, 6, 24];
      const n = rng.pick([2, 3, 4]);
      const derivatives = [rng.nonZero(-6, 6), rng.nonZero(-6, 6), rng.nonZero(-8, 8), rng.nonZero(-12, 12), rng.nonZero(-24, 24)];
      const table: TableSpec = {
        headers: ["$n$", "$0$", "$1$", "$2$", "$3$", "$4$"],
        rows: [["$f^{(n)}(0)$", ...derivatives.map(cell)]],
      };
      const distractors: Distractor[] = [
        wrong(derivatives[n], `The derivative was not divided by $${n}!$.`),
        wrongFrac(derivatives[n], n, `The derivative was divided by $${n}$ instead of by $${n}! = ${factorials[n]}$.`),
        wrongFrac(derivatives[n - 1], factorials[n - 1], `That is the coefficient of $x^{${n - 1}}$.`),
        ...slipsFrac(derivatives[n], factorials[n]),
      ];
      return {
        stem: `The function $f$ has derivatives of all orders. The table gives $f^{(n)}(0)$ for $n = 0, 1, 2, 3, 4$. What is the coefficient of $x^{${n}}$ in the Maclaurin series for $f$?`,
        table,
        answer: optFrac(derivatives[n], factorials[n]),
        distractors,
        steps: [
          step("Recall the general term", "The Maclaurin series for $f$ is $\\displaystyle\\sum_{n=0}^{\\infty} \\dfrac{f^{(n)}(0)}{n!}x^n$."),
          step("Read the table", `$f^{(${n})}(0) = ${numTex(derivatives[n])}$ and $${n}! = ${factorials[n]}$.`),
          step("Divide", `The coefficient is $${fracTex(derivatives[n], factorials[n])}$.`),
        ],
        hint: "The coefficient of xⁿ is the nth derivative at 0 divided by n factorial.",
        audit: { kind: "value", expression: `${exprNum(derivatives[n])}/${factorials[n]}` },
      };
    },
  },
  {
    id: "integration-by-parts",
    skillId: "calc-advanced-integration",
    title: "Integration by parts",
    levels: [3],
    formats: ["choice"],
    build({ rng }): Draft {
      const a = rng.int(2, 5);
      const family = rng.int(0, 2);
      const inverse = `\\frac{1}{${a}}`;
      const inverseSquare = `\\frac{1}{${a * a}}`;
      const half = `\\frac{1}{${2 * a}}`;
      const partsRule = "Integration by parts: $\\displaystyle\\int u\\,dv = uv - \\int v\\,du$.";
      if (family === 0) {
        const e = `e^{${a}x}`;
        return {
          stem: `Which of the following is equal to $\\displaystyle\\int x${e}\\,dx$?`,
          answer: optText(`$${inverse}x${e} - ${inverseSquare}${e} + C$`),
          distractors: [
            wrongText(`$${inverse}x${e} + ${inverseSquare}${e} + C$`, "The sign of the second term is wrong: the formula subtracts $\\int v\\,du$."),
            wrongText(`$${half}x^2${e} + C$`, "Each factor was integrated separately. The integral of a product is not the product of the integrals."),
            wrongText(`$x${e} - ${e} + C$`, `The factor $${inverse}$ from integrating $${e}$ was left out.`),
          ],
          steps: [
            step("Choose the parts", `${partsRule} Let $u = x$ and $dv = ${e}\\,dx$, so $du = dx$ and $v = ${inverse}${e}$.`),
            step("Apply the formula", `$${inverse}x${e} - \\displaystyle\\int ${inverse}${e}\\,dx$.`),
            step("Finish the remaining integral", `$${inverse}x${e} - ${inverseSquare}${e} + C$.`),
          ],
          hint: "Let u be the factor that becomes simpler when differentiated.",
        };
      }
      const angle = `(${a}x)`;
      if (family === 1) {
        return {
          stem: `Which of the following is equal to $\\displaystyle\\int x\\cos${angle}\\,dx$?`,
          answer: optText(`$${inverse}x\\sin${angle} + ${inverseSquare}\\cos${angle} + C$`),
          distractors: [
            wrongText(`$${inverse}x\\sin${angle} - ${inverseSquare}\\cos${angle} + C$`, "The sign of the second term is wrong: subtracting the integral of sine gives a positive cosine."),
            wrongText(`$${half}x^2\\sin${angle} + C$`, "Each factor was integrated separately. The integral of a product is not the product of the integrals."),
            wrongText(`$x\\sin${angle} + \\cos${angle} + C$`, `The factor $${inverse}$ from integrating $\\cos${angle}$ was left out.`),
          ],
          steps: [
            step("Choose the parts", `${partsRule} Let $u = x$ and $dv = \\cos${angle}\\,dx$, so $du = dx$ and $v = ${inverse}\\sin${angle}$.`),
            step("Apply the formula", `$${inverse}x\\sin${angle} - \\displaystyle\\int ${inverse}\\sin${angle}\\,dx$.`),
            step("Finish the remaining integral", `$${inverse}x\\sin${angle} + ${inverseSquare}\\cos${angle} + C$.`),
          ],
          hint: "Let u be the factor that becomes simpler when differentiated.",
        };
      }
      return {
        stem: `Which of the following is equal to $\\displaystyle\\int x\\sin${angle}\\,dx$?`,
        answer: optText(`$-${inverse}x\\cos${angle} + ${inverseSquare}\\sin${angle} + C$`),
        distractors: [
          wrongText(`$${inverse}x\\cos${angle} + ${inverseSquare}\\sin${angle} + C$`, "The antiderivative of sine is negative cosine; the sign of the first term is wrong."),
          wrongText(`$-${half}x^2\\cos${angle} + C$`, "Each factor was integrated separately. The integral of a product is not the product of the integrals."),
          wrongText(`$-x\\cos${angle} + \\sin${angle} + C$`, `The factor $${inverse}$ from integrating $\\sin${angle}$ was left out.`),
        ],
        steps: [
          step("Choose the parts", `${partsRule} Let $u = x$ and $dv = \\sin${angle}\\,dx$, so $du = dx$ and $v = -${inverse}\\cos${angle}$.`),
          step("Apply the formula", `$-${inverse}x\\cos${angle} + \\displaystyle\\int ${inverse}\\cos${angle}\\,dx$.`),
          step("Finish the remaining integral", `$-${inverse}x\\cos${angle} + ${inverseSquare}\\sin${angle} + C$.`),
        ],
        hint: "Let u be the factor that becomes simpler when differentiated.",
      };
    },
  },
  {
    id: "improper-integral",
    skillId: "calc-advanced-integration",
    title: "Evaluate an improper integral",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }): Draft {
      const a = rng.int(1, 9);
      if (rng.bool()) {
        const p = rng.int(2, 5);
        return {
          stem: `What is the value of $\\displaystyle\\int_{1}^{\\infty} \\frac{${a}}{x^{${p}}}\\,dx$?`,
          answer: optFrac(a, p - 1),
          distractors: [
            wrongFrac(a, p + 1, "The power rule was applied as though the exponent were positive."),
            wrongFrac(a, p, "The antiderivative was divided by the original exponent instead of the new one."),
            wrong(a * (p - 1), "The coefficient was multiplied by the new exponent instead of divided by it."),
            ...slipsFrac(a, p - 1),
          ],
          steps: [
            step("Replace infinity with a limit", `$\\displaystyle\\lim_{b \\to \\infty}\\int_{1}^{b} ${coefTex(a, `x^{-${p}}`)}\\,dx$.`),
            step("Integrate", `An antiderivative is $-\\dfrac{${a}}{${p - 1}}x^{-${p - 1}}$.`),
            step("Evaluate the limit", `As $b \\to \\infty$ the term in $b$ goes to 0, leaving $${fracTex(a, p - 1)}$.`),
          ],
          hint: "Write the integral as a limit, integrate with the power rule, then let the upper limit grow.",
          audit: { kind: "integral", expression: `${a}*u^(${p} - 2)`, variable: "u", lower: 0, upper: 1 },
        };
      }
      const b = rng.int(2, 6);
      const integrand = coefTex(a, `e^{-${b}x}`);
      return {
        stem: `What is the value of $\\displaystyle\\int_{0}^{\\infty} ${integrand}\\,dx$?`,
        answer: optFrac(a, b),
        distractors: [
          wrong(a * b, `The antiderivative was multiplied by ${b} instead of divided by it.`),
          wrongFrac(-a, b, "The sign from evaluating at the lower limit was lost. The integrand is positive, so the integral must be positive."),
          wrong(a, `The factor of $\\frac{1}{${b}}$ from the exponent was left out.`),
          ...slipsFrac(a, b),
        ],
        steps: [
          step("Replace infinity with a limit", `$\\displaystyle\\lim_{t \\to \\infty}\\int_{0}^{t} ${integrand}\\,dx$.`),
          step("Integrate", `An antiderivative is $-${a === b ? "" : fracTex(a, b)}e^{-${b}x}$.`),
          step("Evaluate the limit", `As $t \\to \\infty$ the exponential goes to 0, leaving $0 - \\left(-${fracTex(a, b)}\\right) = ${fracTex(a, b)}$.`),
        ],
        hint: "Write the integral as a limit; the exponential term vanishes at infinity.",
        audit: { kind: "integral", expression: `${a}*exp(-${b}*x)`, variable: "x", lower: 0, upper: 40 },
        insight:
          "When the coefficient equals the rate in the exponent, this integral is exactly 1. That is the check that an exponential waiting time is a valid probability density, the first continuous model on Exam P.",
      };
    },
  },
];
