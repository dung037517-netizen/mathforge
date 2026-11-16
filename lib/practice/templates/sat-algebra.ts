/**
 * SAT Math — Algebra.
 *
 * Linear equations, linear functions, systems and inequalities. Each template
 * picks its numbers so the answer is clean, derives the distractors from
 * specific mistakes, and — where the answer is a number — states an audit the
 * engine can verify independently.
 */

import {
  coefTex,
  exprNum,
  factorTex,
  fracTex,
  gcd,
  linearExpr,
  linearTex,
  money,
  numTex,
  signedFracTex,
  signedTermTex,
  signedTex,
  sumTex,
} from "@/lib/practice/format";
import {
  intExcept,
  opt,
  optFrac,
  optText,
  pickName,
  signedInt,
  slips,
  slipsFrac,
  step,
  wrong,
  wrongFrac,
  wrongText,
} from "@/lib/practice/templates/helpers";
import type { Template } from "@/types/practice";

function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

/** LaTeX for a·x + b·y. */
function twoVarTex(a: number, b: number): string {
  return sumTex([
    { coefficient: a, symbol: "x" },
    { coefficient: b, symbol: "y" },
  ]);
}

type Relation = "<" | ">" | "<=" | ">=";

const RELATION_TEX: Readonly<Record<Relation, string>> = {
  "<": "<",
  ">": ">",
  "<=": "\\le",
  ">=": "\\ge",
};

const FLIPPED: Readonly<Record<Relation, Relation>> = {
  "<": ">",
  ">": "<",
  "<=": ">=",
  ">=": "<=",
};

interface ModelContext {
  /** The quantity on the left of the equation and what the input measures. */
  readonly describe: (equation: string) => string;
  readonly symbol: string;
  readonly input: string;
  readonly increasing: boolean;
  readonly rate: (n: number) => string;
  readonly fixed: (n: number) => string;
  readonly total: (n: number) => string;
  readonly inputMeaning: (n: number) => string;
}

const MODEL_CONTEXTS: readonly ModelContext[] = [
  {
    describe: (equation) =>
      `The equation ${equation} gives the total charge $C$, in dollars, for a plumbing repair that takes $h$ hours.`,
    symbol: "C",
    input: "h",
    increasing: true,
    rate: (n) => `The plumber charges ${money(n)} for each hour of work.`,
    fixed: (n) => `The plumber charges a flat fee of ${money(n)} in addition to the hourly charge.`,
    total: (n) => `The total charge for the repair is ${money(n)}.`,
    inputMeaning: (n) => `The repair takes ${n} hours.`,
  },
  {
    describe: (equation) =>
      `The equation ${equation} gives the volume $V$, in liters, of water in a tank $t$ minutes after a drain is opened.`,
    symbol: "V",
    input: "t",
    increasing: false,
    rate: (n) => `The tank loses ${n} liters of water each minute.`,
    fixed: (n) => `The tank holds ${n} liters of water when the drain is opened.`,
    total: (n) => `The tank holds ${n} liters of water after the drain has been open for one hour.`,
    inputMeaning: (n) => `The tank is empty after ${n} minutes.`,
  },
  {
    describe: (equation) =>
      `The equation ${equation} gives a customer's monthly phone bill $P$, in dollars, when $g$ gigabytes of data are used.`,
    symbol: "P",
    input: "g",
    increasing: true,
    rate: (n) => `Each gigabyte of data adds ${money(n)} to the bill.`,
    fixed: (n) => `The bill is ${money(n)} in a month when no data is used.`,
    total: (n) => `The customer's bill is ${money(n)} every month.`,
    inputMeaning: (n) => `The customer uses ${n} gigabytes of data each month.`,
  },
  {
    describe: (equation) =>
      `The equation ${equation} gives the height $h$, in centimeters, of a candle $t$ hours after it is lit.`,
    symbol: "h",
    input: "t",
    increasing: false,
    rate: (n) => `The candle's height decreases by ${n} centimeters each hour.`,
    fixed: (n) => `The candle is ${n} centimeters tall when it is lit.`,
    total: (n) => `The candle is ${n} centimeters tall after it has burned for one hour.`,
    inputMeaning: (n) => `The candle burns out after ${n} hours.`,
  },
  {
    describe: (equation) =>
      `The equation ${equation} gives the amount $S$, in dollars, in a savings jar $w$ weeks after a student starts saving.`,
    symbol: "S",
    input: "w",
    increasing: true,
    rate: (n) => `The student adds ${money(n)} to the jar each week.`,
    fixed: (n) => `The jar held ${money(n)} when the student started saving.`,
    total: (n) => `The student's goal is to save ${money(n)}.`,
    inputMeaning: (n) => `The student saves for ${n} weeks.`,
  },
];

