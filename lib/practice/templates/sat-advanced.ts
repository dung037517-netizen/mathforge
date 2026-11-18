/**
 * SAT Math — Advanced Math.
 *
 * Quadratics, exponential models, polynomial structure and non-linear
 * equations.
 */

import {
  coefTex,
  exprNum,
  factorTex,
  fracTex,
  intTex,
  linearTex,
  money,
  numTex,
  numText,
  parenTex,
  polyExpr,
  polyTex,
  polyValue,
  signedTex,
  sumTex,
  tidy,
} from "@/lib/practice/format";
import {
  intExcept,
  opt,
  optText,
  pickName,
  signedInt,
  slips,
  step,
  wrong,
  wrongFrac,
  wrongText,
} from "@/lib/practice/templates/helpers";
import type { Distractor, Template } from "@/types/practice";

/** A sum of plain numbers: [8, -12, 5] → "8 - 12 + 5". */
function numberSumTex(values: readonly number[]): string {
  return sumTex(values.map((coefficient) => ({ coefficient, symbol: "" })));
}

export const SAT_ADVANCED_TEMPLATES: readonly Template[] = [
  /* ------------------------------------------------------------------ */
  /* Quadratics                                                          */
  /* ------------------------------------------------------------------ */
  {
    id: "quad-roots",
    skillId: "sat-quadratics",
    title: "Solve a quadratic by factoring",
    levels: [1, 2],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      const r1 = rng.nonZero(-9, 9);
      const r2 = intExcept(rng, -9, 9, [0, r1, -r1]);
      const low = Math.min(r1, r2);
      const high = Math.max(r1, r2);
      if (level === 1) {
        const b = -(r1 + r2);
        const c = r1 * r2;
        const poly = polyTex([1, b, c]);
        return {
          stem: `What is the greater of the two solutions to the equation $${poly} = 0$?`,
          answer: opt(high),
          distractors: [
            wrong(low, "That is the smaller of the two solutions."),
            wrong(-high, "The numbers inside the factors were read off without changing their signs."),
            wrong(-low, "The numbers inside the factors were read off without changing their signs."),
            wrong(r1 + r2, "That is the sum of the two solutions."),
            ...slips(high),
          ],
          steps: [
            step(
              "Factor",
              `Find two numbers that multiply to $${numTex(c)}$ and add to $${numTex(b)}$: $${numTex(-low)}$ and $${numTex(-high)}$. So $${poly} = ${factorTex(low)}${factorTex(high)}$.`,
            ),
            step(
              "Use the zero-product property",
              `A product is zero only when one of its factors is zero, so $x = ${numTex(low)}$ or $x = ${numTex(high)}$.`,
            ),
            step("Choose the greater solution", `$${numTex(high)} > ${numTex(low)}$, so the answer is $${numTex(high)}$.`),
          ],
          hint: "Factor the quadratic, then set each factor equal to zero.",
          audit: {
            kind: "value",
            expression: `(-(${exprNum(b)}) + sqrt((${exprNum(b)})^2 - 4*${exprNum(c)}))/2`,
          },
        };
      }
      const a = rng.pick([2, 3, 4]);
      const b = -a * (r1 + r2);
      const c = a * r1 * r2;
      return {
        stem: `What is the sum of the solutions to the equation $${polyTex([a, b, c])} = 0$?`,
        answer: opt(r1 + r2),
        distractors: [
          wrong(-(r1 + r2), "The sum of the solutions is $-\\frac{b}{a}$; the negative sign was dropped."),
          wrong(-b, `The coefficient of $x$ was not divided by the leading coefficient $${a}$.`),
          wrong(r1 * r2, "That is the product of the solutions, not their sum."),
          wrong(high, "That is only the greater solution."),
          ...slips(r1 + r2),
        ],
        steps: [
          step(
            "Divide out the common factor",
            `Every coefficient is a multiple of $${a}$, so the equation is equivalent to $${polyTex([1, b / a, c / a])} = 0$.`,
          ),
          step("Factor", `$${factorTex(low)}${factorTex(high)} = 0$, so $x = ${numTex(low)}$ or $x = ${numTex(high)}$.`),
          step(
            "Add the solutions",
            `$${numTex(low)} + ${parenTex(high)} = ${numTex(r1 + r2)}$. As a shortcut, the solutions of $ax^2 + bx + c = 0$ always add to $-\\frac{b}{a}$.`,
          ),
        ],
        hint: "Either factor and add the two solutions, or use the fact that they add to −b/a.",
        audit: { kind: "value", expression: `-(${exprNum(b)})/${a}` },
      };
    },
  },
  {
    id: "quad-vertex",
    skillId: "sat-quadratics",
    title: "Minimum or maximum of a quadratic",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const a = rng.pick([1, 2, 3, -1, -2]);
      const h = rng.nonZero(-5, 5);
      const k = intExcept(rng, -9, 12, [0, h, -a * h * h]);
      const b = -2 * a * h;
      const c = a * h * h + k;
      const kind = a > 0 ? "minimum" : "maximum";
      return {
        stem: `The function $f$ is defined by $f(x) = ${polyTex([a, b, c])}$. What is the ${kind} value of $f$?`,
        answer: opt(k),
        distractors: [
          wrong(h, `That is the $x$-value where the ${kind} occurs, not the value of the function there.`),
          wrong(c, "That is $f(0)$, the $y$-intercept of the graph."),
          wrong(
            4 * a * h * h + k,
            "The vertex was placed at $x = \\frac{b}{2a}$ instead of $x = -\\frac{b}{2a}$.",
          ),
          wrong(-k, "A sign was lost when evaluating the function at the vertex."),
          ...slips(k),
        ],
        steps: [
          step(
            "Locate the vertex",
            `The vertex is at $x = -\\dfrac{b}{2a} = -\\dfrac{${numTex(b)}}{2(${numTex(a)})} = ${numTex(h)}$.`,
          ),
          step(
            "Evaluate the function there",
            `$f(${numTex(h)}) = ${numberSumTex([a * h * h, b * h, c])} = ${numTex(k)}$.`,
          ),
          step(
            "Interpret",
            `The parabola opens ${a > 0 ? "upward" : "downward"}, so $${numTex(k)}$ is the ${kind} value of $f$.`,
          ),
        ],
        hint: "The extreme value of a quadratic occurs at its vertex, x = −b/(2a).",
        audit: {
          kind: "value",
          expression: `${exprNum(c)} - (${exprNum(b)})^2/(4*${exprNum(a)})`,
        },
      };
    },
  },
  {
    id: "quad-discriminant",
    skillId: "sat-quadratics",
    title: "Exactly one real solution",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const a = rng.pick([1, 1, 2, 3, 4]);
      const root = rng.int(2, 6);
      const c = a * root * root;
      const k = 2 * a * root;
      return {
        stem: `In the equation $${coefTex(a, "x^2")} + kx + ${c} = 0$, $k$ is a positive constant. If the equation has exactly one real solution, what is the value of $k$?`,
        answer: opt(k),
        distractors: [
          wrong(a * root, "The discriminant was written as $b^2 - ac$, without the factor of 4."),
          wrong(4 * a * root, "The square root was applied to $ac$ but not to the 4."),
          wrong(4 * a * c, "That is the value of $k^2$; the square root was never taken."),
          wrong(c, "The constant term is not the coefficient that makes the discriminant zero."),
          ...slips(k),
        ],
        steps: [
          step(
            "Use the discriminant",
            "A quadratic has exactly one real solution when its discriminant, $b^2 - 4ac$, equals zero.",
          ),
          step("Substitute", `$k^2 - 4(${a})(${c}) = 0$, so $k^2 = ${numTex(4 * a * c)}$.`),
          step("Solve", `$k$ is positive, so $k = \\sqrt{${numTex(4 * a * c)}} = ${k}$.`),
        ],
        hint: "One real solution means the discriminant is zero.",
        audit: { kind: "root", expression: `k^2 - 4*${a}*${c}`, variable: "k" },
      };
    },
  },
  {
    id: "quad-formula",
    skillId: "sat-quadratics",
    title: "Use the quadratic formula",
    levels: [2],
    formats: ["choice"],
    build({ rng }) {
      const p = rng.nonZero(-5, 5);
      const n = rng.pick([2, 3, 5, 6, 7]);
      const b = 2 * p;
      const c = p * p - n;
      const form = (lead: number, radical: string): string => `$x = ${numTex(lead)} \\pm ${radical}$`;
      return {
        stem: `What are the solutions to the equation $${polyTex([1, b, c])} = 0$?`,
        answer: optText(form(-p, `\\sqrt{${n}}`)),
        distractors: [
          wrongText(form(p, `\\sqrt{${n}}`), "The sign of $b$ was not reversed in $-b$."),
          wrongText(form(-p, `2\\sqrt{${n}}`), "The radical was not divided by the 2 in the denominator."),
          wrongText(form(-b, `\\sqrt{${n}}`), "Only the radical was divided by 2; $-b$ was left undivided."),
        ],
        steps: [
          step("Identify the coefficients", `$a = 1$, $b = ${numTex(b)}$ and $c = ${numTex(c)}$.`),
          step(
            "Compute the discriminant",
            `$b^2 - 4ac = ${numTex(b * b)} - 4(${numTex(c)}) = ${numTex(4 * n)}$.`,
          ),
          step(
            "Apply the quadratic formula",
            `$x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} = \\dfrac{${numTex(-b)} \\pm \\sqrt{${4 * n}}}{2} = \\dfrac{${numTex(-b)} \\pm 2\\sqrt{${n}}}{2} = ${numTex(-p)} \\pm \\sqrt{${n}}$.`,
          ),
        ],
        hint: "When a quadratic does not factor over the integers, use the quadratic formula and simplify the radical.",
      };
    },
  },
  {
    id: "projectile",
    skillId: "sat-quadratics",
    title: "Model a launch with a quadratic",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const metric = rng.bool();
      const a = metric ? 5 : 16;
      const unit = metric ? "meters" : "feet";
      const peakTime = rng.pick([1, 1.5, 2, 2.5, 3]);
      const b = 2 * a * peakTime;
      const c = rng.int(1, 12) * (metric ? 1 : 2);
      const peak = tidy(c + a * peakTime * peakTime);
      const askTime = rng.bool();
      const model = `h(t) = ${polyTex([-a, b, c], "t")}`;
      const setup = `An object is launched upward from a platform. Its height above the ground, in ${unit}, $t$ seconds after launch is modeled by $${model}$.`;
      const vertexStep = step(
        "Find when the height peaks",
        `The maximum of a downward-opening parabola is at its vertex: $t = -\\dfrac{b}{2a} = -\\dfrac{${b}}{2(${-a})} = ${numTex(peakTime)}$ seconds.`,
      );
      if (askTime) {
        return {
          stem: `${setup} How many seconds after launch does the object reach its maximum height?`,
          answer: opt(peakTime),
          distractors: [
            wrong(
              2 * peakTime,
              "$-\\frac{b}{a}$ was used instead of $-\\frac{b}{2a}$; that is when the object is back at its launch height.",
            ),
            wrong(peakTime / 2, "The result was divided by 2 once too often."),
            wrong(peak, `That is the maximum height, in ${unit}, not the time at which it occurs.`),
            ...slips(peakTime, 0.5),
          ],
          steps: [
            vertexStep,
            step(
              "Check",
              `$h(${numTex(peakTime)}) = ${numTex(peak)}$, and the heights half a second earlier and later are both lower.`,
            ),
          ],
          hint: "The maximum of a quadratic model is at its vertex.",
          audit: { kind: "value", expression: `${b}/(2*${a})` },
        };
      }
      return {
        stem: `${setup} What is the maximum height, in ${unit}, that the object reaches?`,
        answer: opt(peak),
        distractors: [
          wrong(c, "That is the height at launch, $h(0)$."),
          wrong(tidy(c + 2 * a * peakTime * peakTime), "The $t^2$ term was left out when the height was evaluated."),
          wrong(tidy(a * peakTime * peakTime), "The launch height was not included."),
          wrong(peakTime, "That is the time of the maximum, in seconds, not the height."),
          ...slips(peak, metric ? 1 : 4),
        ],
        steps: [
          vertexStep,
          step(
            "Evaluate the height at that time",
            `$h(${numTex(peakTime)}) = ${numberSumTex([-a * peakTime * peakTime, b * peakTime, c])} = ${numTex(peak)}$ ${unit}.`,
          ),
        ],
        hint: "Find the time of the vertex first, then substitute it into the model.",
        audit: { kind: "value", expression: `${c} + ${b}^2/(4*${a})` },
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Exponential models                                                  */
  /* ------------------------------------------------------------------ */
  {
    id: "exp-growth-value",
    skillId: "sat-exponentials",
    title: "Evaluate exponential growth",
    levels: [1, 2],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      if (level === 1) {
        const start = rng.pick([50, 100, 150, 200, 300, 400, 500]);
        const factor = rng.pick([2, 2, 3]);
        const period = rng.pick([2, 3, 4, 5, 6]);
        const periods = rng.int(2, factor === 2 ? 5 : 3);
        const hours = period * periods;
        const verb = factor === 2 ? "doubles" : "triples";
        const answer = start * factor ** periods;
        return {
          stem: `A culture contains ${start} bacteria. The number of bacteria ${verb} every ${period} hours. How many bacteria are in the culture after ${hours} hours?`,
          answer: opt(answer),
          distractors: [
            wrong(
              start * factor * periods,
              `The starting amount was multiplied by ${factor} and then by the number of periods; repeated ${factor === 2 ? "doubling" : "tripling"} multiplies by ${factor} each time.`,
            ),
            wrong(start * factor ** (periods - 1), "One period too few was counted."),
            wrong(start * factor ** (periods + 1), "One period too many was counted."),
            wrong(start * hours, "The starting amount was multiplied by the number of hours."),
            ...slips(answer, start),
          ],
          steps: [
            step("Count the periods", `$${hours} \\div ${period} = ${periods}$ periods.`),
            step(
              "Apply the factor once per period",
              `$${start} \\cdot ${factor}^{${periods}} = ${start} \\cdot ${factor ** periods} = ${numTex(answer)}$.`,
            ),
          ],
          hint: "Count how many times the quantity is multiplied, then use a power.",
          audit: { kind: "value", expression: `${start}*${factor}^(${hours}/${period})` },
        };
      }
      const principal = rng.pick([1000, 2000, 3000, 4000, 5000]);
      const rate = rng.pick([10, 20]);
      const years = rng.pick([2, 3]);
      const answer = (principal * (100 + rate) ** years) / 100 ** years;
      const name = pickName(rng);
      return {
        stem: `${name} deposits ${money(principal)} in an account that earns ${rate}% interest compounded annually, and makes no other deposits or withdrawals. What is the balance, in dollars, after ${years} years?`,
        answer: opt(answer),
        distractors: [
          wrong(
            principal + (principal * rate * years) / 100,
            "Simple interest was used: each year's interest was computed on the original deposit only.",
          ),
          wrong((principal * (100 + rate)) / 100, "Interest was applied for only one year."),
          wrong(
            (principal * (100 + rate) ** (years + 1)) / 100 ** (years + 1),
            "Interest was applied for one year too many.",
          ),
          ...slips(answer, 100),
        ],
        steps: [
          step(
            "Find the yearly growth factor",
            `Adding ${rate}% multiplies the balance by $${numTex(1 + rate / 100)}$ each year.`,
          ),
          step(
            "Apply it once per year",
            `$${intTex(principal)} \\cdot ${numTex(1 + rate / 100)}^{${years}} = ${numTex(answer)}$.`,
          ),
        ],
        hint: "Compounding multiplies by the same factor every year.",
        audit: { kind: "value", expression: `${principal}*(1 + ${rate}/100)^${years}` },
        insight:
          "This accumulation function, $(1 + i)^t$, is the starting point of interest theory on actuarial Exam FM.",
      };
    },
  },
  {
    id: "exp-model-choice",
    skillId: "sat-exponentials",
    title: "Choose an exponential model",
    levels: [2],
    formats: ["choice"],
    build({ rng }) {
      const decay = rng.bool();
      const rate = rng.pick([4, 5, 6, 8, 12, 15, 20, 25]);
      const start = rng.pick([800, 1200, 2500, 12000, 18000, 24000, 30000]);
      const contexts = decay
        ? [
            { text: `A machine purchased for ${money(start)} loses ${rate}% of its value each year.`, symbol: "V", noun: "the machine's value, in dollars," },
            { text: `A lake contains ${numText(start)} fish, and the population decreases by ${rate}% each year.`, symbol: "P", noun: "the fish population" },
          ]
        : [
            { text: `An investment of ${money(start)} increases in value by ${rate}% each year.`, symbol: "V", noun: "the investment's value, in dollars," },
            { text: `A town has ${numText(start)} residents, and its population grows by ${rate}% each year.`, symbol: "P", noun: "the town's population" },
          ];
      const context = rng.pick(contexts);
      const grow = numTex(1 + rate / 100);
      const shrink = numTex(1 - rate / 100);
      const fraction = numTex(rate / 100);
      const exponential = (factor: string): string =>
        `$${context.symbol}(t) = ${intTex(start)}(${factor})^{t}$`;
      const linear = `$${context.symbol}(t) = ${intTex(start)} ${decay ? "-" : "+"} ${intTex((start * rate) / 100)}t$`;
      return {
        stem: `${context.text} Which function models ${context.noun} $t$ years from now?`,
        answer: optText(exponential(decay ? shrink : grow)),
        distractors: [
          wrongText(
            exponential(decay ? grow : shrink),
            decay
              ? "A factor greater than 1 models growth, not a loss."
              : "A factor less than 1 models decay, not growth.",
          ),
          wrongText(
            exponential(fraction),
            `A factor of $${fraction}$ would leave only ${rate}% of the quantity each year, rather than changing it by ${rate}%.`,
          ),
          wrongText(
            linear,
            "This changes the quantity by the same amount every year. A constant percent change is exponential, not linear.",
          ),
        ],
        steps: [
          step(
            "Find the yearly factor",
            decay
              ? `Losing ${rate}% leaves $100\\% - ${rate}\\% = ${100 - rate}\\%$, so each year the quantity is multiplied by $${shrink}$.`
              : `Gaining ${rate}% gives $100\\% + ${rate}\\% = ${100 + rate}\\%$, so each year the quantity is multiplied by $${grow}$.`,
          ),
          step(
            "Repeat the factor once per year",
            `After $t$ years the starting amount has been multiplied by the factor $t$ times: ${exponential(decay ? shrink : grow)}.`,
          ),
        ],
        hint: "A constant percent change means multiplying by the same factor each year.",
      };
    },
  },
  {
    id: "half-life",
    skillId: "sat-exponentials",
    title: "Work with a half-life model",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const halfLife = rng.pick([2, 3, 4, 5, 6, 8, 12, 25, 30]);
      const halvings = rng.int(2, 4);
      const denominator = 2 ** halvings;
      const mass = rng.pick([80, 120, 160, 200, 400, 640]);
      const answer = halfLife * halvings;
      return {
        stem: `The mass, in grams, of a radioactive sample $t$ years after it is first measured is modeled by $M(t) = ${mass}\\left(\\frac{1}{2}\\right)^{t/${halfLife}}$. After how many years is the mass $\\frac{1}{${denominator}}$ of its initial value?`,
        answer: opt(answer),
        distractors: [
          wrong(
            halfLife * denominator,
            `The fraction $\\frac{1}{${denominator}}$ was treated as ${denominator} half-lives; it takes only ${halvings} halvings to reach it.`,
          ),
          wrong(halvings, "That is the number of half-lives, not the number of years."),
          wrong(halfLife, "That is one half-life, when half of the sample remains."),
          wrong(halfLife * (halvings + 1), "One halving too many was counted."),
          ...slips(answer, halfLife),
        ],
        steps: [
          step(
            "Write the target as a power of one half",
            `$\\frac{1}{${denominator}} = \\left(\\frac{1}{2}\\right)^{${halvings}}$.`,
          ),
          step("Match the exponents", `$\\dfrac{t}{${halfLife}} = ${halvings}$.`),
          step("Solve", `$t = ${answer}$ years.`),
        ],
        hint: "Write the fraction as a power of one half and compare exponents.",
        audit: { kind: "root", expression: `(1/2)^(t/${halfLife}) - 1/${denominator}`, variable: "t" },
      };
    },
  },
  {
    id: "exponent-rules",
    skillId: "sat-exponentials",
    title: "Apply the laws of exponents",
    levels: [1, 2],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      const a = rng.int(2, 5);
      const b = rng.int(2, 4);
      if (level === 1) {
        const c = rng.int(2, 7);
        const k = a * b + c;
        return {
          stem: `For all positive values of $x$, $(x^{${a}})^{${b}} \\cdot x^{${c}} = x^{k}$. What is the value of $k$?`,
          answer: opt(k),
          distractors: [
            wrong(a + b + c, "The exponents were added when a power was raised to a power; they should be multiplied."),
            wrong(a * b * c, "All three exponents were multiplied; exponents add when powers with the same base are multiplied."),
            wrong(a * b - c, "The last exponent was subtracted, which is the rule for division."),
            ...slips(k),
          ],
          steps: [
            step("Raise a power to a power", `Multiply the exponents: $(x^{${a}})^{${b}} = x^{${a * b}}$.`),
            step("Multiply powers of the same base", `Add the exponents: $x^{${a * b}} \\cdot x^{${c}} = x^{${k}}$.`),
          ],
          hint: "Power of a power: multiply exponents. Product of powers: add exponents.",
          audit: { kind: "value", expression: `ln((2^${a})^${b}*2^${c})/ln(2)` },
        };
      }
      const d = rng.int(2, 6);
      const c = intExcept(rng, 2, 9, [a * b - d]);
      const k = a * b - d - c;
      return {
        stem: `For all positive values of $x$, $\\dfrac{(x^{${a}})^{${b}} \\cdot x^{-${d}}}{x^{${c}}} = x^{k}$. What is the value of $k$?`,
        answer: opt(k),
        distractors: [
          wrong(a * b + d - c, "The negative exponent was treated as positive."),
          wrong(a * b - d + c, "The exponent in the denominator was added instead of subtracted."),
          wrong(a + b - d - c, "The exponents were added when a power was raised to a power; they should be multiplied."),
          ...slips(k),
        ],
        steps: [
          step("Raise a power to a power", `$(x^{${a}})^{${b}} = x^{${a * b}}$.`),
          step("Multiply in the numerator", `Add the exponents: $x^{${a * b}} \\cdot x^{-${d}} = x^{${a * b - d}}$.`),
          step("Divide", `Subtract the exponent in the denominator: $x^{${a * b - d} - ${c}} = x^{${k}}$.`),
        ],
        hint: "Multiply exponents for a power of a power, add for a product, subtract for a quotient.",
        audit: { kind: "value", expression: `ln((2^${a})^${b}*2^(-${d})/2^${c})/ln(2)` },
      };
    },
  },
  {
    id: "rational-exponent",
    skillId: "sat-exponentials",
    title: "Evaluate a rational exponent",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const shape = rng.pick([
        { index: 2, roots: [2, 3, 4, 5, 6, 7, 8, 9, 10], powers: [3] },
        { index: 3, roots: [2, 3, 4, 5], powers: [2, 4] },
        { index: 4, roots: [2, 3], powers: [3] },
      ]);
      const root = rng.pick(shape.roots);
      const power = rng.pick(shape.powers);
      const base = root ** shape.index;
      const answer = root ** power;
      const radical = shape.index === 2 ? `\\sqrt{${base}}` : `\\sqrt[${shape.index}]{${base}}`;
      return {
        stem: `What is the value of $${base}^{\\frac{${power}}{${shape.index}}}$?`,
        answer: opt(answer),
        distractors: [
          wrong((base * power) / shape.index, "The base was multiplied by the exponent instead of being raised to it."),
          wrong(root, `The root was taken, but the result was not raised to the power ${power}.`),
          wrong(root * power, "The root was multiplied by the numerator instead of being raised to that power."),
          ...slips(answer),
        ],
        steps: [
          step(
            "Split the exponent",
            `The denominator is a root and the numerator is a power: $${base}^{\\frac{${power}}{${shape.index}}} = \\left(${radical}\\right)^{${power}}$.`,
          ),
          step("Take the root", `$${radical} = ${root}$.`),
          step("Raise to the power", `$${root}^{${power}} = ${numTex(answer)}$.`),
        ],
        hint: "In a fractional exponent, the denominator is the root and the numerator is the power.",
        audit: { kind: "value", expression: `${base}^(${power}/${shape.index})` },
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Polynomials and functions                                           */
  /* ------------------------------------------------------------------ */
  {
    id: "expand-binomials",
    skillId: "sat-polynomials",
    title: "Multiply two binomials",
    levels: [1, 2],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      const p = level === 1 ? rng.int(1, 4) : signedInt(rng, 2, 5);
      const q = level === 1 ? rng.int(1, 7) : rng.nonZero(-7, 7);
      const r = level === 1 ? rng.int(1, 4) : rng.int(2, 5);
      const forbidden = (q * r) % p === 0 ? [0, -(q * r) / p] : [0];
      const s = level === 1 ? rng.int(1, 7) : intExcept(rng, -7, 7, forbidden);
      const middle = p * s + q * r;
      return {
        stem: `The expression $(${linearTex(p, q)})(${linearTex(r, s)})$ can be rewritten as $ax^2 + bx + c$, where $a$, $b$ and $c$ are constants. What is the value of $b$?`,
        answer: opt(middle),
        distractors: [
          wrong(p * r, "That is $a$, the coefficient of $x^2$."),
          wrong(q * s, "That is $c$, the constant term."),
          wrong(p * s - q * r, "The outer and inner products were subtracted instead of added."),
          wrong(q + s, "The constants were added; the $x$-term comes from the outer and inner products."),
          ...slips(middle),
        ],
        steps: [
          step(
            "Multiply each pair of terms",
            `First: $${coefTex(p * r, "x^2")}$. Outer: $${coefTex(p * s, "x")}$. Inner: $${coefTex(q * r, "x")}$. Last: $${numTex(q * s)}$.`,
          ),
          step(
            "Combine the like terms",
            `The two $x$-terms add to $${coefTex(middle, "x")}$, so the product is $${polyTex([p * r, middle, q * s])}$ and $b = ${numTex(middle)}$.`,
          ),
        ],
        hint: "The x-term comes from two products: outer and inner.",
        audit: {
          kind: "derivative",
          expression: `(${exprNum(p)}*x + ${exprNum(q)})*(${exprNum(r)}*x + ${exprNum(s)})`,
          variable: "x",
          at: 0,
        },
      };
    },
  },
  {
    id: "factor-quadratic",
    skillId: "sat-polynomials",
    title: "Identify a factor",
    levels: [2],
    formats: ["choice"],
    build({ rng }) {
      const r1 = rng.nonZero(-8, 8);
      const r2 = intExcept(rng, -8, 8, [0, r1, -r1]);
      const b = -(r1 + r2);
      const c = r1 * r2;
      const candidates: readonly (readonly [number, string])[] = [
        [-r1, `This factor is zero at $x = ${numTex(-r1)}$, which does not make the expression zero. The sign is reversed.`],
        [-r2, `This factor is zero at $x = ${numTex(-r2)}$, which does not make the expression zero. The sign is reversed.`],
        [r1 + r2, "This uses the coefficient of $x$ rather than a value that makes the expression zero."],
        [c, "This uses the constant term rather than a value that makes the expression zero."],
        [-(r1 + r2), "This uses the coefficient of $x$ rather than a value that makes the expression zero."],
      ];
      const distractors: Distractor[] = candidates
        .filter(([root]) => root !== 0 && root !== r1 && root !== r2)
        .map(([root, why]) => wrongText(`$${factorTex(root)}$`, why));
      return {
        stem: `Which of the following is a factor of $${polyTex([1, b, c])}$?`,
        answer: optText(`$${factorTex(r1)}$`),
        distractors,
        steps: [
          step(
            "Factor the expression",
            `Two numbers that multiply to $${numTex(c)}$ and add to $${numTex(b)}$ are $${numTex(-r1)}$ and $${numTex(-r2)}$, so $${polyTex([1, b, c])} = ${factorTex(r1)}${factorTex(r2)}$.`,
          ),
          step(
            "Check with the factor theorem",
            `Substituting $x = ${numTex(r1)}$ gives $${numberSumTex([r1 * r1, b * r1, c])} = 0$, which confirms that $${factorTex(r1)}$ is a factor.`,
          ),
        ],
        hint: "A linear expression is a factor exactly when the value that makes it zero also makes the polynomial zero.",
      };
    },
  },
  {
    id: "remainder-theorem",
    skillId: "sat-polynomials",
    title: "Use the remainder theorem",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const coefficients = [1, rng.int(-4, 4), rng.int(-6, 6), rng.nonZero(-9, 9)];
      const k = rng.pick([-3, -2, -1, 1, 2, 3]);
      const value = polyValue(coefficients, k);
      const divisor = linearTex(1, -k);
      return {
        stem: `The polynomial $p$ is defined by $p(x) = ${polyTex(coefficients)}$. What is the remainder when $p(x)$ is divided by $${divisor}$?`,
        answer: opt(value),
        distractors: [
          wrong(
            polyValue(coefficients, -k),
            `The polynomial was evaluated at $x = ${numTex(-k)}$. Dividing by $${divisor}$ corresponds to $x = ${numTex(k)}$.`,
          ),
          wrong(coefficients[3], "That is $p(0)$, the constant term."),
          wrong(0, "A remainder of 0 would mean the divisor is a factor, which is not the case here."),
          wrong(-value, "A sign was lost while evaluating the polynomial."),
          ...slips(value),
        ],
        steps: [
          step(
            "Use the remainder theorem",
            `When a polynomial $p(x)$ is divided by $x - k$, the remainder is $p(k)$. Here $k = ${numTex(k)}$.`,
          ),
          step(
            "Evaluate",
            `$p(${numTex(k)}) = ${numberSumTex([k ** 3, coefficients[1] * k * k, coefficients[2] * k, coefficients[3]])} = ${numTex(value)}$.`,
          ),
        ],
        hint: "You do not need long division: the remainder on division by x − k is p(k).",
        audit: {
          kind: "root",
          expression: `${polyExpr(coefficients).replaceAll("x", `(${k})`)} - R`,
          variable: "R",
        },
      };
    },
  },
  {
    id: "function-composition",
    skillId: "sat-polynomials",
    title: "Evaluate a composite function",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const b = rng.int(-5, 5);
      const c = rng.int(-6, 6);
      const slope = signedInt(rng, 1, 3);
      const intercept = rng.int(-5, 5);
      const k = rng.int(-3, 4);
      const inner = slope * k + intercept;
      const answer = inner * inner + b * inner + c;
      const fAtK = k * k + b * k + c;
      return {
        stem: `The functions $f$ and $g$ are defined by $f(x) = ${polyTex([1, b, c])}$ and $g(x) = ${linearTex(slope, intercept)}$. What is the value of $f(g(${numTex(k)}))$?`,
        answer: opt(answer),
        distractors: [
          wrong(
            slope * fAtK + intercept,
            `The functions were applied in the wrong order: this is $g(f(${numTex(k)}))$.`,
          ),
          wrong(fAtK, `That is $f(${numTex(k)})$; the inner function $g$ was skipped.`),
          wrong(inner, `That is $g(${numTex(k)})$; the outer function $f$ still has to be applied.`),
          wrong(fAtK * inner, "The two function values were multiplied. Composition feeds the output of one function into the other."),
          ...slips(answer),
        ],
        steps: [
          step("Evaluate the inner function", `$g(${numTex(k)}) = ${numTex(inner)}$.`),
          step(
            "Evaluate the outer function at that value",
            `$f(${numTex(inner)}) = ${numberSumTex([inner * inner, b * inner, c])} = ${numTex(answer)}$.`,
          ),
        ],
        hint: "Work from the inside out.",
        audit: {
          kind: "value",
          expression: `(${exprNum(slope)}*${exprNum(k)} + ${exprNum(intercept)})^2 + ${exprNum(b)}*(${exprNum(slope)}*${exprNum(k)} + ${exprNum(intercept)}) + ${exprNum(c)}`,
        },
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Non-linear equations                                                */
  /* ------------------------------------------------------------------ */
  {
    id: "rational-equation",
    skillId: "sat-nonlinear-equations",
    title: "Solve a rational equation",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const a = rng.int(2, 5);
      const b = intExcept(rng, 2, 7, [a]);
      const scale = rng.pick([-2, -1, 1, 2]);
      const p = rng.int(-5, 5);
      const x = p + a * scale;
      const q = b * scale - x;
      const left = linearTex(1, -p);
      const right = linearTex(1, q);
      return {
        stem: `What value of $x$ satisfies the equation $\\dfrac{${a}}{${left}} = \\dfrac{${b}}{${right}}$?`,
        answer: opt(x),
        distractors: [
          wrongFrac(
            b * q + a * p,
            a - b,
            "Each numerator was multiplied by its own denominator instead of the opposite one.",
          ),
          wrongFrac(b * p - a * q, a - b, "A negative sign was lost when distributing on the right side."),
          wrong(-x, "A sign was lost in the final division."),
          ...slips(x),
        ],
        steps: [
          step("Cross-multiply", `$${a}(${right}) = ${b}(${left})$.`),
          step("Distribute", `$${linearTex(a, a * q)} = ${linearTex(b, -b * p)}$.`),
          step(
            "Collect like terms",
            `$${coefTex(a - b, "x")} = ${numTex(-b * p - a * q)}$, so $x = ${numTex(x)}$.`,
          ),
          step(
            "Check the denominators",
            `At $x = ${numTex(x)}$ the denominators are $${numTex(x - p)}$ and $${numTex(x + q)}$, neither of which is zero, so the solution is valid.`,
          ),
        ],
        hint: "Cross-multiply, solve the linear equation, then make sure no denominator is zero.",
        audit: {
          kind: "root",
          expression: `${a}/(x - ${exprNum(p)}) - ${b}/(x + ${exprNum(q)})`,
          variable: "x",
        },
      };
    },
  },
  {
    id: "radical-equation",
    skillId: "sat-nonlinear-equations",
    title: "Solve a radical equation",
    levels: [3],
    formats: ["choice"],
    build({ rng }) {
      const side = rng.int(2, 5);
      const b = rng.int(-3, 4);
      const valid = b + side;
      const extraneous = b + 1 - side;
      const a = side * side - valid;
      const equation = `\\sqrt{${linearTex(1, a)}} = ${linearTex(1, -b)}`;
      return {
        stem: `What is the solution set of the equation $${equation}$?`,
        answer: optText(`$\\{${numTex(valid)}\\}$`),
        distractors: [
          wrongText(
            `$\\{${numTex(extraneous)}, ${numTex(valid)}\\}$`,
            `Squaring both sides introduced $x = ${numTex(extraneous)}$, which does not satisfy the original equation.`,
          ),
          wrongText(
            `$\\{${numTex(extraneous)}\\}$`,
            `At $x = ${numTex(extraneous)}$ the right side is negative, and a square root is never negative.`,
          ),
          wrongText(
            "There are no real solutions.",
            `Substituting $x = ${numTex(valid)}$ gives $${side}$ on both sides, so a solution exists.`,
          ),
        ],
        steps: [
          step("Square both sides", `$${linearTex(1, a)} = ${polyTex([1, -2 * b, b * b])}$.`),
          step(
            "Solve the quadratic",
            `$${polyTex([1, -(2 * b + 1), b * b - a])} = 0$ factors as $${factorTex(extraneous)}${factorTex(valid)} = 0$, so $x = ${numTex(extraneous)}$ or $x = ${numTex(valid)}$.`,
          ),
          step(
            "Check both candidates in the original equation",
            `At $x = ${numTex(valid)}$: $\\sqrt{${valid + a}} = ${side}$ and the right side is $${side}$, so it works. At $x = ${numTex(extraneous)}$: $\\sqrt{${extraneous + a}} = ${side - 1}$ but the right side is $${numTex(1 - side)}$, so it is extraneous.`,
          ),
        ],
        hint: "Squaring can create solutions that do not satisfy the original equation — always check.",
      };
    },
  },
  {
    id: "line-parabola",
    skillId: "sat-nonlinear-equations",
    title: "A line tangent to a parabola",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const half = rng.nonZero(-4, 4);
      const slope = rng.nonZero(-4, 4);
      const b = slope + 2 * half;
      const c = rng.int(-6, 9);
      const d = c - half * half;
      return {
        stem: `In the $xy$-plane, the line $y = ${coefTex(slope, "x")} + d$ intersects the parabola $y = ${polyTex([1, b, c])}$ at exactly one point, where $d$ is a constant. What is the value of $d$?`,
        answer: opt(d),
        distractors: [
          wrong(c + half * half, "A sign was lost when solving the discriminant equation for $d$."),
          wrong(c - 4 * half * half, "The factor of 4 in the discriminant was left out."),
          wrong(c, "Matching the constants ignores the difference between the $x$-terms."),
          ...slips(d),
        ],
        steps: [
          step(
            "Set the two expressions equal",
            `$${polyTex([1, b, c])} = ${coefTex(slope, "x")} + d$, which rearranges to $x^2 ${signedTex(b - slope)}x + (${numTex(c)} - d) = 0$.`,
          ),
          step(
            "Require exactly one solution",
            `The discriminant must be zero: $(${numTex(b - slope)})^2 - 4(${numTex(c)} - d) = 0$.`,
          ),
          step("Solve for d", `$${numTex(c)} - d = ${half * half}$, so $d = ${numTex(d)}$.`),
        ],
        hint: "One intersection point means the quadratic you get by setting the equations equal has a zero discriminant.",
        audit: {
          kind: "root",
          expression: `(${exprNum(b)} - ${exprNum(slope)})^2 - 4*(${exprNum(c)} - d)`,
          variable: "d",
        },
      };
    },
  },
  {
    id: "abs-value",
    skillId: "sat-nonlinear-equations",
    title: "Solve an absolute value equation",
    levels: [1, 2],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      if (level === 1) {
        const p = rng.nonZero(-6, 6);
        const q = intExcept(rng, 1, 9, [Math.abs(p)]);
        const inside = linearTex(1, -p);
        return {
          stem: `What is the greater of the two solutions to the equation $|${inside}| = ${q}$?`,
          answer: opt(p + q),
          distractors: [
            wrong(p - q, "That is the smaller of the two solutions."),
            wrong(q - p, "The sign of the number inside the absolute value was reversed."),
            wrong(q, "The number inside the absolute value was ignored."),
            wrong(-(p + q), "A sign was lost when the two cases were solved."),
            ...slips(p + q),
          ],
          steps: [
            step(
              "Split into two cases",
              `The expression inside the bars is either $${q}$ or $-${q}$: $${inside} = ${q}$ or $${inside} = -${q}$.`,
            ),
            step("Solve each case", `$x = ${numTex(p + q)}$ or $x = ${numTex(p - q)}$.`),
            step("Choose the greater solution", `The greater solution is $${numTex(p + q)}$.`),
          ],
          hint: "An absolute value equation splits into two linear equations.",
          audit: { kind: "root", expression: `abs(x - ${exprNum(p)}) - ${q}`, variable: "x" },
        };
      }
      const a = rng.pick([2, 3, 4]);
      const k = rng.int(1, 4);
      const u = intExcept(rng, -5, 6, [k]);
      const v = u - 2 * k;
      const c = a * k;
      const b = a * (k - u);
      const inside = linearTex(a, b);
      return {
        stem: `What is the sum of the solutions to the equation $|${inside}| = ${c}$?`,
        answer: opt(u + v),
        distractors: [
          wrong(u, "That is only one of the two solutions."),
          wrong(v, "That is only one of the two solutions."),
          wrong(
            0,
            `The solutions are symmetric about $x = ${fracTex(-b, a)}$, where the expression inside the bars is zero, not about 0.`,
          ),
          wrong(u - v, "The two solutions were subtracted instead of added."),
          ...slips(u + v),
        ],
        steps: [
          step(
            "Split into two cases",
            `$${inside} = ${c}$ or $${inside} = -${c}$.`,
          ),
          step("Solve each case", `$x = ${numTex(u)}$ or $x = ${numTex(v)}$.`),
          step("Add", `$${numTex(u)} + ${parenTex(v)} = ${numTex(u + v)}$.`),
        ],
        hint: "Solve both cases, then add the two solutions.",
        audit: { kind: "value", expression: `-2*${exprNum(b)}/${a}` },
      };
    },
  },
];
