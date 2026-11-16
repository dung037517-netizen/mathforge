/**
 * SAT Math — Geometry and Trigonometry.
 *
 * Area and volume, triangles, circles and right-triangle trigonometry.
 */

import {
  exprNum,
  linearTex,
  numTex,
  piTex,
  rootTex,
  sumTex,
} from "@/lib/practice/format";
import {
  intExcept,
  opt,
  optFrac,
  slips,
  slipsFrac,
  step,
  wrong,
  wrongFrac,
} from "@/lib/practice/templates/helpers";
import type { Distractor, Draft, Template } from "@/types/practice";

const TRIPLES: readonly (readonly [number, number, number])[] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [6, 8, 10],
  [9, 12, 15],
  [20, 21, 29],
  [9, 40, 41],
  [12, 16, 20],
  [10, 24, 26],
  [15, 20, 25],
  [12, 35, 37],
];

export const SAT_GEOMETRY_TEMPLATES: readonly Template[] = [
  /* ------------------------------------------------------------------ */
  /* Area and volume                                                     */
  /* ------------------------------------------------------------------ */
  {
    id: "cylinder-volume",
    skillId: "sat-area-volume",
    title: "Volume of a cylinder",
    levels: [1, 2],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      const r = rng.int(2, 9);
      const h = intExcept(rng, 3, 12, [r]);
      const answer = r * r * h;
      const distractors: Distractor[] = [
        wrong(2 * r * h, "The lateral-area expression $2\\pi rh$ was used instead of the volume."),
        wrong(r * h, "The radius was not squared."),
        wrongFrac(r * r * h, 3, "The factor $\\frac{1}{3}$ belongs to the volume of a cone, not a cylinder."),
      ];
      if (level === 2) {
        distractors.unshift(wrong(4 * r * r * h, "The diameter was used in place of the radius."));
      }
      distractors.push(...slips(answer, r));
      return {
        stem:
          level === 1
            ? `A right circular cylinder has a radius of ${r} centimeters and a height of ${h} centimeters. The volume of the cylinder is $k\\pi$ cubic centimeters. What is the value of $k$?`
            : `A cylindrical water tank has a diameter of ${2 * r} meters and a height of ${h} meters. The volume of the tank is $k\\pi$ cubic meters. What is the value of $k$?`,
        answer: opt(answer),
        distractors,
        steps: [
          ...(level === 2
            ? [step("Find the radius", `The radius is half the diameter: $${2 * r} \\div 2 = ${r}$.`)]
            : []),
          step("Write the volume formula", "$V = \\pi r^2 h$."),
          step("Substitute", `$V = \\pi (${r})^2 (${h}) = ${numTex(answer)}\\pi$, so $k = ${numTex(answer)}$.`),
        ],
        hint: "The volume of a cylinder is the area of its circular base times its height.",
        audit: { kind: "value", expression: `${r}^2*${h}` },
      };
    },
  },
  {
    id: "scale-area",
    skillId: "sat-area-volume",
    title: "Scale the area of similar figures",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const [a, b] = rng.pick([
        [1, 2],
        [1, 3],
        [2, 3],
        [3, 4],
        [2, 5],
        [3, 5],
        [1, 4],
      ]);
      const unit = rng.int(2, 9);
      const small = a * a * unit;
      const large = b * b * unit;
      const shape = rng.pick(["triangle", "rectangle", "pentagon", "hexagon"]);
      return {
        stem: `Two similar ${shape}s have corresponding side lengths in the ratio $${a}:${b}$. The area of the smaller ${shape} is ${small} square centimeters. What is the area, in square centimeters, of the larger ${shape}?`,
        answer: opt(large),
        distractors: [
          wrongFrac(
            small * b,
            a,
            "The area was multiplied by the ratio of the side lengths. Areas scale by the square of that ratio.",
          ),
          wrongFrac(small * b * b * b, a * a * a, "The cube of the ratio applies to volumes, not areas."),
          wrongFrac(small * a * a, b * b, "The scale factor was applied in the wrong direction."),
          ...slips(large, unit),
        ],
        steps: [
          step("Find the scale factor for lengths", `Lengths are multiplied by $\\dfrac{${b}}{${a}}$.`),
          step(
            "Square it for areas",
            `Areas are multiplied by $\\left(\\dfrac{${b}}{${a}}\\right)^2 = \\dfrac{${b * b}}{${a * a}}$.`,
          ),
          step("Apply it", `$${small} \\times \\dfrac{${b * b}}{${a * a}} = ${large}$.`),
        ],
        hint: "If lengths scale by k, areas scale by k².",
        audit: { kind: "value", expression: `${small}*(${b}/${a})^2` },
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Triangles                                                           */
  /* ------------------------------------------------------------------ */
  {
    id: "triangle-angles",
    skillId: "sat-triangles",
    title: "Angles of a triangle",
    levels: [1, 2],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      if (level === 1) {
        const a = rng.int(25, 80);
        const b = rng.int(25, 150 - a);
        const third = 180 - a - b;
        return {
          stem: `In triangle $ABC$, the measure of angle $A$ is $${a}^\\circ$ and the measure of angle $B$ is $${b}^\\circ$. What is the measure, in degrees, of angle $C$?`,
          answer: opt(third),
          distractors: [
            wrong(360 - a - b, "The angles of a triangle add to $180^\\circ$, not $360^\\circ$."),
            wrong(a + b, "That is the sum of the two given angles; it still has to be subtracted from 180."),
            wrong(180 - a, "Only one of the given angles was subtracted."),
            ...slips(third, 5),
          ],
          steps: [
            step("Use the angle sum", "The three angles of a triangle add to $180^\\circ$."),
            step("Subtract the known angles", `$180 - ${a} - ${b} = ${third}$.`),
          ],
          hint: "The angles of a triangle add to 180 degrees.",
          audit: { kind: "value", expression: `180 - ${a} - ${b}` },
        };
      }
      const first = rng.int(30, 80);
      const second = rng.int(30, 80);
      const third = 180 - first - second;
      const x = rng.int(8, 24);
      const p = rng.int(1, 3);
      const r = rng.int(1, 3);
      const t = rng.int(1, 3);
      const q = first - p * x;
      const s = second - r * x;
      const u = third - t * x;
      const coefficients = p + r + t;
      return {
        stem: `The measures of the three angles of a triangle are $(${linearTex(p, q)})^\\circ$, $(${linearTex(r, s)})^\\circ$ and $(${linearTex(t, u)})^\\circ$. What is the value of $x$?`,
        answer: opt(x),
        distractors: [
          wrongFrac(360 - q - s - u, coefficients, "The angles of a triangle add to $180^\\circ$, not $360^\\circ$."),
          wrongFrac(180, coefficients, "The constant terms were left out of the sum."),
          wrong(first, "That is the measure of one of the angles, not the value of $x$."),
          ...slips(x),
        ],
        steps: [
          step(
            "Add the three angles",
            `$(${linearTex(p, q)}) + (${linearTex(r, s)}) + (${linearTex(t, u)}) = ${linearTex(coefficients, q + s + u)}$.`,
          ),
          step("Set the sum equal to 180", `$${linearTex(coefficients, q + s + u)} = 180$.`),
          step("Solve", `$${coefficients}x = ${180 - q - s - u}$, so $x = ${x}$.`),
        ],
        hint: "Add the three expressions and set the total equal to 180.",
        audit: {
          kind: "root",
          expression: `(${p}*x + ${exprNum(q)}) + (${r}*x + ${exprNum(s)}) + (${t}*x + ${exprNum(u)}) - 180`,
          variable: "x",
        },
      };
    },
  },
  {
    id: "pythagorean",
    skillId: "sat-triangles",
    title: "Use the Pythagorean theorem",
    levels: [1, 2],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      const [a, b, c] = rng.pick(TRIPLES);
      if (level === 1) {
        return {
          stem: `A right triangle has legs of length ${a} and ${b}. What is the length of its hypotenuse?`,
          answer: opt(c),
          distractors: [
            wrong(a + b, "The legs were added. The Pythagorean theorem adds their squares."),
            wrong(a * a + b * b, "That is the square of the hypotenuse; the square root was not taken."),
            wrong(
              Math.sqrt(b * b - a * a),
              "The squares were subtracted, which finds a missing leg rather than the hypotenuse.",
              rootTex(b * b - a * a),
            ),
            ...slips(c),
          ],
          steps: [
            step("Write the theorem", "$a^2 + b^2 = c^2$, where $c$ is the hypotenuse."),
            step("Substitute", `$${a}^2 + ${b}^2 = ${a * a} + ${b * b} = ${a * a + b * b}$.`),
            step("Take the square root", `$c = \\sqrt{${a * a + b * b}} = ${c}$.`),
          ],
          hint: "Square the legs, add, then take the square root.",
          audit: { kind: "value", expression: `sqrt(${a}^2 + ${b}^2)` },
        };
      }
      return {
        stem: `A ${c}-foot ladder leans against a vertical wall. The foot of the ladder is ${a} feet from the base of the wall. How many feet above the ground does the ladder touch the wall?`,
        answer: opt(b),
        distractors: [
          wrong(c - a, "The lengths were subtracted. The theorem works with their squares."),
          wrong(
            Math.sqrt(c * c + a * a),
            "The squares were added, which treats the ladder as a leg instead of the hypotenuse.",
            rootTex(c * c + a * a),
          ),
          wrong(c * c - a * a, "That is the square of the height; the square root was not taken."),
          ...slips(b),
        ],
        steps: [
          step(
            "Identify the hypotenuse",
            `The ladder is the hypotenuse, so $${a}^2 + h^2 = ${c}^2$, where $h$ is the height on the wall.`,
          ),
          step("Isolate the unknown square", `$h^2 = ${c * c} - ${a * a} = ${c * c - a * a}$.`),
          step("Take the square root", `$h = ${b}$.`),
        ],
        hint: "The ladder is the hypotenuse of a right triangle formed with the wall and the ground.",
        audit: { kind: "value", expression: `sqrt(${c}^2 - ${a}^2)` },
      };
    },
  },
  {
    id: "similar-triangles",
    skillId: "sat-triangles",
    title: "Find a side using similarity",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const scale = rng.pick([1.5, 2, 2.5, 3]);
      const first = rng.pick([4, 6, 8, 10, 12]);
      const second = intExcept(rng, 3, 9, [first / 2]) * 2;
      const scaledFirst = first * scale;
      const answer = second * scale;
      const stem = rng.bool()
        ? `Triangles $ABC$ and $DEF$ are similar, with vertices $A$, $B$ and $C$ corresponding to vertices $D$, $E$ and $F$. If $AB = ${first}$, $DE = ${scaledFirst}$ and $BC = ${second}$, what is the length of $EF$?`
        : `A pole that is ${second} feet tall casts a shadow that is ${first} feet long. At the same time, a nearby tree casts a shadow that is ${scaledFirst} feet long. How tall, in feet, is the tree?`;
      return {
        stem,
        answer: opt(answer),
        distractors: [
          wrong(
            second + (scaledFirst - first),
            "The difference between corresponding sides was added. Similar figures are related by a common ratio, not a common difference.",
          ),
          wrongFrac(second * first, scaledFirst, "The scale factor was applied in the wrong direction."),
          wrong(answer * scale, "The scale factor was applied twice."),
          ...slips(answer),
        ],
        steps: [
          step(
            "Find the scale factor",
            `Corresponding lengths ${first} and ${scaledFirst} give a ratio of $\\dfrac{${scaledFirst}}{${first}} = ${numTex(scale)}$.`,
          ),
          step("Apply it to the other side", `$${second} \\times ${numTex(scale)} = ${answer}$.`),
        ],
        hint: "Corresponding sides of similar triangles are in the same ratio.",
        audit: { kind: "value", expression: `${second}*${scaledFirst}/${first}` },
      };
    },
  },
  {
    id: "special-right",
    skillId: "sat-triangles",
    title: "Special right triangles",
    levels: [2],
    formats: ["choice"],
    build({ rng }): Draft {
      const a = rng.int(2, 9);
      const variant = rng.int(0, 3);
      const root3 = a * Math.sqrt(3);
      const root2 = a * Math.sqrt(2);
      if (variant === 0) {
        return {
          stem: `A right triangle has acute angles of $30^\\circ$ and $60^\\circ$. Its shorter leg has length ${a}. What is the length of its longer leg?`,
          answer: opt(root3, rootTex(3, a)),
          distractors: [
            wrong(2 * a, "That is the hypotenuse, which is twice the shorter leg."),
            wrong(root2, "$\\sqrt{2}$ belongs to the 45-45-90 triangle.", rootTex(2, a)),
            wrong(3 * a, "The longer leg is $\\sqrt{3}$ times the shorter leg, not 3 times."),
          ],
          steps: [
            step("Recall the ratio", "The sides of a 30-60-90 triangle are in the ratio $1 : \\sqrt{3} : 2$."),
            step("Scale it", `With a shorter leg of ${a}, the longer leg is $${rootTex(3, a)}$.`),
          ],
          hint: "The sides of a 30-60-90 triangle are in the ratio 1 : √3 : 2.",
          audit: { kind: "value", expression: `${a}*sqrt(3)` },
        };
      }
      if (variant === 1) {
        return {
          stem: `A right triangle has acute angles of $30^\\circ$ and $60^\\circ$. Its hypotenuse has length ${2 * a}. What is the length of its longer leg?`,
          answer: opt(root3, rootTex(3, a)),
          distractors: [
            wrong(a, "That is the shorter leg, which is half the hypotenuse."),
            wrong(
              2 * root3,
              "The hypotenuse was multiplied by $\\sqrt{3}$. The longer leg is $\\sqrt{3}$ times the shorter leg.",
              rootTex(3, 2 * a),
            ),
            wrong(root2, "$\\sqrt{2}$ belongs to the 45-45-90 triangle.", rootTex(2, a)),
          ],
          steps: [
            step("Find the shorter leg", `It is half the hypotenuse: $${2 * a} \\div 2 = ${a}$.`),
            step("Find the longer leg", `It is $\\sqrt{3}$ times the shorter leg: $${rootTex(3, a)}$.`),
          ],
          hint: "In a 30-60-90 triangle the shorter leg is half the hypotenuse.",
          audit: { kind: "value", expression: `${2 * a}/2*sqrt(3)` },
        };
      }
      if (variant === 2) {
        return {
          stem: `An isosceles right triangle has legs of length ${a}. What is the length of its hypotenuse?`,
          answer: opt(root2, rootTex(2, a)),
          distractors: [
            wrong(2 * a, "The legs were added. The hypotenuse is $\\sqrt{2}$ times a leg."),
            wrong(root3, "$\\sqrt{3}$ belongs to the 30-60-90 triangle.", rootTex(3, a)),
            wrong(2 * a * a, "That is the square of the hypotenuse; the square root was not taken."),
          ],
          steps: [
            step("Recall the ratio", "The sides of a 45-45-90 triangle are in the ratio $1 : 1 : \\sqrt{2}$."),
            step("Scale it", `With legs of ${a}, the hypotenuse is $${rootTex(2, a)}$.`),
          ],
          hint: "The sides of a 45-45-90 triangle are in the ratio 1 : 1 : √2.",
          audit: { kind: "value", expression: `sqrt(${a}^2 + ${a}^2)` },
        };
      }
      return {
        stem: `An isosceles right triangle has a hypotenuse of length ${2 * a}. What is the length of each leg?`,
        answer: opt(root2, rootTex(2, a)),
        distractors: [
          wrong(a, "Half the hypotenuse is the shorter leg of a 30-60-90 triangle, not a leg of an isosceles right triangle."),
          wrong(2 * root2, "The hypotenuse was multiplied by $\\sqrt{2}$ instead of divided by it.", rootTex(2, 2 * a)),
          wrong(root3, "$\\sqrt{3}$ belongs to the 30-60-90 triangle.", rootTex(3, a)),
        ],
        steps: [
          step("Use the ratio", "In a 45-45-90 triangle the hypotenuse is $\\sqrt{2}$ times a leg, so a leg is the hypotenuse divided by $\\sqrt{2}$."),
          step(
            "Divide and rationalize",
            `$\\dfrac{${2 * a}}{\\sqrt{2}} = \\dfrac{${2 * a}\\sqrt{2}}{2} = ${rootTex(2, a)}$.`,
          ),
        ],
        hint: "Divide the hypotenuse by √2, then rationalize the denominator.",
        audit: { kind: "value", expression: `${2 * a}/sqrt(2)` },
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Circles                                                             */
  /* ------------------------------------------------------------------ */
  {
    id: "circle-equation",
    skillId: "sat-circles",
    title: "Read the equation of a circle",
    levels: [1, 2],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      const h = rng.nonZero(-6, 6);
      const k = rng.nonZero(-6, 6);
      const r = rng.int(2, 9);
      const standard = `(${linearTex(1, -h)})^2 + (${linearTex(1, -k, "y")})^2 = ${r * r}`;
      if (level === 1) {
        return {
          stem: `In the $xy$-plane, a circle has the equation $${standard}$. What is the radius of the circle?`,
          answer: opt(r),
          distractors: [
            wrong(r * r, "The right side of the equation is the square of the radius."),
            wrong(2 * r, "That is the diameter."),
            wrongFrac(r * r, 2, "The right side was halved instead of square-rooted."),
            ...slips(r),
          ],
          steps: [
            step("Recall the standard form", "$(x - h)^2 + (y - k)^2 = r^2$ is a circle with center $(h, k)$ and radius $r$."),
            step("Read off the radius", `$r^2 = ${r * r}$, so $r = ${r}$.`),
          ],
          hint: "The right side of the standard form is r², not r.",
          audit: { kind: "value", expression: `sqrt(${r * r})` },
        };
      }
      const d = -2 * h;
      const e = -2 * k;
      const f = h * h + k * k - r * r;
      const general = sumTex([
        { coefficient: 1, symbol: "x^2" },
        { coefficient: 1, symbol: "y^2" },
        { coefficient: d, symbol: "x" },
        { coefficient: e, symbol: "y" },
        { coefficient: f, symbol: "" },
      ]);
      const distractors: Distractor[] = [
        wrong(r * r, "That is the square of the radius; the square root was not taken."),
        wrong(2 * r, "That is the diameter."),
      ];
      if (f !== 0) {
        distractors.push(
          wrong(
            Math.sqrt(Math.abs(f)),
            "The constant term was square-rooted without completing the square first.",
            rootTex(Math.abs(f)),
          ),
        );
      }
      distractors.push(...slips(r));
      return {
        stem: `In the $xy$-plane, a circle has the equation $${general} = 0$. What is the radius of the circle?`,
        answer: opt(r),
        distractors,
        steps: [
          step(
            "Complete the square in x and in y",
            `Add $${h * h}$ and $${k * k}$ to both sides after moving the constant: $(${linearTex(1, -h)})^2 + (${linearTex(1, -k, "y")})^2 = ${numTex(-f)} + ${h * h} + ${k * k}$.`,
          ),
          step("Simplify", `$${standard}$.`),
          step("Read off the radius", `$r^2 = ${r * r}$, so $r = ${r}$.`),
        ],
        hint: "Complete the square to put the equation in standard form.",
        audit: {
          kind: "value",
          expression: `sqrt((${exprNum(d)}/2)^2 + (${exprNum(e)}/2)^2 - ${exprNum(f)})`,
        },
      };
    },
  },
  {
    id: "arc-length",
    skillId: "sat-circles",
    title: "Length of an arc",
    levels: [2],
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
        [90, 8],
        [120, 3],
        [120, 6],
        [120, 9],
        [135, 4],
        [135, 8],
        [150, 6],
        [150, 12],
      ]);
      const k = (theta * r) / 180;
      return {
        stem: `A circle has a radius of ${r}. An arc of the circle is intercepted by a central angle of $${theta}^\\circ$. The length of the arc is $k\\pi$. What is the value of $k$?`,
        answer: opt(k),
        distractors: [
          wrongFrac(theta * r * r, 360, "The sector-area formula was used instead of the arc-length formula."),
          wrongFrac(
            theta * r,
            360,
            "The fraction of the circle was multiplied by $\\pi r$ instead of the full circumference $2\\pi r$.",
          ),
          wrong(2 * r, "That is the whole circumference, not the part cut off by the angle."),
          ...slips(k),
        ],
        steps: [
          step("Find the fraction of the circle", `$\\dfrac{${theta}}{360}$ of the circle is intercepted.`),
          step("Find the circumference", `$2\\pi r = ${2 * r}\\pi$.`),
          step("Multiply", `$\\dfrac{${theta}}{360} \\times ${2 * r}\\pi = ${numTex(k)}\\pi$, so $k = ${numTex(k)}$.`),
        ],
        hint: "An arc is the same fraction of the circumference as its central angle is of 360 degrees.",
        audit: { kind: "value", expression: `${theta}/360*2*${r}` },
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Trigonometry                                                        */
  /* ------------------------------------------------------------------ */
  {
    id: "trig-ratio",
    skillId: "sat-trigonometry",
    title: "Right-triangle trigonometric ratios",
    levels: [1, 2],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      const [a, b, c] = rng.pick(TRIPLES);
      if (level === 1) {
        const ask = rng.pick(["sin", "cos", "tan"] as const);
        const ratios = {
          sin: { n: a, d: c, rule: "opposite over hypotenuse", audit: `${a}/sqrt(${a}^2 + ${b}^2)` },
          cos: { n: b, d: c, rule: "adjacent over hypotenuse", audit: `${b}/sqrt(${a}^2 + ${b}^2)` },
          tan: { n: a, d: b, rule: "opposite over adjacent", audit: `${a}/${b}` },
        };
        const target = ratios[ask];
        const others = (["sin", "cos", "tan"] as const).filter((name) => name !== ask);
        return {
          stem: `In right triangle $ABC$, angle $C$ is the right angle, $BC = ${a}$, $AC = ${b}$ and $AB = ${c}$. What is the value of $\\${ask} A$?`,
          answer: optFrac(target.n, target.d),
          distractors: [
            ...others.map((name) =>
              wrongFrac(ratios[name].n, ratios[name].d, `That is $\\${name} A$, which is ${ratios[name].rule}.`),
            ),
            wrongFrac(target.d, target.n, "The ratio was inverted."),
            ...slipsFrac(target.n, target.d),
          ],
          steps: [
            step(
              "Label the sides from angle A",
              `The side opposite angle $A$ is $BC = ${a}$, the adjacent side is $AC = ${b}$, and the hypotenuse is $AB = ${c}$.`,
            ),
            step(
              "Apply the definition",
              `$\\${ask} A$ is ${target.rule}: ${optFrac(target.n, target.d).display}.`,
            ),
          ],
          hint: "Sine is opposite over hypotenuse, cosine is adjacent over hypotenuse, tangent is opposite over adjacent.",
          audit: { kind: "value", expression: target.audit },
        };
      }
      const askCos = rng.bool();
      return {
        stem: `In a right triangle, angle $A$ is acute and $\\sin A = \\frac{${a}}{${c}}$. What is the value of $\\${askCos ? "cos" : "tan"} A$?`,
        answer: askCos ? optFrac(b, c) : optFrac(a, b),
        distractors: askCos
          ? [
              wrongFrac(c - a, c, "$1 - \\sin A$ was used. The identity is $\\sin^2 A + \\cos^2 A = 1$."),
              wrongFrac(a, b, "That is $\\tan A$."),
              wrongFrac(c, b, "The ratio was inverted; a cosine is never greater than 1."),
              ...slipsFrac(b, c),
            ]
          : [
              wrongFrac(b, a, "The ratio was inverted: tangent is opposite over adjacent."),
              wrongFrac(b, c, "That is $\\cos A$."),
              wrongFrac(a, c, "That is $\\sin A$ again."),
              ...slipsFrac(a, b),
            ],
        steps: [
          step(
            "Draw a triangle that fits",
            `$\\sin A = \\frac{${a}}{${c}}$ means the opposite side is ${a} and the hypotenuse is ${c} (or the same multiple of each).`,
          ),
          step(
            "Find the third side",
            `The adjacent side is $\\sqrt{${c}^2 - ${a}^2} = \\sqrt{${c * c - a * a}} = ${b}$.`,
          ),
          step(
            "Form the ratio",
            askCos
              ? `$\\cos A$ is adjacent over hypotenuse: ${optFrac(b, c).display}.`
              : `$\\tan A$ is opposite over adjacent: ${optFrac(a, b).display}.`,
          ),
        ],
        hint: "Sketch a right triangle whose sides match the given ratio, then find the missing side.",
        audit: {
          kind: "value",
          expression: askCos
            ? `sqrt(1 - (${a}/${c})^2)`
            : `(${a}/${c})/sqrt(1 - (${a}/${c})^2)`,
        },
      };
    },
  },
  {
    id: "cofunction",
    skillId: "sat-trigonometry",
    title: "Sine and cosine of complementary angles",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const x = rng.int(5, 20);
      const p = rng.int(1, 4);
      const r = rng.int(1, 4);
      const first = rng.int(15, 70);
      const q = first - p * x;
      const s = 90 - first - r * x;
      const distractors: Distractor[] = [
        wrongFrac(
          180 - q - s,
          p + r,
          "The angles were treated as supplementary, adding to $180^\\circ$, instead of complementary.",
        ),
      ];
      if (p !== r) {
        distractors.push(
          wrongFrac(
            s - q,
            p - r,
            "The two angles were set equal. Sine and cosine agree for complementary angles, not for equal ones.",
          ),
        );
      }
      distractors.push(wrong(first, "That is the measure of the first angle, not the value of $x$."), ...slips(x));
      return {
        stem: `If $\\sin(${linearTex(p, q)})^\\circ = \\cos(${linearTex(r, s)})^\\circ$ and both angles are acute, what is the value of $x$?`,
        answer: opt(x),
        distractors,
        steps: [
          step(
            "Use the cofunction relationship",
            "For acute angles, $\\sin \\alpha = \\cos \\beta$ exactly when $\\alpha + \\beta = 90^\\circ$.",
          ),
          step(
            "Add the angles",
            `$(${linearTex(p, q)}) + (${linearTex(r, s)}) = 90$, so $${linearTex(p + r, q + s)} = 90$.`,
          ),
          step("Solve", `$${p + r}x = ${90 - q - s}$, so $x = ${x}$.`),
        ],
        hint: "The sine of an angle equals the cosine of its complement.",
        audit: {
          kind: "root",
          expression: `sin((${p}*x + ${exprNum(q)})*pi/180) - cos((${r}*x + ${exprNum(s)})*pi/180)`,
          variable: "x",
        },
      };
    },
  },
  {
    id: "radians-to-degrees",
    skillId: "sat-trigonometry",
    title: "Convert radians to degrees",
    levels: [1],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const [n, d] = rng.pick([
        [1, 6],
        [1, 4],
        [1, 3],
        [2, 3],
        [3, 4],
        [5, 6],
        [7, 6],
        [5, 4],
        [4, 3],
        [3, 2],
        [5, 3],
        [7, 4],
        [11, 6],
        [1, 12],
        [5, 12],
        [7, 12],
        [2, 5],
        [3, 5],
        [2, 9],
        [1, 10],
        [3, 10],
      ]);
      const degrees = (180 * n) / d;
      return {
        stem: `An angle has a measure of $${piTex(n, d)}$ radians. What is the measure of the angle in degrees?`,
        answer: opt(degrees),
        distractors: [
          wrong((360 * n) / d, "$2\\pi$ radians is $360^\\circ$, so $\\pi$ radians is $180^\\circ$, not $360^\\circ$."),
          wrong((90 * n) / d, "$\\pi$ radians was converted as $90^\\circ$ instead of $180^\\circ$."),
          wrongFrac(180 * d, n, "The fraction was inverted before converting."),
          ...slips(degrees, 15),
        ],
        steps: [
          step("Use the conversion", "$\\pi$ radians equals $180^\\circ$."),
          step(
            "Replace π with 180 degrees",
            `$${piTex(n, d)} = \\dfrac{${n} \\times 180}{${d}} = ${numTex(degrees)}$ degrees.`,
          ),
        ],
        hint: "π radians is 180 degrees.",
        audit: { kind: "value", expression: `${n}*pi/${d}*180/pi` },
      };
    },
  },
];