export const SAT_ALGEBRA_TEMPLATES: readonly Template[] = [
  /* ------------------------------------------------------------------ */
  /* Linear equations                                                    */
  /* ------------------------------------------------------------------ */
  {
    id: "lin-two-step",
    skillId: "sat-linear-equations",
    title: "Solve a two-step equation",
    levels: [1],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const a = signedInt(rng, 2, 9);
      const x = rng.nonZero(-9, 9);
      const b = signedInt(rng, 1, 15);
      const c = a * x + b;
      return {
        stem: `What value of $x$ satisfies the equation $${linearTex(a, b)} = ${numTex(c)}$?`,
        answer: opt(x),
        distractors: [
          wrongFrac(c + b, a, "The constant was added to the right side instead of being subtracted."),
          wrong(c - b, "The constant was removed, but the result was never divided by the coefficient of x."),
          wrong(-x, "A sign was lost when dividing by the coefficient of x."),
          wrongFrac(c - a * b, a, "Only one term was divided by the coefficient before the constant was removed."),
          ...slips(x),
        ],
        steps: [
          step(
            "Undo the constant",
            `${b > 0 ? "Subtract" : "Add"} $${numTex(Math.abs(b))}$ ${b > 0 ? "from" : "to"} both sides: $${coefTex(a, "x")} = ${numTex(c - b)}$.`,
          ),
          step("Undo the coefficient", `Divide both sides by $${numTex(a)}$: $x = ${numTex(x)}$.`),
          step(
            "Check",
            `Substitute back: $${numTex(a)}(${numTex(x)}) ${signedTex(b)} = ${numTex(c)}$, which matches the right side.`,
          ),
        ],
        hint: "Undo the operations in reverse order — the constant first, then the coefficient.",
        audit: { kind: "root", expression: `${linearExpr(a, b)} - ${exprNum(c)}`, variable: "x" },
      };
    },
  },
  {
    id: "lin-distribute",
    skillId: "sat-linear-equations",
    title: "Solve an equation with parentheses",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const a = rng.int(2, 6);
      const b = intExcept(rng, -4, 5, [0, a, -a]);
      const x = rng.nonZero(-8, 8);
      const p = signedInt(rng, 1, 6);
      const q = rng.nonZero(-9, 9);
      const r = a * (x - p) + q - b * x;
      const lhs = `${a}${factorTex(p)} ${signedTex(q)}`;
      const rhs = linearTex(b, r);
      return {
        stem: `If $${lhs} = ${rhs}$, what is the value of $x$?`,
        answer: opt(x),
        distractors: [
          wrongFrac(
            r + p - q,
            a - b,
            `Only $x$ was multiplied by $${a}$; the second term inside the parentheses was left unchanged.`,
          ),
          wrongFrac(r - a * p - q, a - b, "A sign error was made when distributing across the parentheses."),
          wrongFrac(
            r + a * p - q,
            a + b,
            "The x-term on the right was added to the left side instead of being subtracted.",
          ),
          wrong(-x, "A sign was lost in the final division."),
          ...slips(x),
        ],
        steps: [
          step("Distribute", `$${linearTex(a, -a * p + q)} = ${rhs}$.`),
          step(
            "Collect like terms",
            `Move the $x$-terms to the left and the constants to the right: $${coefTex(a - b, "x")} = ${numTex(r + a * p - q)}$.`,
          ),
          step("Solve", `Divide by $${numTex(a - b)}$: $x = ${numTex(x)}$.`),
        ],
        hint: "Distribute first, then gather the x-terms on one side.",
        audit: {
          kind: "root",
          expression: `${a}*(x - ${exprNum(p)}) + ${exprNum(q)} - (${linearExpr(b, r)})`,
          variable: "x",
        },
      };
    },
  },
  {
    id: "lin-fractions",
    skillId: "sat-linear-equations",
    title: "Solve an equation with fractions",
    levels: [2, 3],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      if (level === 2) {
        const a = rng.int(2, 6);
        const b = intExcept(rng, 2, 6, [a]);
        const x = lcm(a, b) * signedInt(rng, 1, 3);
        const c = x / a + x / b;
        return {
          stem: `If $\\frac{x}{${a}} + \\frac{x}{${b}} = ${numTex(c)}$, what is the value of $x$?`,
          answer: opt(x),
          distractors: [
            wrongFrac(c * (a + b), 2, `The denominators were added, treating the left side as $\\frac{2x}{${a + b}}$.`),
            wrong(c * a * b, "Both sides were multiplied by the common denominator, but the result was not divided by the sum of the coefficients."),
            wrongFrac(c, a + b, "The denominators were cleared on the left, but the right side was not multiplied by the same number."),
            wrong(c * (a + b), `The two fractions were combined as $\\frac{x}{${a + b}}$.`),
            ...slips(x),
          ],
          steps: [
            step(
              "Clear the denominators",
              `Multiply every term by $${a * b}$: $${b}x + ${a}x = ${numTex(c * a * b)}$.`,
            ),
            step("Combine", `$${a + b}x = ${numTex(c * a * b)}$.`),
            step("Solve", `$x = ${numTex(x)}$.`),
          ],
          hint: "Multiply every term by a common denominator so no fractions remain.",
          audit: { kind: "root", expression: `x/${a} + x/${b} - ${exprNum(c)}`, variable: "x" },
        };
      }

      const a = rng.int(2, 5);
      const b = intExcept(rng, 2, 5, [a]);
      const u = rng.int(-4, 6);
      const v = intExcept(rng, -4, 6, [u]);
      const p = rng.int(1, 6);
      const x = a * u - p;
      const q = x - b * v;
      const c = u - v;
      const numeratorLeft = linearTex(1, p);
      const numeratorRight = linearTex(1, -q);
      return {
        stem: `What value of $x$ satisfies $\\frac{${numeratorLeft}}{${a}} - \\frac{${numeratorRight}}{${b}} = ${numTex(c)}$?`,
        answer: opt(x),
        distractors: [
          wrongFrac(
            a * b * c - b * p + a * q,
            b - a,
            "The subtraction was not distributed across the whole second numerator.",
          ),
          wrongFrac(c - b * p - a * q, b - a, "The right side was not multiplied by the common denominator."),
          wrongFrac(a * b * c - b * p - a * q, b + a, "The x-terms were added instead of subtracted."),
          wrong(-x, "A sign was lost in the final division."),
          ...slips(x),
        ],
        steps: [
          step(
            "Clear the denominators",
            `Multiply every term by $${a * b}$: $${b}(${numeratorLeft}) - ${a}(${numeratorRight}) = ${numTex(a * b * c)}$.`,
          ),
          step(
            "Distribute carefully",
            `The minus sign applies to both terms of the second numerator: $${linearTex(b - a, b * p + a * q)} = ${numTex(a * b * c)}$.`,
          ),
          step("Solve", `$${coefTex(b - a, "x")} = ${numTex(a * b * c - b * p - a * q)}$, so $x = ${numTex(x)}$.`),
        ],
        hint: "Multiply through by the product of the denominators, and keep the minus sign attached to the entire second numerator.",
        audit: {
          kind: "root",
          expression: `(x + ${p})/${a} - (x - ${exprNum(q)})/${b} - ${exprNum(c)}`,
          variable: "x",
        },
      };
    },
  },
  {
    id: "lin-solution-count",
    skillId: "sat-linear-equations",
    title: "No solution or infinitely many",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const p = rng.int(2, 6);
      const r = intExcept(rng, 1, 5, [p]);
      const q = rng.int(1, 6);
      const simplified = linearTex(p + r, -p * q);
      if (rng.bool()) {
        const s = -p * q + rng.nonZero(-6, 6);
        return {
          stem: `In the equation $${p}(x - ${q}) + ${coefTex(r, "x")} = kx ${signedTex(s)}$, $k$ is a constant. If the equation has no solution, what is the value of $k$?`,
          answer: opt(p + r),
          distractors: [
            wrong(p, `Only the coefficient from the parentheses was used; the separate $${coefTex(r, "x")}$ term was left out.`),
            wrong(r, "Only the x-term outside the parentheses was counted."),
            wrong(p * r, "The two x-coefficients were multiplied instead of added."),
            wrong(p - r, "The two x-coefficients were subtracted instead of added."),
            wrong(-p * q, "That is the constant term on the left side, not the coefficient of x."),
            ...slips(p + r),
          ],
          steps: [
            step("Simplify the left side", `$${p}(x - ${q}) + ${coefTex(r, "x")} = ${simplified}$.`),
            step(
              "Use the no-solution condition",
              "A linear equation has no solution when the two sides have the same coefficient of $x$ but different constants, so the lines never meet.",
            ),
            step(
              "Match the coefficients",
              `$k = ${p + r}$. The constants $${numTex(-p * q)}$ and $${numTex(s)}$ are different, so there is indeed no solution.`,
            ),
          ],
          hint: "Simplify the left side, then compare the coefficient of x on each side.",
          audit: { kind: "value", expression: `${p} + ${r}` },
        };
      }
      return {
        stem: `In the equation $${p}(x - ${q}) + ${coefTex(r, "x")} = ${coefTex(p + r, "x")} + c$, $c$ is a constant. If the equation has infinitely many solutions, what is the value of $c$?`,
        answer: opt(-p * q),
        distractors: [
          wrong(p * q, `The sign from distributing across $(x - ${q})$ was dropped.`),
          wrong(-q, `The $${p}$ was not distributed to the constant inside the parentheses.`),
          wrong(0, "Equal x-coefficients alone do not make the two sides identical; the constants must match too."),
          wrong(p + r, "That is the coefficient of x, which already matches."),
          ...slips(-p * q),
        ],
        steps: [
          step("Simplify the left side", `$${p}(x - ${q}) + ${coefTex(r, "x")} = ${simplified}$.`),
          step(
            "Use the identity condition",
            "A linear equation has infinitely many solutions when both sides are the same expression: equal coefficients of $x$ and equal constants.",
          ),
          step("Match the constants", `The coefficients of $x$ already agree, so $c = ${numTex(-p * q)}$.`),
        ],
        hint: "Infinitely many solutions means the two sides are identical.",
        audit: { kind: "value", expression: `-(${p}*${q})` },
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Linear functions                                                    */
  /* ------------------------------------------------------------------ */
  {
    id: "slope-two-points",
    skillId: "sat-linear-functions",
    title: "Slope through two points",
    levels: [1],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const x1 = rng.int(-6, 6);
      const y1 = rng.int(-8, 8);
      const dx = rng.nonZero(-6, 6);
      let dy = rng.nonZero(-8, 8);
      if (Math.abs(dy) === Math.abs(dx)) dy += dy > 0 ? 1 : -1;
      const x2 = x1 + dx;
      const y2 = y1 + dy;
      return {
        stem: `In the $xy$-plane, a line passes through the points $(${x1}, ${y1})$ and $(${x2}, ${y2})$. What is the slope of the line?`,
        answer: optFrac(dy, dx),
        distractors: [
          wrongFrac(dx, dy, "The change in $x$ was divided by the change in $y$."),
          wrongFrac(-dy, dx, "The coordinates were subtracted in opposite orders in the numerator and the denominator."),
          wrongFrac(-dx, dy, "The ratio was inverted and a sign was lost."),
          wrong(dy, "Only the change in $y$ was found."),
          ...slipsFrac(dy, dx),
        ],
        steps: [
          step("Write the slope formula", "$m = \\dfrac{y_2 - y_1}{x_2 - x_1}$."),
          step(
            "Substitute",
            `$m = \\dfrac{${numTex(y2)} - ${y1 < 0 ? `(${numTex(y1)})` : numTex(y1)}}{${numTex(x2)} - ${x1 < 0 ? `(${numTex(x1)})` : numTex(x1)}} = \\dfrac{${numTex(dy)}}{${numTex(dx)}} = ${fracTex(dy, dx)}$.`,
          ),
        ],
        hint: "Slope is the change in y divided by the change in x, taken in the same order.",
        audit: {
          kind: "value",
          expression: `(${exprNum(y2)} - ${exprNum(y1)})/(${exprNum(x2)} - ${exprNum(x1)})`,
        },
      };
    },
  },
  {
    id: "linear-from-two-values",
    skillId: "sat-linear-functions",
    title: "Evaluate a linear function",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const slope = signedInt(rng, 2, 5);
      const intercept = rng.nonZero(-9, 9);
      const a = rng.int(-4, 4);
      const b = intExcept(rng, -4, 6, [a]);
      const c = intExcept(rng, -6, 9, [a, b, 0]);
      const fa = slope * a + intercept;
      const fb = slope * b + intercept;
      const answer = slope * c + intercept;
      return {
        stem: `The function $f$ is linear, with $f(${a}) = ${numTex(fa)}$ and $f(${b}) = ${numTex(fb)}$. What is the value of $f(${c})$?`,
        answer: opt(answer),
        distractors: [
          wrong(slope * c, "The slope was used but the $y$-intercept was left out."),
          wrong(intercept, "This is the $y$-intercept, $f(0)$, not $f$ at the requested input."),
          wrong(-slope * c + intercept, "The slope was given the wrong sign."),
          wrong(slope * (c - a), `This is only the change from $f(${a})$; the starting value was not added back.`),
          ...slips(answer),
        ],
        steps: [
          step(
            "Find the slope",
            `$m = \\dfrac{${numTex(fb)} - ${fa < 0 ? `(${numTex(fa)})` : numTex(fa)}}{${numTex(b)} - ${a < 0 ? `(${numTex(a)})` : numTex(a)}} = ${numTex(slope)}$.`,
          ),
          step(
            "Find the intercept",
            `Use $f(${a}) = ${numTex(fa)}$: $${numTex(slope)}(${numTex(a)}) + b = ${numTex(fa)}$, so $b = ${numTex(intercept)}$ and $f(x) = ${linearTex(slope, intercept)}$.`,
          ),
          step("Evaluate", `$f(${c}) = ${numTex(slope)}(${numTex(c)}) ${signedTex(intercept)} = ${numTex(answer)}$.`),
        ],
        hint: "Two values of a linear function determine its slope; one more substitution gives the intercept.",
        audit: {
          kind: "value",
          expression: `(${exprNum(fb)} - ${exprNum(fa)})/(${exprNum(b)} - ${exprNum(a)})*(${exprNum(c)} - ${exprNum(a)}) + ${exprNum(fa)}`,
        },
      };
    },
  },
  {
    id: "linear-model-interpret",
    skillId: "sat-linear-functions",
    title: "Interpret a linear model",
    levels: [1, 2],
    formats: ["choice"],
    build({ rng, level }) {
      const context = rng.pick(
        level === 1 ? MODEL_CONTEXTS.filter((entry) => entry.increasing) : MODEL_CONTEXTS,
      );
      const rate = rng.int(3, 18);
      const fixed = intExcept(rng, 20, 95, [rate]) * (context.increasing ? 1 : 2);
      const askRate = level === 1 ? true : rng.bool();
      const equation = context.increasing
        ? `$${context.symbol} = ${fixed} + ${rate}${context.input}$`
        : `$${context.symbol} = ${fixed} - ${rate}${context.input}$`;
      const target = askRate ? rate : fixed;
      const correct = askRate ? context.rate(target) : context.fixed(target);
      const swapped = askRate ? context.fixed(target) : context.rate(target);
      return {
        stem: `${context.describe(equation)} What is the best interpretation of the number $${target}$ in this context?`,
        answer: optText(correct),
        distractors: [
          wrongText(
            swapped,
            askRate
              ? "That describes the constant term, the value when the input is zero."
              : "That describes the coefficient of the variable, the change per unit.",
          ),
          wrongText(context.total(target), "The number is one part of the model, not a value of the output."),
          wrongText(context.inputMeaning(target), "The number multiplies or accompanies the input; it is not a value of the input."),
        ],
        steps: [
          step(
            "Identify the role of the number",
            askRate
              ? `$${rate}$ multiplies the input $${context.input}$, so it is the rate of change: how much $${context.symbol}$ changes when $${context.input}$ increases by 1.`
              : `$${fixed}$ is the constant term, so it is the value of $${context.symbol}$ when $${context.input} = 0$.`,
          ),
          step("Translate into the context", correct),
        ],
        hint: "The coefficient of the variable is a rate; the constant is the starting value.",
      };
    },
  },
  {
    id: "linear-model-solve",
    skillId: "sat-linear-functions",
    title: "Solve with a linear model",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const rate = rng.int(6, 24);
      const multiple = rng.int(1, 4);
      const fee = rate * multiple;
      const count = rng.int(5, 18);
      const total = fee + rate * count;
      const name = pickName(rng);
      const contexts = [
        {
          text: `A gym charges a one-time joining fee of ${money(fee)} and ${money(rate)} per month. ${name} has paid the gym a total of ${money(total)}. For how many months has ${name} been a member?`,
          unit: "months",
        },
        {
          text: `A print shop charges a setup fee of ${money(fee)} plus ${money(rate)} for each poster printed. ${name}'s order cost ${money(total)}. How many posters did ${name} order?`,
          unit: "posters",
        },
        {
          text: `A tutoring center charges a registration fee of ${money(fee)} and ${money(rate)} per session. ${name} has paid ${money(total)} in all. How many sessions has ${name} attended?`,
          unit: "sessions",
        },
      ];
      const context = rng.pick(contexts);
      return {
        stem: context.text,
        answer: opt(count),
        distractors: [
          wrong(count + multiple, "The total was divided by the rate without first subtracting the one-time fee."),
          wrong(count + 2 * multiple, "The fee was added to the total instead of subtracted."),
          wrong(rate * count, "The fee was subtracted, but the result was not divided by the rate."),
          ...slips(count),
        ],
        steps: [
          step("Write the model", `Total $= ${fee} + ${rate}n$, where $n$ is the number of ${context.unit}.`),
          step("Set it equal to the total paid", `$${fee} + ${rate}n = ${numTex(total)}$, so $${rate}n = ${numTex(total - fee)}$.`),
          step("Solve", `$n = ${count}$.`),
        ],
        hint: "Subtract the one-time fee before dividing by the rate.",
        audit: { kind: "root", expression: `${fee} + ${rate}*n - ${total}`, variable: "n" },
      };
    },
  },
  {
    id: "perpendicular-line",
    skillId: "sat-linear-functions",
    title: "Perpendicular lines",
    levels: [2, 3],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      const a = rng.int(2, 6);
      const b = intExcept(rng, 1, 6, [a]);
      const c = rng.nonZero(-12, 12);
      const equation = `${twoVarTex(a, b)} = ${numTex(c)}`;
      if (level === 2) {
        return {
          stem: `Line $\\ell$ is defined by $${equation}$. Line $k$ is perpendicular to line $\\ell$ in the $xy$-plane. What is the slope of line $k$?`,
          answer: optFrac(b, a),
          distractors: [
            wrongFrac(-a, b, "That is the slope of line $\\ell$ itself."),
            wrongFrac(a, b, "The sign was changed but the reciprocal was not taken."),
            wrongFrac(-b, a, "The reciprocal was taken but the sign was not changed."),
            wrongFrac(-a, 1, "The coefficient of $x$ is not the slope until the equation is solved for $y$."),
            ...slipsFrac(b, a),
          ],
          steps: [
            step(
              "Find the slope of the given line",
              `Solve for $y$: $y = ${fracTex(-a, b)}x ${signedFracTex(c, b)}$, so line $\\ell$ has slope $${fracTex(-a, b)}$.`,
            ),
            step(
              "Take the negative reciprocal",
              `Perpendicular slopes multiply to $-1$, so line $k$ has slope $${fracTex(b, a)}$.`,
            ),
          ],
          hint: "Perpendicular lines have slopes that are negative reciprocals.",
          audit: { kind: "root", expression: `(-${a}/${b})*s + 1`, variable: "s" },
        };
      }
      const t = signedInt(rng, 1, 3);
      const p = a * t;
      const q = rng.int(-6, 6);
      const intercept = q - b * t;
      return {
        stem: `Line $\\ell$ is defined by $${equation}$. Line $k$ is perpendicular to line $\\ell$ and passes through the point $(${p}, ${q})$. What is the $y$-intercept of line $k$?`,
        answer: opt(intercept),
        distractors: [
          wrong(q + b * t, "The slope of line $k$ was given the wrong sign."),
          wrongFrac(q * b + a * p, b, "The slope of line $\\ell$ was used instead of the perpendicular slope."),
          wrong(q, "That is the $y$-coordinate of the given point, not the $y$-intercept."),
          wrong(-intercept, "A sign was lost when solving for the intercept."),
          ...slips(intercept),
        ],
        steps: [
          step("Find the perpendicular slope", `Line $\\ell$ has slope $${fracTex(-a, b)}$, so line $k$ has slope $${fracTex(b, a)}$.`),
          step(
            "Use the point",
            `$y = ${fracTex(b, a)}x + b_k$ passes through $(${p}, ${q})$: $${numTex(q)} = ${fracTex(b, a)}(${numTex(p)}) + b_k = ${numTex(b * t)} + b_k$.`,
          ),
          step("Solve", `$b_k = ${numTex(intercept)}$.`),
        ],
        hint: "Find the perpendicular slope first, then substitute the point into y = mx + b.",
        audit: { kind: "value", expression: `${exprNum(q)} - (${b}/${a})*${exprNum(p)}` },
      };
    },
  },
  {
    id: "x-intercept",
    skillId: "sat-linear-functions",
    title: "Find an intercept",
    levels: [1],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const a = signedInt(rng, 2, 7);
      const b = intExcept(rng, -7, 7, [0, 1, -1, a]);
      const k = rng.nonZero(-8, 8);
      const c = a * k;
      return {
        stem: `The graph of $${twoVarTex(a, b)} = ${numTex(c)}$ in the $xy$-plane crosses the $x$-axis at the point $(d, 0)$. What is the value of $d$?`,
        answer: opt(k),
        distractors: [
          wrongFrac(c, b, "$x$ was set to 0 instead of $y$; this is the $y$-intercept."),
          wrong(-k, "A sign was lost when dividing."),
          wrong(c, "The constant was not divided by the coefficient of $x$."),
          wrongFrac(c, a + b, "Both coefficients were combined; on the $x$-axis only $y$ is zero."),
          ...slips(k),
        ],
        steps: [
          step("Use the definition of an x-intercept", "Every point on the $x$-axis has $y = 0$."),
          step("Substitute and solve", `$${coefTex(a, "d")} = ${numTex(c)}$, so $d = ${numTex(k)}$.`),
        ],
        hint: "On the x-axis, y is 0.",
        audit: { kind: "root", expression: `${exprNum(a)}*x - ${exprNum(c)}`, variable: "x" },
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Systems                                                             */
  /* ------------------------------------------------------------------ */
  {
    id: "system-elimination",
    skillId: "sat-linear-systems",
    title: "Solve a system of equations",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const x0 = rng.nonZero(-6, 6);
      const y0 = intExcept(rng, -6, 6, [0, x0, -x0]);
      let a1 = rng.nonZero(-5, 5);
      const b1 = rng.nonZero(-5, 5);
      const a2 = rng.nonZero(-5, 5);
      const b2 = rng.nonZero(-5, 5);
      if (a1 * b2 - a2 * b1 === 0) a1 += a1 > 0 ? 1 : -1;
      const det = a1 * b2 - a2 * b1;
      const c1 = a1 * x0 + b1 * y0;
      const c2 = a2 * x0 + b2 * y0;
      const ask = rng.pick(["x", "y", "sum"] as const);
      const system = `$$\\begin{aligned} ${twoVarTex(a1, b1)} &= ${numTex(c1)} \\\\ ${twoVarTex(a2, b2)} &= ${numTex(c2)} \\end{aligned}$$`;
      const xExpr = `(${exprNum(c1)}*${exprNum(b2)} - ${exprNum(c2)}*${exprNum(b1)})/${exprNum(det)}`;
      const yExpr = `(${exprNum(a1)}*${exprNum(c2)} - ${exprNum(a2)}*${exprNum(c1)})/${exprNum(det)}`;
      const steps = [
        step(
          "Eliminate one variable",
          `Multiply the first equation by $${numTex(b2)}$ and the second by $${numTex(b1)}$, then subtract. The $y$-terms cancel, leaving $${coefTex(det, "x")} = ${numTex(c1 * b2 - c2 * b1)}$.`,
        ),
        step("Solve for x", `$x = ${numTex(x0)}$.`),
        step(
          "Back-substitute",
          `Put $x = ${numTex(x0)}$ into the first equation: $${numTex(a1)}(${numTex(x0)}) ${signedTermTex(b1, "y")} = ${numTex(c1)}$, so $${coefTex(b1, "y")} = ${numTex(c1 - a1 * x0)}$ and $y = ${numTex(y0)}$.`,
        ),
      ];
      if (ask === "sum") {
        return {
          stem: `${system}\n\nThe solution to the given system of equations is $(x, y)$. What is the value of $x + y$?`,
          answer: opt(x0 + y0),
          distractors: [
            wrong(x0, "That is the value of $x$ alone."),
            wrong(y0, "That is the value of $y$ alone."),
            wrong(x0 - y0, "The two values were subtracted instead of added."),
            wrong(-(x0 + y0), "A sign error was made while solving."),
            ...slips(x0 + y0),
          ],
          steps: [...steps, step("Answer the question asked", `$x + y = ${numTex(x0)} + ${y0 < 0 ? `(${numTex(y0)})` : numTex(y0)} = ${numTex(x0 + y0)}$.`)],
          hint: "Solve for both variables, then answer what is actually asked.",
          audit: { kind: "value", expression: `${xExpr} + ${yExpr}` },
        };
      }
      const target = ask === "x" ? x0 : y0;
      const other = ask === "x" ? y0 : x0;
      return {
        stem: `${system}\n\nThe solution to the given system of equations is $(x, y)$. What is the value of $${ask}$?`,
        answer: opt(target),
        distractors: [
          wrong(other, `That is the value of $${ask === "x" ? "y" : "x"}$.`),
          wrong(-target, "A sign error was made while eliminating."),
          wrong(x0 + y0, "That is $x + y$, not the single value asked for."),
          wrong(target + other * 2, "The equations were combined without first matching coefficients."),
          ...slips(target),
        ],
        steps,
        hint: "Scale the equations so one variable has matching coefficients, then subtract.",
        audit: { kind: "value", expression: ask === "x" ? xExpr : yExpr },
      };
    },
  },
  {
    id: "system-word",
    skillId: "sat-linear-systems",
    title: "Set up and solve a system",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const low = rng.int(2, 8);
      const high = low + rng.int(2, 7);
      const total = rng.int(24, 60);
      const count = rng.int(6, total - 6);
      const revenue = high * count + low * (total - count);
      const contexts = [
        {
          text: `A school sold ${total} tickets to a play. Adult tickets cost ${money(high)} each and student tickets cost ${money(low)} each. Ticket sales totaled ${money(revenue)}. How many adult tickets were sold?`,
          first: "adult tickets",
          second: "student tickets",
        },
        {
          text: `A café sold ${total} drinks in one morning. Large drinks cost ${money(high)} each and small drinks cost ${money(low)} each. The drinks sold for a total of ${money(revenue)}. How many large drinks were sold?`,
          first: "large drinks",
          second: "small drinks",
        },
        {
          text: `A quiz has ${total} questions. Each long question is worth ${high} points and each short question is worth ${low} points. The quiz is worth ${numTex(revenue)} points in total. How many long questions are on the quiz?`,
          first: "long questions",
          second: "short questions",
        },
      ];
      const context = rng.pick(contexts);
      const offset = rng.int(2, 4);
      return {
        stem: context.text,
        answer: opt(count),
        distractors: [
          wrong(total - count, `That is the number of ${context.second}.`),
          wrong(
            Math.round(revenue / (high + low)),
            "The total was divided by the sum of the two unit values, ignoring how many of each there are.",
          ),
          wrong(count + offset, "An arithmetic slip was made when solving the system."),
          ...slips(count),
        ],
        steps: [
          step(
            "Define the variables",
            `Let $a$ be the number of ${context.first} and $s$ the number of ${context.second}. Then $a + s = ${total}$ and $${high}a + ${low}s = ${numTex(revenue)}$.`,
          ),
          step(
            "Substitute",
            `Replace $s$ with $${total} - a$: $${high}a + ${low}(${total} - a) = ${numTex(revenue)}$, so $${high - low}a = ${numTex(revenue - low * total)}$.`,
          ),
          step("Solve", `$a = ${count}$.`),
        ],
        hint: "Write one equation for the count and one for the total value.",
        audit: {
          kind: "root",
          expression: `${high}*x + ${low}*(${total} - x) - ${revenue}`,
          variable: "x",
        },
      };
    },
  },
  {
    id: "system-no-solution",
    skillId: "sat-linear-systems",
    title: "A system with no solution",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const a = signedInt(rng, 2, 6);
      const b = signedInt(rng, 2, 6);
      const t = rng.pick([-3, -2, 2, 3]);
      const d = b * t;
      const c = signedInt(rng, 1, 12);
      const e = c * t + rng.nonZero(-5, 5);
      const system = `$$\\begin{aligned} ${twoVarTex(a, b)} &= ${numTex(c)} \\\\ kx ${signedTermTex(d, "y")} &= ${numTex(e)} \\end{aligned}$$`;
      return {
        stem: `${system}\n\nIn the given system of equations, $k$ is a constant. If the system has no solution, what is the value of $k$?`,
        answer: opt(a * t),
        distractors: [
          wrong(a, "The coefficient of $x$ was copied without scaling it by the same factor as the coefficient of $y$."),
          wrongFrac(a, t, "The scale factor was applied in the wrong direction."),
          wrong(-a * t, "A sign was lost when scaling."),
          wrong(a + (d - b), "The difference of the $y$-coefficients was added; parallel lines need equal ratios, not equal differences."),
          ...slips(a * t),
        ],
        steps: [
          step(
            "Use the no-solution condition",
            "Two lines have no intersection when they are parallel: the coefficients of $x$ and $y$ are in the same ratio, but the constants are not.",
          ),
          step(
            "Find the scale factor",
            `The $y$-coefficients are $${numTex(b)}$ and $${numTex(d)}$, a factor of $${numTex(t)}$.`,
          ),
          step(
            "Apply it to x",
            `$k = ${numTex(a)} \\cdot ${t < 0 ? `(${numTex(t)})` : numTex(t)} = ${numTex(a * t)}$. Scaling the constant gives $${numTex(c * t)} \\ne ${numTex(e)}$, so the lines are parallel and distinct.`,
          ),
        ],
        hint: "No solution means the lines are parallel: equal ratios of coefficients.",
        audit: { kind: "root", expression: `${exprNum(a)}*${exprNum(d)} - k*${exprNum(b)}`, variable: "k" },
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Inequalities                                                        */
  /* ------------------------------------------------------------------ */
  {
    id: "inequality-solve",
    skillId: "sat-linear-inequalities",
    title: "Solve a linear inequality",
    levels: [1, 2],
    formats: ["choice"],
    build({ rng, level }) {
      const relation = rng.pick<Relation>(["<", ">", "<=", ">="]);
      const boundary = rng.nonZero(-6, 6);
      const flipped = FLIPPED[relation];
      const option = (rel: Relation, value: number): string => `$x ${RELATION_TEX[rel]} ${numTex(value)}$`;
      const distractors = [
        wrongText(option(relation, boundary), "The inequality was not reversed when dividing by a negative number."),
        wrongText(option(flipped, -boundary), "The inequality was reversed correctly, but the boundary has the wrong sign."),
        wrongText(option(relation, -boundary), "The inequality was not reversed, and the boundary has the wrong sign."),
      ];
      if (level === 1) {
        const a = rng.int(2, 6);
        const b = rng.nonZero(-9, 9);
        const c = b - a * boundary;
        const lhs = sumTex([
          { coefficient: -a, symbol: "x" },
          { coefficient: b, symbol: "" },
        ]);
        return {
          stem: `Which of the following describes all solutions to the inequality $${lhs} ${RELATION_TEX[relation]} ${numTex(c)}$?`,
          answer: optText(option(flipped, boundary)),
          distractors,
          steps: [
            step(
              "Isolate the x-term",
              `${b > 0 ? "Subtract" : "Add"} $${numTex(Math.abs(b))}$: $${coefTex(-a, "x")} ${RELATION_TEX[relation]} ${numTex(c - b)}$.`,
            ),
            step(
              "Divide by a negative number",
              `Dividing both sides by $${numTex(-a)}$ reverses the inequality: $x ${RELATION_TEX[flipped]} ${numTex(boundary)}$.`,
            ),
          ],
          hint: "Dividing or multiplying an inequality by a negative number reverses its direction.",
        };
      }
      const a = rng.int(2, 4);
      const b = a + rng.int(1, 4);
      const p = rng.int(1, 5);
      const c = (a - b) * boundary - a * p;
      return {
        stem: `Which of the following describes all solutions to the inequality $${a}(x + ${p}) ${RELATION_TEX[relation]} ${linearTex(b, -c)}$?`,
        answer: optText(option(flipped, -boundary)),
        distractors: [
          wrongText(option(relation, -boundary), "The inequality was not reversed when dividing by a negative number."),
          wrongText(option(flipped, boundary), "The inequality was reversed correctly, but the boundary has the wrong sign."),
          wrongText(option(relation, boundary), "The inequality was not reversed, and the boundary has the wrong sign."),
        ],
        steps: [
          step("Distribute", `$${linearTex(a, a * p)} ${RELATION_TEX[relation]} ${linearTex(b, -c)}$.`),
          step(
            "Collect like terms",
            `Subtract $${coefTex(b, "x")}$ and $${numTex(a * p)}$ from both sides: $${coefTex(a - b, "x")} ${RELATION_TEX[relation]} ${numTex(-c - a * p)}$.`,
          ),
          step(
            "Divide by a negative number",
            `Dividing by $${numTex(a - b)}$ reverses the inequality: $x ${RELATION_TEX[flipped]} ${numTex(-boundary)}$.`,
          ),
        ],
        hint: "Collect the x-terms; if their coefficient is negative, the inequality reverses when you divide.",
      };
    },
  },
  {
    id: "inequality-word",
    skillId: "sat-linear-inequalities",
    title: "Find the greatest whole number",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const each = rng.int(3, 9);
      const fixed = rng.int(8, 25);
      const count = rng.int(4, 15);
      const remainder = rng.int(1, each - 1);
      const budget = fixed + each * count + remainder;
      const name = pickName(rng);
      const contexts = [
        `${name} has ${money(budget)} to spend at a fair. Admission costs ${money(fixed)} and each ride costs ${money(each)}. What is the greatest number of rides ${name} can go on?`,
        `${name} has a ${money(budget)} gift card for a bookstore. ${name} buys a notebook for ${money(fixed)} and wants to spend the rest on pens that cost ${money(each)} each. What is the greatest number of pens ${name} can buy?`,
        `A delivery cart can carry at most ${budget} kilograms. It already holds a crate that weighs ${fixed} kilograms, and the remaining boxes weigh ${each} kilograms each. What is the greatest number of boxes that can be added?`,
      ];
      return {
        stem: rng.pick(contexts),
        answer: opt(count),
        distractors: [
          wrong(count + 1, "The quotient was rounded up, which would go over the limit."),
          wrong(Math.floor(budget / each), "The fixed amount was not subtracted before dividing."),
          wrong(Math.floor((budget + fixed) / each), "The fixed amount was added instead of subtracted."),
          wrong(count - 1, "One more would still fit under the limit."),
          ...slips(count, 2),
        ],
        steps: [
          step("Write the inequality", `$${fixed} + ${each}n \\le ${budget}$, where $n$ is the number bought or added.`),
          step("Solve", `$${each}n \\le ${budget - fixed}$, so $n \\le ${numTex((budget - fixed) / each, 2)}$.`),
          step("Use the context", `$n$ must be a whole number, so the greatest possible value is $${count}$.`),
        ],
        hint: "Set up an inequality, solve it, then round down — you cannot exceed the limit.",
        audit: { kind: "value", expression: `floor((${budget} - ${fixed})/${each})` },
      };
    },
  },
  {
    id: "inequality-point",
    skillId: "sat-linear-inequalities",
    title: "Test a point in a system of inequalities",
    levels: [3],
    formats: ["choice"],
    build({ rng }) {
      const m1 = rng.int(1, 3);
      const b1 = rng.int(-4, 2);
      const m2 = -rng.int(1, 3);
      const b2 = rng.int(6, 10);
      const lowerAt = (x: number): number => m1 * x + b1;
      const upperAt = (x: number): number => m2 * x + b2;
      const x0 = rng.pick([-1, 0, 1].filter((x) => upperAt(x) - lowerAt(x) >= 2));
      const good: readonly [number, number] = [x0, lowerAt(x0) + 1];
      const xa = intExcept(rng, -3, 3, [x0]);
      const onBoundary: readonly [number, number] = [xa, lowerAt(xa)];
      const xb = rng.int(-2, 3);
      const above: readonly [number, number] = [xb, upperAt(xb) + rng.int(1, 3)];
      const xc = rng.int(-2, 3);
      const below: readonly [number, number] = [xc, lowerAt(xc) - rng.int(2, 4)];
      const point = (pair: readonly [number, number]): string => `$(${numTex(pair[0])}, ${numTex(pair[1])})$`;
      const lowerTex = linearTex(m1, b1);
      const upperTex = linearTex(m2, b2);
      return {
        stem: `$$\\begin{aligned} y &> ${lowerTex} \\\\ y &\\le ${upperTex} \\end{aligned}$$\n\nWhich ordered pair $(x, y)$ is a solution to the given system of inequalities?`,
        answer: optText(point(good)),
        distractors: [
          wrongText(point(onBoundary), `This point lies exactly on $y = ${lowerTex}$, and the first inequality is strict.`),
          wrongText(point(above), `Here $y$ is greater than $${upperTex}$, so the second inequality fails.`),
          wrongText(point(below), `Here $y$ is less than $${lowerTex}$, so the first inequality fails.`),
        ],
        steps: [
          step(
            "Test the first inequality",
            `At $x = ${numTex(good[0])}$, $${lowerTex} = ${numTex(lowerAt(good[0]))}$, and $${numTex(good[1])} > ${numTex(lowerAt(good[0]))}$ is true.`,
          ),
          step(
            "Test the second inequality",
            `At $x = ${numTex(good[0])}$, $${upperTex} = ${numTex(upperAt(good[0]))}$, and $${numTex(good[1])} \\le ${numTex(upperAt(good[0]))}$ is true.`,
          ),
          step("Conclude", `Only ${point(good)} satisfies both inequalities.`),
        ],
        hint: "A solution must make both inequalities true. Watch for points that sit exactly on a strict boundary.",
      };
    },
  },
];
