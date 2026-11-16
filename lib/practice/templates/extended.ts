/**
 * Challenging SAT items and a second template for the thinner AP skills.
 *
 * The adaptive mock test routes strong students to a harder second module, so
 * every SAT domain needs enough level-3 questions to fill it. These templates
 * supply them: each one takes a standard idea and removes a step of
 * scaffolding, or asks for it in reverse.
 */

import {
  coefTex,
  exprNum,
  fracTex,
  linearTex,
  money,
  numTex,
  piTex,
  polyExpr,
  polyTex,
  rootTex,
  tidy,
} from "@/lib/practice/format";
import {
  fracStepTex,
  intExcept,
  opt,
  optFrac,
  signedInt,
  slips,
  slipsFrac,
  step,
  wrong,
  wrongFrac,
} from "@/lib/practice/templates/helpers";
import type { Distractor, Draft, TableSpec, Template } from "@/types/practice";

export const EXTENDED_TEMPLATES: readonly Template[] = [
  /* ------------------------------------------------------------------ */
  /* SAT — Algebra and Advanced Math                                     */
  /* ------------------------------------------------------------------ */
  {
    id: "linear-zero",
    skillId: "sat-linear-functions",
    title: "Find the zero of a linear function",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const slope = signedInt(rng, 2, 5);
      const zero = rng.nonZero(-6, 6);
      const a = intExcept(rng, -5, 5, [zero]);
      const b = intExcept(rng, -5, 7, [zero, a]);
      const fa = slope * (a - zero);
      const fb = slope * (b - zero);
      return {
        stem: `The function $f$ is linear, with $f(${a}) = ${numTex(fa)}$ and $f(${b}) = ${numTex(fb)}$. For what value of $x$ is $f(x) = 0$?`,
        answer: opt(zero),
        distractors: [
          wrong(-slope * zero, "That is $f(0)$, the $y$-intercept. The question asks where the function equals zero."),
          wrong(-zero, "A sign was lost when the equation was solved for $x$."),
          wrong(slope, "That is the slope of the function."),
          ...slips(zero),
        ],
        steps: [
          step("Find the slope", `$m = \\dfrac{${numTex(fb)} - ${fa < 0 ? `(${numTex(fa)})` : numTex(fa)}}{${numTex(b)} - ${a < 0 ? `(${numTex(a)})` : numTex(a)}} = ${numTex(slope)}$.`),
          step("Write the function", `Using $f(${a}) = ${numTex(fa)}$, $f(x) = ${linearTex(slope, -slope * zero)}$.`),
          step("Set it equal to zero", `$${linearTex(slope, -slope * zero)} = 0$ gives $x = ${numTex(zero)}$.`),
        ],
        hint: "Find the equation of the function first, then solve f(x) = 0.",
        audit: {
          kind: "value",
          expression: `${exprNum(a)} - ${exprNum(fa)}*(${exprNum(b)} - ${exprNum(a)})/(${exprNum(fb)} - ${exprNum(fa)})`,
        },
      };
    },
  },
  {
    id: "vertex-form-point",
    skillId: "sat-quadratics",
    title: "Find a parabola from its vertex and a point",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const a = rng.pick([-3, -2, 2, 3, 4]);
      const h = rng.nonZero(-5, 5);
      const k = rng.nonZero(-8, 8);
      const d = rng.pick([-3, -2, 2, 3]);
      const p = h + d;
      const q = a * d * d + k;
      return {
        stem: `In the $xy$-plane, a parabola has its vertex at $(${h}, ${k})$ and passes through the point $(${p}, ${q})$. If the equation of the parabola is $y = a(${linearTex(1, -h)})^2 ${k < 0 ? "-" : "+"} ${Math.abs(k)}$, what is the value of $a$?`,
        answer: opt(a),
        distractors: [
          wrong(a * d, "The horizontal distance from the vertex was not squared."),
          wrong(q - k, "The difference in $y$ was not divided by the square of the horizontal distance."),
          wrong(-a, "A sign was lost when solving for $a$."),
          ...slips(a),
        ],
        steps: [
          step("Substitute the point", `$${numTex(q)} = a(${numTex(p)} ${h < 0 ? "+" : "-"} ${Math.abs(h)})^2 ${k < 0 ? "-" : "+"} ${Math.abs(k)}$.`),
          step("Simplify", `$${numTex(q)} = ${coefTex(d * d, "a")} ${k < 0 ? "-" : "+"} ${Math.abs(k)}$, so $${coefTex(d * d, "a")} = ${numTex(q - k)}$.`),
          step("Solve", `$a = ${numTex(a)}$.`),
        ],
        hint: "Substitute the coordinates of the given point into the vertex form.",
        audit: {
          kind: "root",
          expression: `a*(${exprNum(p)} - ${exprNum(h)})^2 + ${exprNum(k)} - ${exprNum(q)}`,
          variable: "a",
        },
      };
    },
  },
  {
    id: "abs-inequality-count",
    skillId: "sat-nonlinear-equations",
    title: "Count integer solutions of an absolute value inequality",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const p = rng.int(-6, 6);
      const q = rng.int(2, 7);
      const strict = rng.bool();
      const count = strict ? 2 * q - 1 : 2 * q + 1;
      const low = strict ? p - q + 1 : p - q;
      const high = strict ? p + q - 1 : p + q;
      const relation = strict ? "<" : "\\le";
      return {
        stem: `How many integers $x$ satisfy the inequality $|${linearTex(1, -p)}| ${relation} ${q}$?`,
        answer: opt(count),
        distractors: [
          wrong(2 * q, "The two ends of the interval were not both handled correctly."),
          wrong(strict ? 2 * q + 1 : 2 * q - 1, strict ? "The endpoints were counted, but the inequality is strict." : "The endpoints were left out, but the inequality includes them."),
          wrong(q, "Only the values on one side of the center were counted."),
          ...slips(count, 2),
        ],
        steps: [
          step("Rewrite without absolute value", `$-${q} ${relation} ${linearTex(1, -p)} ${relation} ${q}$.`),
          step("Isolate x", `$${numTex(p - q)} ${relation} x ${relation} ${numTex(p + q)}$.`),
          step(
            "Count the integers",
            `The integers from $${numTex(low)}$ to $${numTex(high)}$ inclusive number $${numTex(high)} - ${low < 0 ? `(${numTex(low)})` : numTex(low)} + 1 = ${count}$.`,
          ),
        ],
        hint: "Turn the inequality into an interval, then count the integers in it — watch the endpoints.",
        audit: { kind: "value", expression: `${exprNum(high)} - ${exprNum(low)} + 1` },
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* SAT — Problem-Solving and Data Analysis                             */
  /* ------------------------------------------------------------------ */
  {
    id: "percent-chain-reverse",
    skillId: "sat-ratios-percents",
    title: "Undo two percent changes",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const cases: readonly (readonly [number, number, number])[] = [
        [200, 25, 20],
        [400, 25, 10],
        [80, 50, 25],
        [250, 20, 10],
        [120, 25, 20],
        [500, 20, 25],
        [160, 50, 10],
        [300, 10, 20],
        [240, 25, 50],
        [100, 50, 20],
        [60, 50, 10],
        [800, 25, 20],
      ];
      const [original, up, down] = rng.pick(cases);
      const final = tidy((original * (100 + up) * (100 - down)) / 10000);
      const item = rng.pick(["bicycle", "tablet", "winter coat", "desk", "guitar"]);
      return {
        stem: `A store raises the price of a ${item} by ${up}% and later discounts the new price by ${down}%. The final price is ${money(final)}. What was the original price, in dollars?`,
        answer: opt(original),
        distractors: [
          wrong(
            tidy((final * 100) / (100 + up - down), 2),
            "The two percents were combined into one net percent. The discount applies to the raised price, not the original.",
          ),
          wrong(
            tidy((final * (100 - up) * (100 + down)) / 10000, 2),
            "Each change was undone with the opposite percent. Undoing a percent change means dividing by its factor.",
          ),
          wrong(tidy((final * (100 + up) * (100 - down)) / 10000, 2), "The two changes were applied again instead of undone."),
          ...slips(original, 10),
        ],
        steps: [
          step(
            "Write the final price in terms of the original",
            `$x \\times ${numTex(1 + up / 100)} \\times ${numTex(1 - down / 100)} = ${numTex(final)}$.`,
          ),
          step("Combine the factors", `$${coefTex(tidy((1 + up / 100) * (1 - down / 100), 4), "x")} = ${numTex(final)}$.`),
          step("Divide", `$x = ${numTex(original)}$.`),
        ],
        hint: "Each percent change is a multiplication; to undo it, divide.",
        audit: { kind: "root", expression: `x*(1 + ${up}/100)*(1 - ${down}/100) - ${final}`, variable: "x" },
      };
    },
  },
  {
    id: "weighted-mean-reverse",
    skillId: "sat-data-summaries",
    title: "Recover a group mean from a combined mean",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const [a, b] = rng.pick([
        [1, 2],
        [2, 1],
        [2, 3],
        [3, 2],
        [1, 3],
        [3, 1],
      ]);
      const group = rng.pick([5, 6, 8, 10]);
      const n1 = group * a;
      const n2 = group * b;
      const spread = rng.pick([-3, -2, -1, 1, 2, 3]);
      const combined = rng.int(68, 84);
      const m1 = combined - b * spread;
      const m2 = combined + a * spread;
      return {
        stem: `Class A has ${n1} students with a mean test score of ${m1}. Class B has ${n2} students. The mean test score of all ${n1 + n2} students is ${combined}. What is the mean test score of Class B?`,
        answer: opt(m2),
        distractors: [
          wrong(2 * combined - m1, "The classes were treated as the same size."),
          wrong(combined, "That is the combined mean, not the mean of Class B."),
          wrong(combined + b * spread, "The class sizes were attached to the wrong classes."),
          ...slips(m2),
        ],
        steps: [
          step("Find the total for all students", `$${n1 + n2} \\times ${combined} = ${(n1 + n2) * combined}$.`),
          step("Subtract the total for Class A", `$${(n1 + n2) * combined} - ${n1} \\times ${m1} = ${(n1 + n2) * combined - n1 * m1}$.`),
          step("Divide by the size of Class B", `$${(n1 + n2) * combined - n1 * m1} \\div ${n2} = ${m2}$.`),
        ],
        hint: "Work with totals: combined total minus Class A's total leaves Class B's total.",
        audit: { kind: "value", expression: `((${n1} + ${n2})*${combined} - ${n1}*${m1})/${n2}` },
      };
    },
  },
  {
    id: "table-union",
    skillId: "sat-probability",
    title: "Probability of one event or another from a table",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const a = rng.int(8, 30);
      const b = intExcept(rng, 8, 30, [a]);
      const c = intExcept(rng, 8, 30, [a, b]);
      const d = intExcept(rng, 8, 30, [a, b, c]);
      const total = a + b + c + d;
      const topic = rng.pick([
        { intro: "the science course chosen by each student in two grades", columns: ["Biology", "Chemistry"], verb: "chose Biology" },
        { intro: "the elective chosen by each student in two grades", columns: ["Music", "Art"], verb: "chose Music" },
        { intro: "the language studied by each student in two grades", columns: ["Spanish", "French"], verb: "studies Spanish" },
      ]);
      const table: TableSpec = {
        headers: ["", topic.columns[0], topic.columns[1], "Total"],
        rows: [
          ["Grade 11", String(a), String(b), String(a + b)],
          ["Grade 12", String(c), String(d), String(c + d)],
          ["Total", String(a + c), String(b + d), String(total)],
        ],
      };
      return {
        stem: `The table shows ${topic.intro}. If one of the ${total} students is selected at random, what is the probability that the student is in Grade 11 or ${topic.verb}?`,
        table,
        answer: optFrac(a + b + c, total),
        distractors: [
          wrongFrac(2 * a + b + c, total, "The students who are in both groups were counted twice."),
          wrongFrac(a, total, "That is the probability of being in both groups, not in at least one."),
          wrongFrac(a + b, total, "Only the Grade 11 students were counted."),
          ...slipsFrac(a + b + c, total),
        ],
        steps: [
          step("Add the two groups", `There are ${a + b} Grade 11 students and ${a + c} students who fit the second description.`),
          step("Remove the overlap", `The ${a} students in both groups were counted twice: $${a + b} + ${a + c} - ${a} = ${a + b + c}$.`),
          step("Divide by all students", `The probability is $${fracStepTex(a + b + c, total)}$.`),
        ],
        hint: "Add the two groups, then subtract the students who are in both.",
        audit: { kind: "value", expression: `((${a} + ${b}) + (${a} + ${c}) - ${a})/${total}` },
      };
    },
  },
  {
    id: "at-least-one-draw",
    skillId: "sat-probability",
    title: "Probability of at least one",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const red = rng.int(2, 5);
      const other = rng.int(3, 7);
      const n = red + other;
      const none = other * (other - 1);
      const all = n * (n - 1);
      return {
        stem: `A bag contains ${red} red marbles and ${other} blue marbles. Two marbles are drawn at random, one after the other, without replacement. What is the probability that at least one of the marbles is red?`,
        answer: optFrac(all - none, all),
        distractors: [
          wrongFrac(none, all, "That is the probability that neither marble is red. Subtract it from 1."),
          wrongFrac(red * (red - 1), all, "That is the probability that both marbles are red."),
          wrongFrac(red, n, "That is the probability for a single draw."),
          ...slipsFrac(all - none, all),
        ],
        steps: [
          step("Use the complement", "“At least one red” is the opposite of “no red at all”."),
          step("Find the probability of no red", `$\\dfrac{${other}}{${n}} \\times \\dfrac{${other - 1}}{${n - 1}} = ${fracStepTex(none, all)}$.`),
          step("Subtract from 1", `$1 - ${fracTex(none, all)} = ${fracTex(all - none, all)}$.`),
        ],
        hint: "“At least one” is usually easiest through its complement, “none”.",
        audit: { kind: "value", expression: `1 - (${other}/${n})*((${other} - 1)/(${n} - 1))` },
        insight: "The complement trick is the workhorse of Exam P: the chance of at least one claim is one minus the chance of none.",
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* SAT — Geometry and Trigonometry                                     */
  /* ------------------------------------------------------------------ */
  {
    id: "cone-radius",
    skillId: "sat-area-volume",
    title: "Work backwards from a volume",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const r = rng.int(2, 8);
      const h = rng.pick([3, 6, 9, 12]);
      const volume = (r * r * h) / 3;
      return {
        stem: `A right circular cone has a height of ${h} centimeters and a volume of $${numTex(volume)}\\pi$ cubic centimeters. What is the radius, in centimeters, of the base of the cone?`,
        answer: opt(r),
        distractors: [
          wrong(r * r, "That is the square of the radius; the square root was not taken."),
          wrong(2 * r, "That is the diameter of the base."),
          wrongFrac(volume, h, "The factor of $\\frac{1}{3}$ was left out and the square root was not taken."),
          ...slips(r),
        ],
        steps: [
          step("Write the volume formula", "$V = \\dfrac{1}{3}\\pi r^2 h$."),
          step("Substitute", `$${numTex(volume)}\\pi = \\dfrac{1}{3}\\pi r^2 (${h})$, so $r^2 = \\dfrac{3 \\times ${numTex(volume)}}{${h}} = ${r * r}$.`),
          step("Take the square root", `$r = ${r}$.`),
        ],
        hint: "Substitute what you know into V = (1/3)πr²h and solve for r.",
        audit: { kind: "root", expression: `(1/3)*r^2*${h} - ${volume}`, variable: "r" },
      };
    },
  },
  {
    id: "exterior-angle",
    skillId: "sat-triangles",
    title: "Use the exterior angle theorem",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const angleA = rng.int(30, 70);
      const angleB = rng.int(30, 70);
      const exterior = angleA + angleB;
      const x = rng.int(6, 20);
      const r = rng.int(1, 2);
      const t = rng.int(1, 2);
      const p = r + t + rng.int(1, 2);
      const q = exterior - p * x;
      const s = angleA - r * x;
      const u = angleB - t * x;
      return {
        stem: `In triangle $ABC$, the measures of angles $A$ and $B$ are $(${linearTex(r, s)})^\\circ$ and $(${linearTex(t, u)})^\\circ$. An exterior angle at vertex $C$ measures $(${linearTex(p, q)})^\\circ$. What is the value of $x$?`,
        answer: opt(x),
        distractors: [
          wrongFrac(180 - q - s - u, p + r + t, "The exterior angle was treated as a third interior angle and the three were set to add to 180."),
          wrongFrac(s - q, p - r, "The exterior angle was set equal to one remote interior angle instead of the sum of both."),
          wrong(exterior, "That is the measure of the exterior angle, not the value of $x$."),
          ...slips(x),
        ],
        steps: [
          step("Use the exterior angle theorem", "An exterior angle of a triangle equals the sum of the two remote interior angles."),
          step("Write the equation", `$${linearTex(p, q)} = (${linearTex(r, s)}) + (${linearTex(t, u)}) = ${linearTex(r + t, s + u)}$.`),
          step("Solve", `$${coefTex(p - r - t, "x")} = ${numTex(s + u - q)}$, so $x = ${x}$.`),
        ],
        hint: "An exterior angle equals the sum of the two interior angles that are not next to it.",
        audit: {
          kind: "root",
          expression: `(${p}*x + ${exprNum(q)}) - ((${r}*x + ${exprNum(s)}) + (${t}*x + ${exprNum(u)}))`,
          variable: "x",
        },
      };
    },
  },
  {
    id: "circle-diameter",
    skillId: "sat-circles",
    title: "Equation of a circle from a diameter",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const u = rng.nonZero(-5, 5);
      const v = rng.nonZero(-5, 5);
      const x1 = rng.int(-6, 6);
      const y1 = rng.int(-6, 6);
      const x2 = x1 + 2 * u;
      const y2 = y1 + 2 * v;
      const c = u * u + v * v;
      return {
        stem: `In the $xy$-plane, the points $(${x1}, ${y1})$ and $(${x2}, ${y2})$ are the endpoints of a diameter of a circle. The circle has the equation $(x - h)^2 + (y - k)^2 = c$, where $h$, $k$ and $c$ are constants. What is the value of $c$?`,
        answer: opt(c),
        distractors: [
          wrong(4 * c, "The whole length of the diameter was used as the radius."),
          wrong(Math.sqrt(c), "That is the radius. The equation needs the square of the radius.", rootTex(c)),
          wrong(2 * c, "The square of the diameter was halved; it has to be divided by 4."),
          ...slips(c),
        ],
        steps: [
          step("Find the center", `The center is the midpoint of the diameter: $(${numTex(x1 + u)}, ${numTex(y1 + v)})$.`),
          step(
            "Find the square of the radius",
            `From the center to $(${x2}, ${y2})$ is ${Math.abs(u)} across and ${Math.abs(v)} up or down, so $r^2 = ${u * u} + ${v * v} = ${c}$.`,
          ),
          step("Read off c", `In standard form the right side is $r^2$, so $c = ${c}$.`),
        ],
        hint: "The center is the midpoint of the diameter, and c is the square of the radius.",
        audit: {
          kind: "value",
          expression: `((${exprNum(x2)} - ${exprNum(x1)})^2 + (${exprNum(y2)} - ${exprNum(y1)})^2)/4`,
        },
      };
    },
  },
  {
    id: "arc-angle",
    skillId: "sat-circles",
    title: "Central angle from an arc length",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const [theta, r] = rng.pick([
        [30, 6],
        [30, 12],
        [45, 4],
        [45, 8],
        [60, 3],
        [60, 6],
        [60, 9],
        [90, 4],
        [90, 6],
        [120, 3],
        [120, 6],
        [120, 9],
        [135, 4],
        [135, 8],
        [150, 6],
        [150, 12],
      ]);
      const k = (theta * r) / 180;
      const distractors: Distractor[] = [
        wrong(theta / 2, "The arc was compared with twice the circumference."),
        wrong((k * 360) / (r * r), "The area of the circle was used in place of its circumference."),
      ];
      if (2 * theta <= 360) {
        distractors.unshift(wrong(2 * theta, "The arc was compared with $\\pi r$ instead of the full circumference $2\\pi r$."));
      }
      distractors.push(...slips(theta, 15));
      return {
        stem: `A circle has a radius of ${r}. An arc of the circle has length $${piTex(k)}$. What is the measure, in degrees, of the central angle that intercepts the arc?`,
        answer: opt(theta),
        distractors,
        steps: [
          step("Find the circumference", `$2\\pi r = ${2 * r}\\pi$.`),
          step("Find the fraction of the circle", `$\\dfrac{${piTex(k)}}{${2 * r}\\pi} = ${fracStepTex(k, 2 * r)}$.`),
          step("Apply it to 360 degrees", `$${fracTex(k, 2 * r)} \\times 360 = ${theta}$.`),
        ],
        hint: "The arc is the same fraction of the circumference as its angle is of 360 degrees.",
        audit: { kind: "root", expression: `t/360*2*${r} - ${k}`, variable: "t" },
      };
    },
  },
  {
    id: "trig-scale",
    skillId: "sat-trigonometry",
    title: "Use a trigonometric ratio to find a length",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const [a, b, c] = rng.pick([
        [3, 4, 5],
        [5, 12, 13],
        [8, 15, 17],
        [7, 24, 25],
      ] as const);
      const scale = rng.int(2, 5);
      const answer = scale * a;
      return {
        stem: `In right triangle $ABC$, angle $C$ is the right angle, $\\tan A = \\frac{${a}}{${b}}$ and $AB = ${scale * c}$. What is the length of $BC$?`,
        answer: opt(answer),
        distractors: [
          wrong(scale * b, "That is $AC$, the side adjacent to angle $A$."),
          wrong(a, `The ratio gives the shape of the triangle, not its size. Every side is ${scale} times as long.`),
          wrongFrac(scale * c * a, b, "The hypotenuse was multiplied by the tangent. The tangent compares the two legs."),
          ...slips(answer),
        ],
        steps: [
          step("Build a triangle with that ratio", `$\\tan A = \\frac{${a}}{${b}}$ fits a triangle with opposite side ${a}, adjacent side ${b} and hypotenuse $\\sqrt{${a}^2 + ${b}^2} = ${c}$.`),
          step("Find the scale factor", `The actual hypotenuse is ${scale * c}, which is ${scale} times ${c}.`),
          step("Scale the opposite side", `$BC$ is opposite angle $A$: $${scale} \\times ${a} = ${answer}$.`),
        ],
        hint: "Find a right triangle with the given ratio, then scale it to match the given side.",
        audit: { kind: "value", expression: `${scale * c}*sin(atan(${a}/${b}))` },
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* AP Calculus and AP Statistics                                       */
  /* ------------------------------------------------------------------ */
  {
    id: "continuity-removable",
    skillId: "calc-continuity",
    title: "Remove a discontinuity",
    levels: [1],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const a = rng.nonZero(-5, 5);
      const r = intExcept(rng, -6, 6, [a]);
      const numerator = [1, -(a + r), a * r];
      const answer = a - r;
      return {
        stem: `Let $f$ be the function defined below, where $k$ is a constant.\n\n$$f(x) = \\begin{cases} \\dfrac{${polyTex(numerator)}}{${linearTex(1, -a)}}, & x \\ne ${a} \\\\ k, & x = ${a} \\end{cases}$$\n\nFor what value of $k$ is $f$ continuous at $x = ${a}$?`,
        answer: opt(answer),
        distractors: [
          wrong(0, "Substituting gives $\\frac{0}{0}$, which is an indeterminate form, not the value 0."),
          wrong(a + r, "A sign error was made when the numerator was factored."),
          wrong(a, "That is the $x$-value of the gap, not the value the function approaches there."),
          ...slips(answer),
        ],
        steps: [
          step("State what continuity requires", `$f$ is continuous at $x = ${a}$ when $f(${a})$ equals the limit of $f(x)$ as $x \\to ${a}$.`),
          step("Find the limit", `For $x \\ne ${a}$, $\\dfrac{${polyTex(numerator)}}{${linearTex(1, -a)}} = ${linearTex(1, -r)}$, which approaches $${numTex(answer)}$.`),
          step("Match the value", `$k = ${numTex(answer)}$.`),
        ],
        hint: "The function is continuous when its value at the point equals its limit there.",
        audit: {
          kind: "limit",
          expression: `(${polyExpr(numerator)})/(x - ${exprNum(a)})`,
          variable: "x",
          at: a,
        },
      };
    },
  },
  {
    id: "cube-rate",
    skillId: "calc-related-rates",
    title: "Rate of change of a growing solid",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }): Draft {
      const rate = rng.int(2, 5);
      const side = rng.int(2, 8);
      if (rng.bool()) {
        const answer = 3 * side * side * rate;
        return {
          stem: `Each edge of a cube is increasing at a constant rate of ${rate} centimeters per second. At the instant when each edge is ${side} centimeters long, at what rate, in cubic centimeters per second, is the volume of the cube increasing?`,
          answer: opt(answer),
          distractors: [
            wrong(side ** 3 * rate, "The volume was multiplied by the rate without being differentiated."),
            wrong(3 * side * side, "The rate of change of the edge was not included."),
            wrong(3 * side * rate, "The derivative of $s^3$ is $3s^2$, not $3s$."),
            ...slips(answer, rate),
          ],
          steps: [
            step("Relate the quantities", "$V = s^3$."),
            step("Differentiate with respect to time", "$\\dfrac{dV}{dt} = 3s^2\\dfrac{ds}{dt}$."),
            step("Substitute", `$3(${side})^2(${rate}) = ${answer}$.`),
          ],
          hint: "Differentiate V = s³ with respect to time, using the chain rule.",
          audit: { kind: "value", expression: `3*${side}^2*${rate}` },
        };
      }
      const answer = 12 * side * rate;
      return {
        stem: `Each edge of a cube is increasing at a constant rate of ${rate} centimeters per second. At the instant when each edge is ${side} centimeters long, at what rate, in square centimeters per second, is the surface area of the cube increasing?`,
        answer: opt(answer),
        distractors: [
          wrong(6 * side * side * rate, "The surface area was multiplied by the rate without being differentiated."),
          wrong(12 * side, "The rate of change of the edge was not included."),
          wrong(2 * side * rate, "The factor of 6 for the six faces was left out."),
          ...slips(answer, rate),
        ],
        steps: [
          step("Relate the quantities", "$S = 6s^2$."),
          step("Differentiate with respect to time", "$\\dfrac{dS}{dt} = 12s\\dfrac{ds}{dt}$."),
          step("Substitute", `$12(${side})(${rate}) = ${answer}$.`),
        ],
        hint: "Differentiate S = 6s² with respect to time, using the chain rule.",
        audit: { kind: "value", expression: `12*${side}*${rate}` },
      };
    },
  },
  {
    id: "ftc-net-change",
    skillId: "calc-ftc",
    title: "Net change from a rate",
    levels: [1, 2],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      if (level === 1) {
        const a = rng.int(0, 3);
        const b = a + rng.int(2, 5);
        const start = rng.int(-6, 9);
        const change = rng.nonZero(-9, 12);
        return {
          stem: `The function $f$ is differentiable, with $f(${a}) = ${numTex(start)}$ and $\\displaystyle\\int_{${a}}^{${b}} f'(x)\\,dx = ${numTex(change)}$. What is the value of $f(${b})$?`,
          answer: opt(start + change),
          distractors: [
            wrong(change, "That is the net change in $f$. The starting value has to be added to it."),
            wrong(change - start, "The starting value was subtracted instead of added."),
            wrong(start - change, "The net change was subtracted instead of added."),
            ...slips(start + change),
          ],
          steps: [
            step("Apply the Fundamental Theorem of Calculus", `$\\displaystyle\\int_{${a}}^{${b}} f'(x)\\,dx = f(${b}) - f(${a})$.`),
            step("Solve", `$f(${b}) = ${numTex(start)} + ${change < 0 ? `(${numTex(change)})` : numTex(change)} = ${numTex(start + change)}$.`),
          ],
          hint: "The integral of a rate of change is the net change in the quantity.",
          audit: { kind: "value", expression: `${exprNum(start)} + ${exprNum(change)}` },
        };
      }
      const c = rng.int(1, 6);
      const time = rng.int(2, 4);
      const start = rng.int(10, 60);
      const net = time ** 3 + c * time;
      const rateAtEnd = 3 * time * time + c;
      return {
        stem: `Water flows into a tank at a rate of $r(t) = 3t^2 + ${c}$ liters per minute, where $t$ is the time in minutes. The tank holds ${start} liters of water at $t = 0$. How many liters of water does the tank hold at $t = ${time}$?`,
        answer: opt(start + net),
        distractors: [
          wrong(net, "That is the amount added. The water already in the tank has to be included."),
          wrong(start + rateAtEnd, "The rate at the final time was added, rather than the amount that accumulated."),
          wrong(start + rateAtEnd * time, "The final rate was multiplied by the time, which assumes the rate was constant."),
          ...slips(start + net),
        ],
        steps: [
          step("Integrate the rate to find the amount added", `$\\displaystyle\\int_{0}^{${time}} \\left(3t^2 + ${c}\\right)dt = \\Big[t^3 + ${coefTex(c, "t")}\\Big]_{0}^{${time}} = ${net}$.`),
          step("Add the starting amount", `$${start} + ${net} = ${start + net}$ liters.`),
        ],
        hint: "Amount at the end = amount at the start + the integral of the rate.",
        audit: { kind: "value", expression: `${start} + ${time}^3 + ${c}*${time}` },
        insight: "Integrating a rate to get an accumulated amount is how a force of interest becomes an accumulated value in interest theory.",
      };
    },
  },
  {
    id: "r-squared",
    skillId: "stats-regression",
    title: "Coefficient of determination",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const magnitude = rng.pick([0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]);
      const r = rng.sign() * magnitude;
      const explained = Math.round(magnitude * magnitude * 100);
      const context = rng.pick([
        "hours studied ($x$) and exam score ($y$)",
        "a car's age in years ($x$) and its resale value ($y$)",
        "daily temperature ($x$) and electricity use ($y$)",
        "a driver's age ($x$) and annual insurance claims cost ($y$)",
      ]);
      const distractors: Distractor[] = [
        wrong(Math.round(magnitude * 100), "The correlation itself was used. The proportion of variation explained is $r^2$."),
        wrong(100 - explained, "That is the percent of variation left unexplained."),
      ];
      if (r < 0) distractors.push(wrong(-explained, "A proportion of variation cannot be negative; squaring removes the sign."));
      distractors.push(...slips(explained, 5));
      return {
        stem: `For a set of data on ${context}, the correlation is $r = ${numTex(r)}$. What percent of the variation in $y$ is explained by the least-squares regression line?`,
        answer: opt(explained),
        distractors,
        steps: [
          step("Square the correlation", `$r^2 = (${numTex(r)})^2 = ${numTex(magnitude * magnitude)}$.`),
          step("Interpret it", `About ${explained}% of the variation in $y$ is accounted for by its linear relationship with $x$.`),
        ],
        hint: "The proportion of variation explained by the regression line is r².",
        audit: { kind: "value", expression: `(${exprNum(r)})^2*100` },
      };
    },
  },
];
