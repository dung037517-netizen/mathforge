/**
 * AP Statistics — describing data, probability, sampling distributions and
 * inference.
 *
 * Several contexts are drawn from insurance on purpose: expected claim cost,
 * pooled risk and screening for fraud are the same statistics a first actuarial
 * exam asks for, in the setting where they are used.
 */

import { normalCdf } from "@/lib/math-engine";
import { fixedTex, m, money, numTex, rootTex, tidy } from "@/lib/practice/format";
import {
  intExcept,
  opt,
  optText,
  slips,
  step,
  wrong,
  wrongText,
} from "@/lib/practice/templates/helpers";
import type { Distractor, Draft, Option, TableSpec, Template } from "@/types/practice";

/** A decimal option shown to a fixed number of places. */
function dec(value: number, places: number): Option {
  return { display: m(fixedTex(value, places)), value };
}

function wrongDec(value: number, places: number, why: string): Distractor {
  return { display: m(fixedTex(value, places)), value, why };
}

/** Fallback decimal distractors that stay inside (0, 1). */
function slipsDec(value: number, places: number, size: number): Distractor[] {
  return [value + size, value - size, value + 2 * size, value - 2 * size]
    .filter((candidate) => candidate > 0 && candidate < 1)
    .map((candidate) =>
      wrongDec(candidate, places, "An arithmetic slip. Recomputing each step gives a different value."),
    );
}

function choose(n: number, k: number): number {
  let result = 1;
  for (let index = 1; index <= k; index += 1) result = (result * (n - k + index)) / index;
  return Math.round(result);
}

/** Clean standard errors for a proportion: [p, n, sqrt(p(1-p)/n)]. */
const PROPORTION_CASES: readonly (readonly [number, number, number])[] = [
  [0.5, 100, 0.05],
  [0.2, 100, 0.04],
  [0.2, 400, 0.02],
  [0.5, 400, 0.025],
  [0.1, 100, 0.03],
  [0.1, 900, 0.01],
  [0.36, 64, 0.06],
  [0.36, 144, 0.04],
  [0.36, 256, 0.03],
  [0.8, 64, 0.05],
  [0.8, 400, 0.02],
  [0.9, 225, 0.02],
  [0.5, 625, 0.02],
  [0.64, 144, 0.04],
  [0.9, 100, 0.03],
  [0.8, 100, 0.04],
];

const CRITICAL_VALUES: readonly (readonly [number, number])[] = [
  [90, 1.645],
  [95, 1.96],
  [99, 2.576],
];

interface EmpiricalCase {
  readonly describe: (mu: number, sigma: number, noun: string) => string;
  readonly answer: number;
  readonly wrong: readonly (readonly [number, string])[];
  readonly reason: string;
}

const EMPIRICAL_CASES: readonly EmpiricalCase[] = [
  {
    describe: (mu, sigma, noun) => `${noun} between ${mu - sigma} and ${mu + sigma}`,
    answer: 68,
    wrong: [
      [34, "That is only one side of the mean."],
      [95, "That is the percent within two standard deviations of the mean."],
      [32, "That is the percent outside the interval."],
    ],
    reason: "The interval runs from one standard deviation below the mean to one above, which holds about 68% of the values.",
  },
  {
    describe: (mu, sigma, noun) => `${noun} between ${mu - 2 * sigma} and ${mu + 2 * sigma}`,
    answer: 95,
    wrong: [
      [68, "That is the percent within one standard deviation of the mean."],
      [47.5, "That is only one side of the mean."],
      [99.7, "That is the percent within three standard deviations of the mean."],
    ],
    reason: "The interval runs from two standard deviations below the mean to two above, which holds about 95% of the values.",
  },
  {
    describe: (mu, sigma, noun) => `${noun} between ${mu} and ${mu + sigma}`,
    answer: 34,
    wrong: [
      [68, "That counts both sides of the mean."],
      [16, "That is the percent more than one standard deviation above the mean."],
      [50, "That is everything above the mean."],
    ],
    reason: "Half of the central 68% lies between the mean and one standard deviation above it: 34%.",
  },
  {
    describe: (mu, sigma, noun) => `${noun} between ${mu + sigma} and ${mu + 2 * sigma}`,
    answer: 13.5,
    wrong: [
      [27, "That counts the matching region below the mean as well."],
      [47.5, "That is the percent between the mean and two standard deviations above it."],
      [34, "That is the percent between the mean and one standard deviation above it."],
    ],
    reason: "Between the mean and two standard deviations above is 47.5%; between the mean and one above is 34%. The difference is 13.5%.",
  },
  {
    describe: (mu, sigma, noun) => `${noun} greater than ${mu + sigma}`,
    answer: 16,
    wrong: [
      [32, "That counts both tails."],
      [34, "That is the percent between the mean and one standard deviation above it."],
      [84, "That is the percent below the value."],
    ],
    reason: "About 68% lies within one standard deviation, leaving 32% in the two tails, or 16% in each.",
  },
  {
    describe: (mu, sigma, noun) => `${noun} greater than ${mu + 2 * sigma}`,
    answer: 2.5,
    wrong: [
      [5, "That counts both tails."],
      [97.5, "That is the percent below the value."],
      [47.5, "That is the percent between the mean and the value."],
    ],
    reason: "About 95% lies within two standard deviations, leaving 5% in the two tails, or 2.5% in each.",
  },
  {
    describe: (mu, sigma, noun) => `${noun} less than ${mu + sigma}`,
    answer: 84,
    wrong: [
      [68, "That is the percent within one standard deviation of the mean."],
      [16, "That is the percent above the value."],
      [34, "That is the percent between the mean and the value."],
    ],
    reason: "Everything below the mean (50%) plus the 34% between the mean and one standard deviation above it gives 84%.",
  },
  {
    describe: (mu, sigma, noun) => `${noun} between ${mu - sigma} and ${mu + 2 * sigma}`,
    answer: 81.5,
    wrong: [
      [68, "That stops at one standard deviation above the mean."],
      [95, "That starts at two standard deviations below the mean."],
      [47.5, "That counts only the part above the mean."],
    ],
    reason: "From one standard deviation below the mean to the mean is 34%; from the mean to two above is 47.5%. Together that is 81.5%.",
  },
];

export const AP_STATISTICS_TEMPLATES: readonly Template[] = [
  /* ------------------------------------------------------------------ */
  /* Describing data                                                     */
  /* ------------------------------------------------------------------ */
  {
    id: "z-score",
    skillId: "stats-describing-data",
    title: "Standardized scores",
    levels: [1, 2],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      const mu = rng.int(60, 80);
      const sigma = rng.pick([4, 5, 6, 8, 10]);
      const z = sigma === 5 ? rng.pick([-2, -1, 1, 2, 3]) : rng.pick([-2.5, -2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5]);
      const x = tidy(mu + z * sigma);
      const setup = `Scores on an exam are approximately normally distributed with mean ${mu} and standard deviation ${sigma}.`;
      if (level === 1) {
        return {
          stem: `${setup} What is the standardized score ($z$-score) of an exam score of ${x}?`,
          answer: opt(z),
          distractors: [
            wrong(-z, "The score and the mean were subtracted in the wrong order."),
            wrong(tidy(x - mu), "The deviation from the mean was not divided by the standard deviation."),
            wrong(tidy(x / sigma, 2), "The mean was not subtracted before dividing."),
            ...slips(z, 0.5),
          ],
          steps: [
            step("Write the formula", "$z = \\dfrac{x - \\mu}{\\sigma}$."),
            step("Substitute", `$z = \\dfrac{${x} - ${mu}}{${sigma}} = \\dfrac{${numTex(x - mu)}}{${sigma}} = ${numTex(z)}$.`),
          ],
          hint: "A z-score counts how many standard deviations a value lies from the mean.",
          audit: { kind: "value", expression: `(${x} - ${mu})/${sigma}` },
        };
      }
      return {
        stem: `${setup} A student's exam score has a $z$-score of $${numTex(z)}$. What was the student's score?`,
        answer: opt(x),
        distractors: [
          wrong(tidy(mu + z), `The $z$-score was added directly. It counts standard deviations, each worth ${sigma} points.`),
          wrong(tidy(mu - z * sigma), "The sign of the $z$-score was reversed."),
          wrong(tidy(z * sigma), "That is the distance from the mean, not the score."),
          ...slips(x),
        ],
        steps: [
          step("Rearrange the z-score formula", "$x = \\mu + z\\sigma$."),
          step("Substitute", `$x = ${mu} + (${numTex(z)})(${sigma}) = ${numTex(x)}$.`),
        ],
        hint: "Multiply the z-score by the standard deviation, then add the mean.",
        audit: { kind: "value", expression: `${mu} + (${z})*${sigma}` },
      };
    },
  },
  {
    id: "iqr-outlier",
    skillId: "stats-describing-data",
    title: "The 1.5 × IQR rule",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }): Draft {
      const q1 = rng.int(20, 60);
      const iqr = rng.pick([4, 6, 8, 10, 12, 16, 20]);
      const q3 = q1 + iqr;
      const upper = q3 + 1.5 * iqr;
      const lower = q1 - 1.5 * iqr;
      const setup = `A data set has first quartile $Q_1 = ${q1}$ and third quartile $Q_3 = ${q3}$.`;
      if (rng.bool()) {
        return {
          stem: `${setup} Using the $1.5 \\times \\text{IQR}$ rule, a value greater than what number is classified as an outlier?`,
          answer: opt(upper),
          distractors: [
            wrong(q3 + iqr, "The IQR was added without the factor of 1.5."),
            wrong(q1 + 1.5 * iqr, "The fence was measured from $Q_1$ instead of from $Q_3$."),
            wrong(1.5 * iqr, "That is the distance from the quartile to the fence, not the fence itself."),
            ...slips(upper),
          ],
          steps: [
            step("Find the IQR", `$\\text{IQR} = ${q3} - ${q1} = ${iqr}$.`),
            step("Find the upper fence", `$Q_3 + 1.5 \\times \\text{IQR} = ${q3} + ${1.5 * iqr} = ${upper}$.`),
          ],
          hint: "The upper fence is Q3 plus 1.5 times the IQR.",
          audit: { kind: "value", expression: `${q3} + 1.5*(${q3} - ${q1})` },
        };
      }
      return {
        stem: `${setup} Using the $1.5 \\times \\text{IQR}$ rule, a value less than what number is classified as an outlier?`,
        answer: opt(lower),
        distractors: [
          wrong(q1 - iqr, "The IQR was subtracted without the factor of 1.5."),
          wrong(q3 - 1.5 * iqr, "The fence was measured from $Q_3$ instead of from $Q_1$."),
          wrong(1.5 * iqr, "That is the distance from the quartile to the fence, not the fence itself."),
          ...slips(lower),
        ],
        steps: [
          step("Find the IQR", `$\\text{IQR} = ${q3} - ${q1} = ${iqr}$.`),
          step("Find the lower fence", `$Q_1 - 1.5 \\times \\text{IQR} = ${q1} - ${1.5 * iqr} = ${numTex(lower)}$.`),
        ],
        hint: "The lower fence is Q1 minus 1.5 times the IQR.",
        audit: { kind: "value", expression: `${q1} - 1.5*(${q3} - ${q1})` },
      };
    },
  },
  {
    id: "linear-transform-stats",
    skillId: "stats-describing-data",
    title: "Effect of rescaling on mean and spread",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }): Draft {
      const mean = rng.int(40, 70);
      const sd = rng.pick([4, 6, 8, 10]);
      const b = rng.pick([2, 3, 0.5, 1.5]);
      const a = rng.pick([-10, -5, 5, 10, 20]);
      const setup = `A set of scores has mean ${mean} and standard deviation ${sd}. Each score is multiplied by ${b} and then ${a > 0 ? `increased by ${a}` : `decreased by ${-a}`}.`;
      if (rng.bool()) {
        const answer = tidy(b * sd);
        return {
          stem: `${setup} What is the standard deviation of the new scores?`,
          answer: opt(answer),
          distractors: [
            wrong(tidy(b * sd + a), "Adding a constant shifts every value by the same amount, so it does not change the spread."),
            wrong(sd, `Multiplying every value by ${b} multiplies the spread by ${b} as well.`),
            wrong(tidy(b * b * sd), "The square of the multiplier applies to the variance, not to the standard deviation."),
            ...slips(answer),
          ],
          steps: [
            step("Multiplication rescales the spread", `Multiplying by ${b} multiplies the standard deviation by ${b}: $${b} \\times ${sd} = ${numTex(answer)}$.`),
            step("Addition does not", "Adding or subtracting a constant moves every value equally, so the standard deviation is unchanged."),
          ],
          hint: "Shifting does not change spread; scaling does.",
          audit: { kind: "value", expression: `${b}*${sd}` },
          insight: "$\\text{Var}(a + bX) = b^2\\,\\text{Var}(X)$ is the rule an actuary uses to scale a loss distribution for inflation.",
        };
      }
      const answer = tidy(b * mean + a);
      return {
        stem: `${setup} What is the mean of the new scores?`,
        answer: opt(answer),
        distractors: [
          wrong(tidy(b * mean), "The constant was not applied after multiplying."),
          wrong(mean + a, "The multiplication was skipped."),
          wrong(tidy(b * (mean + a)), "The two operations were applied in the wrong order."),
          ...slips(answer),
        ],
        steps: [
          step("Apply the same operations to the mean", `The mean is transformed exactly like each score: $${b} \\times ${mean} ${a < 0 ? "-" : "+"} ${Math.abs(a)}$.`),
          step("Evaluate", `$${numTex(b * mean)} ${a < 0 ? "-" : "+"} ${Math.abs(a)} = ${numTex(answer)}$.`),
        ],
        hint: "The mean follows every score: multiply, then shift.",
        audit: { kind: "value", expression: `${b}*${mean} + (${a})` },
      };
    },
  },
  {
    id: "regression",
    skillId: "stats-regression",
    title: "Least-squares regression",
    levels: [2, 3],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      if (level === 2) {
        const slope = rng.pick([0.5, 1.5, 2, 2.5, -0.5, -1.5, -2]);
        const intercept = rng.int(10, 60);
        const x0 = rng.pick([2, 4, 6, 8, 10]);
        const predicted = tidy(intercept + slope * x0);
        const residual = rng.pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6]);
        const observed = tidy(predicted + residual);
        const line = `\\hat{y} = ${intercept} ${slope < 0 ? "-" : "+"} ${numTex(Math.abs(slope))}x`;
        return {
          stem: `A least-squares regression line is $${line}$. One of the observations is $(${x0}, ${numTex(observed)})$. What is the residual for this observation?`,
          answer: opt(residual),
          distractors: [
            wrong(-residual, "A residual is observed minus predicted, not predicted minus observed."),
            wrong(predicted, "That is the predicted value, not the residual."),
            wrong(tidy(observed - slope * x0), "The intercept was left out of the prediction."),
            ...slips(residual),
          ],
          steps: [
            step("Find the predicted value", `$\\hat{y} = ${intercept} ${slope < 0 ? "-" : "+"} ${numTex(Math.abs(slope))}(${x0}) = ${numTex(predicted)}$.`),
            step("Subtract it from the observed value", `$${numTex(observed)} - ${numTex(predicted)} = ${numTex(residual)}$.`),
          ],
          hint: "Residual = observed − predicted.",
          audit: { kind: "value", expression: `${observed} - (${intercept} + (${slope})*${x0})` },
        };
      }
      const r = rng.pick([0.5, 0.6, 0.8, 0.9, 0.75, -0.5, -0.6, -0.8, -0.75]);
      const sx = rng.pick([2, 4, 5]);
      const sy = rng.pick([6, 8, 10, 12, 20]);
      const slope = tidy((r * sy) / sx, 4);
      return {
        stem: `For a set of bivariate data, the correlation is $r = ${numTex(r)}$, the standard deviation of $x$ is $s_x = ${sx}$ and the standard deviation of $y$ is $s_y = ${sy}$. What is the slope of the least-squares regression line of $y$ on $x$?`,
        answer: opt(slope),
        distractors: [
          wrong(tidy((r * sx) / sy, 4), "The ratio of the standard deviations was inverted."),
          wrong(r, "The correlation equals the slope only when the two standard deviations are equal."),
          wrong(tidy(sy / sx, 4), "The correlation was left out."),
          wrong(tidy((r * r * sy) / sx, 4), "$r^2$ is the proportion of variation explained; the slope uses $r$."),
          ...slips(slope, 0.5),
        ],
        steps: [
          step("Write the formula", "$b = r\\dfrac{s_y}{s_x}$."),
          step("Substitute", `$b = (${numTex(r)})\\dfrac{${sy}}{${sx}} = ${numTex(slope)}$.`),
        ],
        hint: "The slope is the correlation times the ratio of the standard deviations, y over x.",
        audit: { kind: "value", expression: `(${r})*${sy}/${sx}` },
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Probability                                                         */
  /* ------------------------------------------------------------------ */
  {
    id: "union-conditional",
    skillId: "stats-probability-rules",
    title: "Addition rule and conditional probability",
    levels: [1, 2],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      if (level === 1) {
        const both = rng.pick([0.05, 0.1, 0.15, 0.2]);
        const a = tidy(both + rng.pick([0.1, 0.2, 0.25, 0.3]));
        const b = tidy(both + rng.pick([0.1, 0.15, 0.2, 0.3]));
        const union = tidy(a + b - both);
        return {
          stem: `For events $A$ and $B$, $P(A) = ${numTex(a)}$, $P(B) = ${numTex(b)}$ and $P(A \\cap B) = ${numTex(both)}$. What is $P(A \\cup B)$?`,
          answer: opt(union),
          distractors: [
            wrong(tidy(a + b), "The overlap was counted twice. $P(A \\cap B)$ has to be subtracted once."),
            wrong(tidy(a * b, 4), "Multiplying gives $P(A \\cap B)$ for independent events, not the union."),
            wrong(tidy(a + b + both), "The intersection was added instead of subtracted."),
            ...slips(union, 0.05),
          ],
          steps: [
            step("Write the addition rule", "$P(A \\cup B) = P(A) + P(B) - P(A \\cap B)$."),
            step("Substitute", `$${numTex(a)} + ${numTex(b)} - ${numTex(both)} = ${numTex(union)}$.`),
          ],
          hint: "Add the two probabilities, then subtract the overlap so it is not counted twice.",
          audit: { kind: "value", expression: `${a} + ${b} - ${both}` },
        };
      }
      const pb = rng.pick([0.2, 0.25, 0.4, 0.5]);
      const conditional = rng.pick([0.2, 0.3, 0.4, 0.6, 0.8]);
      const both = tidy(pb * conditional, 4);
      const pa = tidy(both + rng.pick([0.1, 0.2, 0.25]), 4);
      return {
        stem: `For events $A$ and $B$, $P(A) = ${numTex(pa)}$, $P(B) = ${numTex(pb)}$ and $P(A \\cap B) = ${numTex(both)}$. What is $P(A \\mid B)$?`,
        answer: opt(conditional),
        distractors: [
          wrong(tidy(both / pa, 4), "The intersection was divided by $P(A)$, which gives $P(B \\mid A)$."),
          wrong(both, "That is $P(A \\cap B)$. A conditional probability rescales it by the probability of the given event."),
          wrong(pa, "That would be correct only if $A$ and $B$ were independent."),
          wrong(tidy(both * pb, 4), "The intersection was multiplied by $P(B)$ instead of divided by it."),
          ...slips(conditional, 0.1),
        ],
        steps: [
          step("Write the definition", "$P(A \\mid B) = \\dfrac{P(A \\cap B)}{P(B)}$."),
          step("Substitute", `$\\dfrac{${numTex(both)}}{${numTex(pb)}} = ${numTex(conditional)}$.`),
        ],
        hint: "Divide the probability of both events by the probability of the event you are given.",
        audit: { kind: "value", expression: `${both}/${pb}` },
      };
    },
  },
  {
    id: "bayes-screening",
    skillId: "stats-probability-rules",
    title: "Reverse a conditional probability",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const base = rng.pick([0.01, 0.02, 0.05, 0.1]);
      const hit = rng.pick([0.8, 0.9, 0.95]);
      const falseAlarm = rng.pick([0.05, 0.1, 0.2]);
      const population = 10000;
      const positives = Math.round(base * population);
      const truePositives = Math.round(positives * hit);
      const falsePositives = Math.round((population - positives) * falseAlarm);
      const answer = truePositives / (truePositives + falsePositives);
      const percent = (value: number): string => `${numTex(value * 100, 1)}%`;
      const context = rng.pick([
        {
          setup: `An insurer estimates that ${percent(base)} of its claims are fraudulent. Its screening model flags ${percent(hit)} of fraudulent claims and ${percent(falseAlarm)} of legitimate claims.`,
          ask: "If a claim is flagged, what is the probability, rounded to three decimal places, that it is fraudulent?",
          unit: "claims",
          positive: "are fraudulent",
          negative: "are legitimate",
          flag: "flagged",
        },
        {
          setup: `In a population, ${percent(base)} of people have a certain condition. A screening test is positive for ${percent(hit)} of people who have the condition and for ${percent(falseAlarm)} of people who do not.`,
          ask: "If a person tests positive, what is the probability, rounded to three decimal places, that the person has the condition?",
          unit: "people",
          positive: "have the condition",
          negative: "do not",
          flag: "positive",
        },
        {
          setup: `At an email provider, ${percent(base)} of incoming messages are phishing attempts. A filter blocks ${percent(hit)} of phishing messages and ${percent(falseAlarm)} of genuine messages.`,
          ask: "If a message is blocked, what is the probability, rounded to three decimal places, that it is a phishing attempt?",
          unit: "messages",
          positive: "are phishing attempts",
          negative: "are genuine",
          flag: "blocked",
        },
      ]);
      return {
        stem: `${context.setup} ${context.ask}`,
        answer: dec(answer, 3),
        distractors: [
          wrongDec(hit, 3, "That is the probability of the result given the underlying status. The question asks for the reverse."),
          wrongDec(base * hit, 3, "That is the probability of both happening, out of all cases rather than out of the cases with that result."),
          wrongDec(1 - falseAlarm, 3, "That is the probability that a case in the second group is correctly cleared."),
          wrongDec(base, 3, "That is the base rate before any evidence. The result has to update it."),
          ...slipsDec(answer, 3, 0.05),
        ],
        steps: [
          step(
            `Imagine 10,000 ${context.unit}`,
            `${positives} ${context.positive} and ${population - positives} ${context.negative}.`,
          ),
          step(
            "Count each kind of signal",
            `${truePositives} of the first group are ${context.flag}, and so are ${falsePositives} of the second group.`,
          ),
          step(
            "Divide the first count by the total",
            `$\\dfrac{${truePositives}}{${truePositives} + ${falsePositives}} \\approx ${fixedTex(answer, 3)}$.`,
          ),
        ],
        hint: "Count outcomes in an imagined population of 10,000, then look only at the cases with the given result.",
        tolerance: 0.0006,
        audit: {
          kind: "value",
          expression: `${base}*${hit}/(${base}*${hit} + (1 - ${base})*${falseAlarm})`,
        },
        insight: "This is Bayes' theorem. A rare event stays fairly unlikely even after an accurate test flags it, which is why fraud models are tuned on their false-alarm rate.",
      };
    },
  },
  {
    id: "expected-value",
    skillId: "stats-random-variables",
    title: "Expected value of a discrete random variable",
    levels: [1, 2],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      if (level === 1) {
        const start = rng.int(0, 2);
        const values = [start, start + 1, start + 2, start + 3];
        const cuts = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3).sort((x, y) => x - y);
        const tenths = [cuts[0], cuts[1] - cuts[0], cuts[2] - cuts[1], 10 - cuts[2]];
        const expected = tidy(values.reduce((total, value, index) => total + (value * tenths[index]) / 10, 0));
        const mode = values[tenths.indexOf(Math.max(...tenths))];
        const table: TableSpec = {
          headers: ["$x$", ...values.map((value) => `$${value}$`)],
          rows: [["$P(X = x)$", ...tenths.map((tenth) => `$${numTex(tenth / 10)}$`)]],
        };
        return {
          stem: "The table gives the probability distribution of a discrete random variable $X$. What is the expected value of $X$?",
          table,
          answer: opt(expected),
          distractors: [
            wrong(tidy((values[0] + values[3]) / 2), "The values were averaged without weighting them by their probabilities."),
            wrong(mode, "That is the most likely value, not the expected value."),
            ...slips(expected, 0.1),
          ],
          steps: [
            step("Multiply each value by its probability", `$${values.map((value, index) => `(${value})(${numTex(tenths[index] / 10)})`).join(" + ")}$.`),
            step("Add the products", `$E(X) = ${numTex(expected)}$.`),
          ],
          hint: "Weight each value by its probability and add.",
          audit: {
            kind: "value",
            expression: values.map((value, index) => `${value}*${tenths[index] / 10}`).join(" + "),
          },
        };
      }
      const pSmall = rng.pick([0.05, 0.08, 0.1]);
      const pLarge = rng.pick([0.01, 0.02]);
      const small = rng.pick([500, 1000, 2000]);
      const large = rng.pick([5000, 10000, 20000]);
      const expected = tidy(pSmall * small + pLarge * large);
      const premium = Math.ceil(expected / 50) * 50 + rng.pick([50, 100]);
      const profit = tidy(premium - expected);
      return {
        stem: `An insurer sells a one-year policy for a premium of ${money(premium)}. In a year, a policyholder makes no claim with probability ${numTex(1 - pSmall - pLarge)}, a claim of ${money(small)} with probability ${numTex(pSmall)}, and a claim of ${money(large)} with probability ${numTex(pLarge)}. What is the insurer's expected profit, in dollars, on one policy?`,
        answer: opt(profit),
        distractors: [
          wrong(expected, "That is the expected claim payment. The profit is the premium minus that amount."),
          wrong(premium, "The expected claim payment was not subtracted."),
          wrong(tidy(premium - pSmall * small), "The larger claim was left out of the expected payment."),
          ...slips(profit, 10),
        ],
        steps: [
          step(
            "Find the expected claim payment",
            `$(${numTex(pSmall)})(${numTex(small)}) + (${numTex(pLarge)})(${numTex(large)}) = ${numTex(pSmall * small)} + ${numTex(pLarge * large)} = ${numTex(expected)}$.`,
          ),
          step("Subtract it from the premium", `$${numTex(premium)} - ${numTex(expected)} = ${numTex(profit)}$.`),
        ],
        hint: "Expected profit is the premium minus the expected claim payment.",
        audit: { kind: "value", expression: `${premium} - (${pSmall}*${small} + ${pLarge}*${large})` },
        insight: "Premium minus expected claims is the most basic pricing identity in insurance; everything else in ratemaking refines it.",
      };
    },
  },
  {
    id: "binomial-probability",
    skillId: "stats-random-variables",
    title: "Binomial probabilities",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }): Draft {
      const n = rng.int(3, 6);
      const p = rng.pick([0.2, 0.25, 0.3, 0.4, 0.5, 0.6]);
      const q = 1 - p;
      if (rng.bool()) {
        const k = rng.int(1, n - 1);
        const ways = choose(n, k);
        const answer = ways * p ** k * q ** (n - k);
        return {
          stem: `A basketball player makes each free throw with probability ${numTex(p)}, independently of the others. In ${n} free throws, what is the probability, rounded to three decimal places, that the player makes exactly ${k}?`,
          answer: dec(answer, 3),
          distractors: [
            wrongDec(p ** k * q ** (n - k), 3, `The number of ways to arrange ${k} ${k === 1 ? "success" : "successes"} among ${n} attempts, $\\binom{${n}}{${k}} = ${ways}$, was left out.`),
            wrongDec(Math.min(0.999, ways * p ** k), 3, "The probability of the missed attempts was left out."),
            wrongDec(p ** k, 3, "Only the successes were counted, with no arrangements and no misses."),
            ...slipsDec(answer, 3, 0.05),
          ],
          steps: [
            step("Count the arrangements", `$\\binom{${n}}{${k}} = ${ways}$.`),
            step("Find the probability of one arrangement", `$(${numTex(p)})^{${k}}(${numTex(q)})^{${n - k}} \\approx ${fixedTex(p ** k * q ** (n - k), 4)}$.`),
            step("Multiply", `$${ways} \\times ${fixedTex(p ** k * q ** (n - k), 4)} \\approx ${fixedTex(answer, 3)}$.`),
          ],
          hint: "Use the binomial formula: arrangements × probability of the successes × probability of the failures.",
          tolerance: 0.0006,
          audit: {
            kind: "value",
            expression: `gamma(${n} + 1)/(gamma(${k} + 1)*gamma(${n} - ${k} + 1))*${p}^${k}*(1 - ${p})^(${n} - ${k})`,
          },
        };
      }
      const answer = 1 - q ** n;
      return {
        stem: `Each of ${n} independent insurance policies has probability ${numTex(p)} of producing a claim this year. What is the probability, rounded to three decimal places, that at least one of the policies produces a claim?`,
        answer: dec(answer, 3),
        distractors: [
          wrongDec(q ** n, 3, "That is the probability of no claims. Subtract it from 1."),
          wrongDec(1 - p ** n, 3, `The complement of "at least one" is "none", which has probability $(${numTex(q)})^{${n}}$.`),
          wrongDec(p, 3, "That is the probability for a single policy."),
          ...slipsDec(answer, 3, 0.05),
        ],
        steps: [
          step("Use the complement", "At least one claim is the opposite of no claims at all."),
          step("Find the probability of no claims", `$(${numTex(q)})^{${n}} \\approx ${fixedTex(q ** n, 4)}$.`),
          step("Subtract from 1", `$1 - ${fixedTex(q ** n, 4)} \\approx ${fixedTex(answer, 3)}$.`),
        ],
        hint: "“At least one” is easiest through its complement, “none”.",
        tolerance: 0.0006,
        audit: { kind: "value", expression: `1 - (1 - ${p})^${n}` },
      };
    },
  },
  {
    id: "combine-rv",
    skillId: "stats-random-variables",
    title: "Combine independent random variables",
    levels: [2, 3],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      const [sa, sb, sc] = rng.pick([
        [3, 4, 5],
        [6, 8, 10],
        [5, 12, 13],
        [8, 15, 17],
        [9, 12, 15],
      ]);
      const ma = rng.int(25, 60);
      const mb = rng.int(10, ma - 6);
      const difference = rng.bool();
      const setup = `$X$ and $Y$ are independent random variables. $X$ has mean ${ma} and standard deviation ${sa}, and $Y$ has mean ${mb} and standard deviation ${sb}.`;
      if (level === 3) {
        const distractors: Distractor[] = [
          wrong(sa + sb, "Standard deviations do not add. Variances do."),
          wrong(sa * sa + sb * sb, "That is the variance. Take the square root."),
        ];
        if (difference) {
          distractors.push(wrong(Math.abs(sa - sb), "Even for a difference, the variances are added, never subtracted."));
        }
        distractors.push(
          wrong(Math.sqrt(Math.abs(sa * sa - sb * sb)), "The variances were subtracted. Independent variation always accumulates.", rootTex(Math.abs(sa * sa - sb * sb))),
          ...slips(sc),
        );
        return {
          stem: `${setup} What is the standard deviation of $X ${difference ? "-" : "+"} Y$?`,
          answer: opt(sc),
          distractors,
          steps: [
            step("Add the variances", `$${sa}^2 + ${sb}^2 = ${sa * sa} + ${sb * sb} = ${sc * sc}$. This holds for a sum and for a difference.`),
            step("Take the square root", `$\\sqrt{${sc * sc}} = ${sc}$.`),
          ],
          hint: "For independent variables, variances add, whether you add or subtract the variables.",
          audit: { kind: "value", expression: `sqrt(${sa}^2 + ${sb}^2)` },
          insight: "Because the variances of independent risks add, the standard deviation of a pooled portfolio grows more slowly than the portfolio itself.",
        };
      }
      const a = rng.pick([2, 3]);
      const answer = difference ? a * ma - mb : a * ma + mb;
      return {
        stem: `${setup} What is the mean of $${a}X ${difference ? "-" : "+"} Y$?`,
        answer: opt(answer),
        distractors: [
          wrong(difference ? ma - mb : ma + mb, `The coefficient ${a} was ignored.`),
          wrong(difference ? a * (ma - mb) : a * (ma + mb), `The coefficient ${a} was applied to both variables.`),
          wrong(difference ? a * a * ma - mb : a * a * ma + mb, "Squaring the coefficient applies to variances, not to means."),
          ...slips(answer),
        ],
        steps: [
          step("Use linearity of expectation", `$E(${a}X ${difference ? "-" : "+"} Y) = ${a}E(X) ${difference ? "-" : "+"} E(Y)$.`),
          step("Substitute", `$${a}(${ma}) ${difference ? "-" : "+"} ${mb} = ${answer}$.`),
        ],
        hint: "Means combine exactly as the variables do.",
        audit: { kind: "value", expression: `${a}*${ma} ${difference ? "-" : "+"} ${mb}` },
      };
    },
  },
  {
    id: "empirical-rule",
    skillId: "stats-distributions",
    title: "The empirical rule",
    levels: [1],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const sigma = rng.pick([2, 3, 4, 5, 6, 8, 10]);
      const mu = rng.int(4, 9) * 10 + rng.pick([0, 2, 5]);
      const empirical = rng.pick(EMPIRICAL_CASES);
      const context = rng.pick([
        { intro: "The heights of a species of plant, in centimeters,", noun: "have a height" },
        { intro: "The lifetimes of a brand of battery, in hours,", noun: "have a lifetime" },
        { intro: "The scores on a standardized test", noun: "have a score" },
        { intro: "The weights of packages shipped by a company, in ounces,", noun: "have a weight" },
      ]);
      return {
        stem: `${context.intro} are approximately normally distributed with mean ${mu} and standard deviation ${sigma}. According to the empirical rule (68–95–99.7), approximately what percent of them ${empirical.describe(mu, sigma, context.noun)}?`,
        answer: opt(empirical.answer),
        distractors: empirical.wrong.map(([value, why]) => wrong(value, why)),
        steps: [
          step("Convert the endpoints to standard deviations", `The mean is ${mu} and one standard deviation is ${sigma}, so the endpoints are whole numbers of standard deviations from the mean.`),
          step("Apply the empirical rule", empirical.reason),
        ],
        hint: "About 68% of values lie within one standard deviation of the mean, 95% within two and 99.7% within three.",
        tolerance: 0.05,
      };
    },
  },
  {
    id: "normal-tail",
    skillId: "stats-distributions",
    title: "Normal probabilities from a z-score",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }): Draft {
      const mu = rng.int(40, 90);
      const sigma = rng.pick([4, 8, 10, 12]);
      const z = rng.pick([0.5, 1, 1.25, 1.5, 2]);
      const x = tidy(mu + z * sigma);
      const phi = normalCdf(z);
      const setup = `The time, in minutes, needed to process a claim is normally distributed with mean ${mu} and standard deviation ${sigma}. For a standard normal variable $Z$, $P(Z < ${numTex(z)}) = ${fixedTex(phi, 4)}$.`;
      const standardize = step("Standardize", `$z = \\dfrac{${numTex(x)} - ${mu}}{${sigma}} = ${numTex(z)}$.`);
      if (rng.bool()) {
        const answer = 1 - phi;
        return {
          stem: `${setup} What is the probability that a randomly selected claim takes more than ${numTex(x)} minutes to process?`,
          answer: dec(answer, 4),
          distractors: [
            wrongDec(phi, 4, "That is the probability of taking less than the given time."),
            wrongDec(2 * answer, 4, "Both tails were counted. The question asks about one."),
            wrongDec(phi - 0.5, 4, "That is the probability of falling between the mean and the given time."),
            ...slipsDec(answer, 4, 0.05),
          ],
          steps: [
            standardize,
            step("Use the complement", `$P(Z > ${numTex(z)}) = 1 - ${fixedTex(phi, 4)} = ${fixedTex(answer, 4)}$.`),
          ],
          hint: "Standardize, then subtract the given area from 1 to get the upper tail.",
          tolerance: 0.0006,
          audit: { kind: "value", expression: `1 - normcdf((${x} - ${mu})/${sigma})` },
        };
      }
      const answer = phi - 0.5;
      return {
        stem: `${setup} What is the probability that a randomly selected claim takes between ${mu} and ${numTex(x)} minutes to process?`,
        answer: dec(answer, 4),
        distractors: [
          wrongDec(phi, 4, "That includes everything below the mean as well."),
          wrongDec(1 - phi, 4, "That is the probability of taking longer than the upper value."),
          wrongDec(Math.min(0.9999, 2 * answer), 4, "The matching region below the mean was counted as well."),
          ...slipsDec(answer, 4, 0.05),
        ],
        steps: [
          standardize,
          step("Subtract the area below the mean", `Half of the distribution lies below the mean, so the probability is $${fixedTex(phi, 4)} - 0.5 = ${fixedTex(answer, 4)}$.`),
        ],
        hint: "The area below the mean is exactly 0.5.",
        tolerance: 0.0006,
        audit: { kind: "value", expression: `normcdf((${x} - ${mu})/${sigma}) - 0.5` },
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Sampling distributions                                              */
  /* ------------------------------------------------------------------ */
  {
    id: "se-mean",
    skillId: "stats-sampling-distributions",
    title: "Standard deviation of a sample mean",
    levels: [1, 2],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      if (level === 1) {
        const n = rng.pick([4, 9, 16, 25, 36, 49, 64, 100]);
        const root = Math.sqrt(n);
        const se = root % 2 === 0 ? rng.pick([0.5, 1, 1.5, 2, 3]) : rng.pick([1, 2, 3, 4]);
        const sigma = se * root;
        const mu = rng.int(40, 200);
        return {
          stem: `A population has mean ${mu} and standard deviation ${sigma}. Random samples of size ${n} are taken. What is the standard deviation of the sampling distribution of the sample mean?`,
          answer: opt(se),
          distractors: [
            wrong(tidy(sigma / n, 4), "The standard deviation was divided by $n$ instead of by $\\sqrt{n}$."),
            wrong(sigma, "That is the standard deviation of individual values. Sample means vary less."),
            wrong(sigma * root, "The standard deviation was multiplied by $\\sqrt{n}$ instead of divided by it."),
            ...slips(se, 0.5),
          ],
          steps: [
            step("Write the formula", "$\\sigma_{\\bar{x}} = \\dfrac{\\sigma}{\\sqrt{n}}$."),
            step("Substitute", `$\\dfrac{${sigma}}{\\sqrt{${n}}} = \\dfrac{${sigma}}{${root}} = ${numTex(se)}$.`),
          ],
          hint: "Divide the population standard deviation by the square root of the sample size.",
          audit: { kind: "value", expression: `${sigma}/sqrt(${n})` },
          insight: "This is why an insurer's average claim becomes more predictable as the number of policies grows.",
        };
      }
      const ratio = rng.pick([2, 3, 4, 5, 6, 8, 10]);
      const target = rng.pick([0.5, 1, 1.5, 2, 2.5, 3]);
      const sigma = tidy(target * ratio);
      const n = ratio * ratio;
      return {
        stem: `A population has standard deviation ${numTex(sigma)}. What sample size gives a sampling distribution of the sample mean with standard deviation ${numTex(target)}?`,
        answer: opt(n),
        distractors: [
          wrong(ratio, "The ratio was not squared. Because the standard deviation of the mean is $\\frac{\\sigma}{\\sqrt{n}}$, $n$ is the square of the ratio."),
          wrong(2 * ratio, "The ratio was doubled instead of squared."),
          wrong(tidy(sigma * sigma), "The target standard deviation was not used."),
          ...slips(n),
        ],
        steps: [
          step("Set up the equation", `$\\dfrac{${numTex(sigma)}}{\\sqrt{n}} = ${numTex(target)}$.`),
          step("Solve for the square root", `$\\sqrt{n} = \\dfrac{${numTex(sigma)}}{${numTex(target)}} = ${ratio}$.`),
          step("Square", `$n = ${n}$.`),
        ],
        hint: "Solve σ/√n = target for n; remember to square.",
        audit: { kind: "root", expression: `${sigma}/sqrt(n) - ${target}`, variable: "n" },
      };
    },
  },
  {
    id: "clt-probability",
    skillId: "stats-sampling-distributions",
    title: "Probability for a sample mean",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const n = rng.pick([16, 25, 36, 64, 100]);
      const root = Math.sqrt(n);
      const se = rng.pick([1, 2, 3]);
      const sigma = se * root;
      const z = rng.pick([1, 1.5, 2, 2.5]);
      const mu = rng.int(8, 30) * 10;
      const threshold = tidy(mu + z * se);
      const phi = normalCdf(z);
      const answer = 1 - phi;
      const context = rng.pick([
        { intro: `The weights of apples from an orchard have mean ${mu} grams and standard deviation ${sigma} grams. A random sample of ${n} apples is selected.`, ask: `the sample mean weight is greater than ${numTex(threshold)} grams` },
        { intro: `Individual claim amounts paid by an insurer have mean ${money(mu)} and standard deviation ${money(sigma)}. A random sample of ${n} claims is selected.`, ask: `the sample mean claim amount is greater than ${money(threshold, Number.isInteger(threshold) ? 0 : 2)}` },
      ]);
      return {
        stem: `${context.intro} For a standard normal variable $Z$, $P(Z < ${numTex(z)}) = ${fixedTex(phi, 4)}$. What is the approximate probability that ${context.ask}?`,
        answer: dec(answer, 4),
        distractors: [
          wrongDec(
            1 - normalCdf((z * se) / sigma),
            4,
            `The standard deviation of individual values was used. A mean of ${n} values has standard deviation $\\frac{${sigma}}{\\sqrt{${n}}} = ${se}$.`,
          ),
          wrongDec(phi, 4, "That is the probability that the sample mean is below the value."),
          wrongDec(2 * answer, 4, "Both tails were counted. The question asks about one."),
          ...slipsDec(answer, 4, 0.05),
        ],
        steps: [
          step("Find the standard deviation of the sample mean", `$\\dfrac{${sigma}}{\\sqrt{${n}}} = ${se}$.`),
          step("Standardize", `$z = \\dfrac{${numTex(threshold)} - ${mu}}{${se}} = ${numTex(z)}$.`),
          step("Use the complement", `$P(Z > ${numTex(z)}) = 1 - ${fixedTex(phi, 4)} = ${fixedTex(answer, 4)}$.`),
        ],
        hint: "A sample mean has standard deviation σ/√n; standardize with that, not with σ.",
        tolerance: 0.0006,
        audit: { kind: "value", expression: `1 - normcdf((${threshold} - ${mu})/(${sigma}/sqrt(${n})))` },
        insight: "The central limit theorem is what lets an actuary treat the average of many claims as approximately normal, whatever a single claim looks like.",
      };
    },
  },
  {
    id: "se-proportion",
    skillId: "stats-sampling-distributions",
    title: "Standard deviation of a sample proportion",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const [p, n, se] = rng.pick(PROPORTION_CASES);
      const percent = Math.round(p * 100);
      return {
        stem: `In a large population, ${percent}% of people have a certain characteristic. For random samples of size ${n}, what is the standard deviation of the sampling distribution of the sample proportion?`,
        answer: opt(se),
        distractors: [
          wrong(tidy((p * (1 - p)) / n, 6), "The square root was not taken."),
          wrong(tidy(Math.sqrt(p / n), 4), "The factor $(1 - p)$ was left out."),
          wrong(tidy(Math.sqrt(p * (1 - p)), 4), "The product was not divided by the sample size."),
          ...slips(se, 0.01),
        ],
        steps: [
          step("Write the formula", "$\\sigma_{\\hat{p}} = \\sqrt{\\dfrac{p(1 - p)}{n}}$."),
          step(
            "Substitute",
            `$\\sqrt{\\dfrac{(${numTex(p)})(${numTex(1 - p)})}{${n}}} = \\sqrt{${numTex((p * (1 - p)) / n, 6)}} = ${numTex(se)}$.`,
          ),
        ],
        hint: "Use √(p(1 − p)/n).",
        audit: { kind: "value", expression: `sqrt(${p}*(1 - ${p})/${n})` },
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Inference                                                           */
  /* ------------------------------------------------------------------ */
  {
    id: "ci-margin",
    skillId: "stats-confidence-intervals",
    title: "Margin of error for a proportion",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const [p, n, se] = rng.pick(PROPORTION_CASES);
      const [level, z] = rng.pick(CRITICAL_VALUES);
      const margin = z * se;
      return {
        stem: `In a random sample of ${n} adults, the sample proportion who favor a proposal is $\\hat{p} = ${numTex(p)}$. Using $z^* = ${numTex(z)}$, what is the margin of error of a ${level}% confidence interval for the population proportion, rounded to three decimal places?`,
        answer: dec(margin, 3),
        distractors: [
          wrongDec(se, 3, "That is the standard error. It still has to be multiplied by the critical value."),
          wrongDec(2 * margin, 3, "That is the full width of the interval. The margin of error is half of it."),
          wrongDec(z * Math.sqrt(p / n), 3, "The factor $(1 - \\hat{p})$ was left out of the standard error."),
          ...slipsDec(margin, 3, 0.02),
        ],
        steps: [
          step("Find the standard error", `$\\sqrt{\\dfrac{(${numTex(p)})(${numTex(1 - p)})}{${n}}} = ${numTex(se)}$.`),
          step("Multiply by the critical value", `$${numTex(z)} \\times ${numTex(se)} \\approx ${fixedTex(margin, 3)}$.`),
        ],
        hint: "Margin of error = critical value × standard error.",
        tolerance: 0.0006,
        audit: { kind: "value", expression: `${z}*sqrt(${p}*(1 - ${p})/${n})` },
      };
    },
  },
  {
    id: "sample-size",
    skillId: "stats-confidence-intervals",
    title: "Sample size for a margin of error",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const [level, z] = rng.pick(CRITICAL_VALUES);
      const margin = rng.pick([0.02, 0.025, 0.03, 0.04, 0.05, 0.08, 0.1]);
      const raw = tidy((z / (2 * margin)) ** 2, 6);
      const n = Math.ceil(raw);
      return {
        stem: `A polling organization wants to estimate a population proportion to within ${numTex(margin)} with ${level}% confidence. Using $z^* = ${numTex(z)}$ and the conservative value $\\hat{p} = 0.5$, what is the minimum sample size required?`,
        answer: opt(n),
        distractors: [
          wrong(Math.floor(raw), "The result was rounded down. A sample size is always rounded up so the margin of error is not exceeded."),
          wrong(Math.ceil(tidy((z / margin) ** 2, 6)), "The factor $\\hat{p}(1 - \\hat{p}) = 0.25$ was left out."),
          wrong(Math.ceil(tidy(z / (2 * margin), 6)), "The ratio was not squared."),
          ...slips(n, 10),
        ],
        steps: [
          step("Start from the margin of error", `$${numTex(z)}\\sqrt{\\dfrac{(0.5)(0.5)}{n}} \\le ${numTex(margin)}$.`),
          step("Solve for n", `$n \\ge \\left(\\dfrac{${numTex(z)}}{2(${numTex(margin)})}\\right)^2 = ${numTex(raw, 2)}$.`),
          step("Round up", `The smallest whole number that works is $${numTex(n)}$.`),
        ],
        hint: "Solve the margin-of-error inequality for n, then round up.",
        audit: { kind: "value", expression: `ceil(round((${z}/(2*${margin}))^2*1000000)/1000000)` },
      };
    },
  },
  {
    id: "ci-interpret",
    skillId: "stats-confidence-intervals",
    title: "Interpret a confidence interval",
    levels: [2],
    formats: ["choice"],
    build({ rng }) {
      const level = rng.pick([90, 95, 99]);
      const context = rng.pick([
        { quantity: "mean commute time, in minutes, of all employees at a large company", group: "employees at the company", measure: "commute times", low: rng.int(24, 34), width: rng.int(4, 9) },
        { quantity: "mean annual claim amount, in dollars, of all policyholders of an insurer", group: "policyholders", measure: "annual claim amounts", low: rng.int(11, 19) * 100, width: rng.int(2, 6) * 100 },
        { quantity: "mean weekly study time, in hours, of all students at a university", group: "students at the university", measure: "weekly study times", low: rng.int(9, 15), width: rng.int(2, 5) },
        { quantity: "mean battery life, in hours, of all phones of a certain model", group: "phones of that model", measure: "battery lives", low: rng.int(16, 22), width: rng.int(2, 4) },
      ]);
      const low = context.low;
      const high = context.low + context.width;
      return {
        stem: `Based on a random sample, a ${level}% confidence interval for the ${context.quantity} is $(${low}, ${high})$. Which of the following is a correct interpretation of this interval?`,
        answer: optText(`We are ${level}% confident that the ${context.quantity} is between ${low} and ${high}.`),
        distractors: [
          wrongText(
            `${level}% of all ${context.group} have ${context.measure} between ${low} and ${high}.`,
            "The interval estimates a population mean. It does not describe where individual values fall.",
          ),
          wrongText(
            `There is a ${level}% probability that the sample mean is between ${low} and ${high}.`,
            "The sample mean is the center of the interval, so it is certainly inside it. The uncertainty is about the population mean.",
          ),
          wrongText(
            `If the study were repeated, ${level}% of the new sample means would fall between ${low} and ${high}.`,
            "The confidence level describes how often intervals built this way capture the population mean, not where other sample means fall.",
          ),
        ],
        steps: [
          step("Identify what is being estimated", "A confidence interval is a range of plausible values for a population parameter, here the population mean."),
          step("State the confidence correctly", `The method captures the true mean in ${level}% of random samples, so we are ${level}% confident that this interval contains it.`),
        ],
        hint: "A confidence interval is a statement about a population parameter, not about individuals or about the sample.",
      };
    },
  },
  {
    id: "z-test-proportion",
    skillId: "stats-significance-tests",
    title: "Test statistic for a proportion",
    levels: [3],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const [p0, n, se] = rng.pick(PROPORTION_CASES);
      const z = rng.pick([-2.5, -2, -1.5, 1.5, 2, 2.5, 3]);
      const sample = tidy(p0 + z * se, 4);
      const percent = Math.round(p0 * 100);
      return {
        stem: `A company claims that ${percent}% of its customers renew their policies. To test $H_0: p = ${numTex(p0)}$ against $H_a: p \\ne ${numTex(p0)}$, a random sample of ${n} customers is taken, and the sample proportion who renew is $\\hat{p} = ${numTex(sample)}$. What is the value of the test statistic $z$?`,
        answer: opt(z),
        distractors: [
          wrong(
            tidy((sample - p0) / Math.sqrt((sample * (1 - sample)) / n), 2),
            "The standard error was computed from $\\hat{p}$. A significance test uses the hypothesized value $p_0$.",
          ),
          wrong(-z, "The hypothesized value and the sample proportion were subtracted in the wrong order."),
          wrong(tidy(sample - p0, 4), "The difference was not divided by the standard error."),
          ...slips(z, 0.5),
        ],
        steps: [
          step("Find the standard error under the null hypothesis", `$\\sqrt{\\dfrac{(${numTex(p0)})(${numTex(1 - p0)})}{${n}}} = ${numTex(se)}$.`),
          step("Standardize the sample proportion", `$z = \\dfrac{${numTex(sample)} - ${numTex(p0)}}{${numTex(se)}} = ${numTex(z)}$.`),
        ],
        hint: "z = (sample proportion − hypothesized proportion) ÷ standard error, with the standard error computed from the hypothesized value.",
        audit: { kind: "value", expression: `(${sample} - ${p0})/sqrt(${p0}*(1 - ${p0})/${n})` },
      };
    },
  },
  {
    id: "p-value-conclusion",
    skillId: "stats-significance-tests",
    title: "Draw a conclusion from a p-value",
    levels: [2],
    formats: ["choice"],
    build({ rng }) {
      const alpha = rng.pick([0.01, 0.05, 0.1]);
      const reject = rng.bool();
      const pValue = reject
        ? tidy(alpha * rng.pick([0.1, 0.2, 0.4, 0.6]), 4)
        : tidy(alpha + rng.pick([0.01, 0.03, 0.07, 0.12, 0.2]), 4);
      const context = rng.pick([
        { nullClaim: "the mean battery life of a phone model is 20 hours", alternative: "the mean battery life is less than 20 hours" },
        { nullClaim: "the proportion of customers who renew a policy is 0.80", alternative: "the proportion who renew is greater than 0.80" },
        { nullClaim: "the mean waiting time at a clinic is 30 minutes", alternative: "the mean waiting time is greater than 30 minutes" },
        { nullClaim: "the mean amount of a claim is the same under two repair programs", alternative: "the mean amount of a claim differs between the two programs" },
      ]);
      const rejectText = `Reject the null hypothesis. There is convincing evidence that ${context.alternative}.`;
      const failText = `Fail to reject the null hypothesis. There is not convincing evidence that ${context.alternative}.`;
      const comparison = reject
        ? `The $p$-value, ${numTex(pValue)}, is less than $\\alpha = ${numTex(alpha)}$, so the result is statistically significant.`
        : `The $p$-value, ${numTex(pValue)}, is greater than $\\alpha = ${numTex(alpha)}$, so the result is not statistically significant.`;
      return {
        stem: `A study tests the null hypothesis that ${context.nullClaim} against the alternative that ${context.alternative}. The test gives a $p$-value of ${numTex(pValue)}. At the significance level $\\alpha = ${numTex(alpha)}$, which conclusion is appropriate?`,
        answer: optText(reject ? rejectText : failText),
        distractors: [
          wrongText(reject ? failText : rejectText, comparison),
          wrongText(
            `Accept the null hypothesis. The data prove that ${context.nullClaim}.`,
            reject
              ? "With a $p$-value below $\\alpha$ the null hypothesis is rejected, and no test can prove a hypothesis true."
              : "Failing to reject is not proof. The data are merely consistent with the null hypothesis.",
          ),
          wrongText(
            `The probability that the null hypothesis is true is ${numTex(pValue)}.`,
            "A $p$-value is computed assuming the null hypothesis is true. It is not the probability that the null hypothesis is true.",
          ),
        ],
        steps: [
          step("Compare the p-value with the significance level", comparison),
          step(
            "State the decision in context",
            reject
              ? `Reject the null hypothesis: the data give convincing evidence that ${context.alternative}.`
              : `Fail to reject the null hypothesis: the data do not give convincing evidence that ${context.alternative}.`,
          ),
        ],
        hint: "Reject the null hypothesis exactly when the p-value is smaller than α.",
      };
    },
  },
  {
    id: "chi-square-expected",
    skillId: "stats-significance-tests",
    title: "Expected counts for a chi-square test",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const total = rng.pick([100, 200]);
      const rowTotal = Math.round(total * rng.pick([0.4, 0.5, 0.6]));
      const columnTotal = Math.round(total * rng.pick([0.25, 0.3, 0.5, 0.7]));
      const expected = tidy((rowTotal * columnTotal) / total);
      const lowest = Math.max(0, rowTotal + columnTotal - total) + 3;
      const highest = Math.min(rowTotal, columnTotal) - 3;
      const a = intExcept(rng, lowest, highest, [expected]);
      const table: TableSpec = {
        headers: ["", "Renewed", "Did not renew", "Total"],
        rows: [
          ["Plan A", String(a), String(rowTotal - a), String(rowTotal)],
          ["Plan B", String(columnTotal - a), String(total - rowTotal - columnTotal + a), String(total - rowTotal)],
          ["Total", String(columnTotal), String(total - columnTotal), String(total)],
        ],
      };
      return {
        stem: `The table shows a random sample of ${total} policyholders, classified by plan and by whether they renewed. In a chi-square test of independence, what is the expected count for policyholders with Plan A who renewed?`,
        table,
        answer: opt(expected),
        distractors: [
          wrong(a, "That is the observed count. The expected count is what independence would predict."),
          wrong(total / 4, "Equal counts in every cell would be expected only if all the row and column totals were equal."),
          wrong(rowTotal / 2, "The row total was split evenly, ignoring the column totals."),
          ...slips(expected, 5),
        ],
        steps: [
          step("Write the formula", "$\\text{expected} = \\dfrac{\\text{row total} \\times \\text{column total}}{\\text{grand total}}$."),
          step("Substitute", `$\\dfrac{${rowTotal} \\times ${columnTotal}}{${total}} = ${numTex(expected)}$.`),
        ],
        hint: "Expected count = row total × column total ÷ grand total.",
        audit: { kind: "value", expression: `${rowTotal}*${columnTotal}/${total}` },
      };
    },
  },
];
