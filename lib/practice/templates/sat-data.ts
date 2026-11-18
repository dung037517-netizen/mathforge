/**
 * SAT Math — Problem-Solving and Data Analysis.
 *
 * Ratios and percents, summaries of data, probability from tables, and what
 * a sample does and does not let you conclude.
 */

import { listText, money, numTex, numText, tidy } from "@/lib/practice/format";
import {
  fracStepTex,
  intExcept,
  opt,
  optFrac,
  optText,
  pickName,
  slips,
  slipsFrac,
  step,
  wrong,
  wrongFrac,
  wrongText,
} from "@/lib/practice/templates/helpers";
import type { Distractor, Template } from "@/types/practice";

const COUNT_WORDS: Readonly<Record<number, string>> = {
  3: "Three",
  4: "Four",
  5: "Five",
};

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export const SAT_DATA_TEMPLATES: readonly Template[] = [
  /* ------------------------------------------------------------------ */
  /* Ratios, rates and percents                                          */
  /* ------------------------------------------------------------------ */
  {
    id: "percent-change",
    skillId: "sat-ratios-percents",
    title: "Find a percent change",
    levels: [1],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const increase = rng.bool();
      const percent = rng.pick([10, 15, 20, 25, 30, 40, 50, 60, 75]);
      const before = rng.pick([20, 40, 60, 80, 120, 160, 200, 240, 400]);
      const change = (before * percent) / 100;
      const after = increase ? before + change : before - change;
      const item = rng.pick(["jacket", "backpack", "calculator", "concert ticket", "pair of shoes", "textbook"]);
      return {
        stem: `The price of a ${item} ${increase ? "increased" : "decreased"} from ${money(before)} to ${money(after)}. The ${increase ? "increase" : "decrease"} is $p\\%$ of the original price. What is the value of $p$?`,
        answer: opt(percent),
        distractors: [
          wrong(
            tidy((change / after) * 100, 1),
            "The change was divided by the new price instead of the original price.",
          ),
          wrong(change, "That is the change in dollars, not as a percent of the original price."),
          wrong(
            tidy((after / before) * 100, 1),
            "That is the new price as a percent of the original price, not the percent change.",
          ),
          ...slips(percent, 5),
        ],
        steps: [
          step("Find the change", `The price changed by ${money(change)}.`),
          step(
            "Compare it with the original price",
            `$\\dfrac{${change}}{${before}} = ${numTex(change / before)}$, which is $${percent}\\%$.`,
          ),
        ],
        hint: "Percent change is the amount of change divided by the original amount.",
        audit: { kind: "value", expression: `abs(${after} - ${before})/${before}*100` },
      };
    },
  },
  {
    id: "successive-percent",
    skillId: "sat-ratios-percents",
    title: "Combine two percent changes",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const up = rng.pick([10, 20, 25, 40, 50]);
      const down = rng.pick([10, 20, 25, 40, 50]);
      const upFirst = rng.bool();
      const result = tidy(((100 + up) * (100 - down)) / 100, 4);
      const story = upFirst
        ? `increased by ${up}% and then decreased by ${down}%`
        : `decreased by ${down}% and then increased by ${up}%`;
      return {
        stem: `The price of an item is ${story}. The final price is $p\\%$ of the original price. What is the value of $p$?`,
        answer: opt(result),
        distractors: [
          wrong(
            100 + up - down,
            "The two percents were combined by adding and subtracting. The second change applies to the price after the first change, not to the original price.",
          ),
          wrong(
            tidy(((100 - up) * (100 + down)) / 100, 4),
            "The increase and the decrease were applied with each other's percents.",
          ),
          wrong(tidy(100 - (up * down) / 100, 4), "Only the interaction between the two changes was subtracted."),
          ...slips(result, 5),
        ],
        steps: [
          step(
            "Write each change as a factor",
            `An increase of ${up}% multiplies by $${numTex(1 + up / 100)}$; a decrease of ${down}% multiplies by $${numTex(1 - down / 100)}$.`,
          ),
          step(
            "Multiply the factors",
            `$${numTex(1 + up / 100)} \\times ${numTex(1 - down / 100)} = ${numTex(result / 100)}$, so the final price is $${numTex(result)}\\%$ of the original.`,
          ),
        ],
        hint: "Percent changes multiply; they do not add.",
        audit: { kind: "value", expression: `(100 + ${up})*(100 - ${down})/100` },
      };
    },
  },
  {
    id: "proportion",
    skillId: "sat-ratios-percents",
    title: "Use a unit rate",
    levels: [1],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const rate = rng.int(3, 24);
      const b = rng.int(2, 6);
      const a = rate * b;
      const c = intExcept(rng, 7, 20, [b, 2 * b]);
      const answer = rate * c;
      const name = pickName(rng);
      const contexts = [
        `A printer prints ${a} pages in ${b} minutes. At this rate, how many pages does it print in ${c} minutes?`,
        `A car travels ${a} miles on ${b} gallons of fuel. At this rate, how many miles can it travel on ${c} gallons?`,
        `A machine fills ${a} bottles in ${b} minutes. At this rate, how many bottles does it fill in ${c} minutes?`,
        `${name} earns ${money(a)} for ${b} hours of work. At this rate, how many dollars does ${name} earn for ${c} hours of work?`,
      ];
      return {
        stem: rng.pick(contexts),
        answer: opt(answer),
        distractors: [
          wrong(
            a + (c - b),
            "The difference was added. A constant rate means the quantities scale by multiplication, not addition.",
          ),
          wrong(a * c, "The first quantity was multiplied without first dividing to find the unit rate."),
          wrong(rate, "That is the unit rate: the amount for a single unit."),
          ...slips(answer, rate),
        ],
        steps: [
          step("Find the unit rate", `$${a} \\div ${b} = ${rate}$ per unit.`),
          step("Scale to the new amount", `$${rate} \\times ${c} = ${numTex(answer)}$.`),
        ],
        hint: "Find the amount for one unit first.",
        audit: { kind: "value", expression: `${a}/${b}*${c}` },
      };
    },
  },
  {
    id: "ratio-partition",
    skillId: "sat-ratios-percents",
    title: "Split a total in a given ratio",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const pair = rng.pick([
        [1, 2],
        [1, 3],
        [2, 3],
        [3, 4],
        [2, 5],
        [3, 5],
        [4, 5],
        [1, 4],
        [5, 6],
        [3, 7],
      ]);
      const [p, q] = rng.bool() ? [pair[0], pair[1]] : [pair[1], pair[0]];
      const unit = rng.int(3, 12);
      const total = (p + q) * unit;
      const answer = p * unit;
      const contexts = [
        `In a school club, the ratio of juniors to seniors is ${p} to ${q}. The club has ${total} members, all of whom are juniors or seniors. How many juniors are in the club?`,
        `A paint mixture is made of blue paint and white paint in the ratio ${p} to ${q} by volume. How many liters of blue paint are in ${total} liters of the mixture?`,
        `A trail mix contains only nuts and raisins, in the ratio ${p} to ${q} by weight. How many grams of nuts are in a ${total}-gram bag?`,
      ];
      const distractors: Distractor[] = [
        wrong(q * unit, "That is the other part of the ratio."),
        wrong(unit, `That is the size of one share; the quantity asked for is ${p} shares.`),
      ];
      if ((total * p) % q === 0) {
        distractors.push(
          wrong(
            (total * p) / q,
            `The ratio was treated as the fraction $\\frac{${p}}{${q}}$ of the total. The first part is $\\frac{${p}}{${p + q}}$ of the total.`,
          ),
        );
      }
      distractors.push(...slips(answer, unit));
      return {
        stem: rng.pick(contexts),
        answer: opt(answer),
        distractors,
        steps: [
          step("Count the shares", `The ratio ${p} to ${q} splits the total into $${p} + ${q} = ${p + q}$ equal shares.`),
          step("Find one share", `$${total} \\div ${p + q} = ${unit}$.`),
          step("Take the shares asked for", `$${p} \\times ${unit} = ${answer}$.`),
        ],
        hint: "A ratio of p to q means p + q equal shares in total.",
        audit: { kind: "value", expression: `${p}/(${p} + ${q})*${total}` },
      };
    },
  },
  {
    id: "percent-reverse",
    skillId: "sat-ratios-percents",
    title: "Recover the original amount",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const discount = rng.pick([10, 20, 25, 30, 40, 50]);
      const original = rng.pick([40, 60, 80, 120, 160, 200, 240]);
      const sale = (original * (100 - discount)) / 100;
      const item = rng.pick(["jacket", "backpack", "pair of headphones", "desk lamp", "pair of shoes"]);
      return {
        stem: `During a sale, the price of a ${item} is reduced by ${discount}%. The sale price is ${money(sale)}. What was the original price, in dollars?`,
        answer: opt(original),
        distractors: [
          wrong(
            tidy((sale * (100 + discount)) / 100, 2),
            "The percent was added back to the sale price. The discount was a percent of the original price, not of the sale price.",
          ),
          wrong(sale + discount, "The percent was added as though it were a number of dollars."),
          wrong(tidy((sale * (100 - discount)) / 100, 2), "The discount was applied a second time."),
          ...slips(original, 10),
        ],
        steps: [
          step(
            "Write the sale price in terms of the original",
            `A ${discount}% reduction leaves ${100 - discount}% of the original price $x$: $${numTex(1 - discount / 100)}x = ${sale}$.`,
          ),
          step("Solve", `$x = ${sale} \\div ${numTex(1 - discount / 100)} = ${original}$.`),
        ],
        hint: "The sale price is a percent of the original price. Divide; do not add the percent back.",
        audit: { kind: "root", expression: `x*(1 - ${discount}/100) - ${sale}`, variable: "x" },
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Summaries of data                                                   */
  /* ------------------------------------------------------------------ */
  {
    id: "mean-missing",
    skillId: "sat-data-summaries",
    title: "Work backwards from a mean",
    levels: [1, 2],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      if (level === 1) {
        const n = rng.int(4, 6);
        const mean = rng.int(40, 80);
        const known = Array.from({ length: n - 1 }, () => mean + rng.int(-6, 6));
        const missing = n * mean - sum(known);
        return {
          stem: `The mean of ${n} numbers is ${mean}. ${COUNT_WORDS[n - 1]} of the numbers are ${listText(known.map(String))}. What is the remaining number?`,
          answer: opt(missing),
          distractors: [
            wrong(mean, "That is the mean, which does not have to be one of the numbers."),
            wrong(n * mean, "That is the sum of all the numbers; the known values still have to be subtracted."),
            wrong(tidy(sum(known) / (n - 1), 2), "That is the mean of the known numbers only."),
            ...slips(missing),
          ],
          steps: [
            step("Find the total", `A mean of ${mean} for ${n} numbers means they add to $${n} \\times ${mean} = ${n * mean}$.`),
            step("Add the known numbers", `$${known.join(" + ")} = ${sum(known)}$.`),
            step("Subtract", `$${n * mean} - ${sum(known)} = ${missing}$.`),
          ],
          hint: "Mean × count gives the total.",
          audit: { kind: "value", expression: `${n}*${mean} - (${known.join(" + ")})` },
        };
      }
      const n = rng.int(3, 5);
      const mean = rng.int(70, 80);
      const delta = rng.pick([-3, -2, -1, 1, 2, 3]);
      const newMean = mean + delta;
      const score = (n + 1) * newMean - n * mean;
      const name = pickName(rng);
      return {
        stem: `After ${n} tests, ${name}'s mean score is ${mean}. After one more test, the mean score is ${newMean}. What was ${name}'s score on the last test?`,
        answer: opt(score),
        distractors: [
          wrong(newMean, "That is the new mean, not the score that produced it."),
          wrong(
            2 * newMean - mean,
            `The new mean was treated as the average of the old mean and the new score, ignoring that the old mean stands for ${n} tests.`,
          ),
          wrong(mean + delta * n, "The new total was computed with one test too few."),
          ...slips(score),
        ],
        steps: [
          step("Find the old total", `$${n} \\times ${mean} = ${n * mean}$ points.`),
          step("Find the new total", `$${n + 1} \\times ${newMean} = ${(n + 1) * newMean}$ points.`),
          step("Subtract", `The last test added $${(n + 1) * newMean} - ${n * mean} = ${score}$ points.`),
        ],
        hint: "Compare the total points before and after the last test.",
        audit: { kind: "value", expression: `(${n} + 1)*${newMean} - ${n}*${mean}` },
      };
    },
  },
  {
    id: "mean-median-outlier",
    skillId: "sat-data-summaries",
    title: "Effect of an extreme value",
    levels: [2],
    formats: ["choice"],
    build({ rng }) {
      const values: number[] = [rng.int(10, 40)];
      for (let index = 1; index < 7; index += 1) values.push(values[index - 1] + rng.int(1, 4));
      const upward = rng.bool();
      const replaced = upward ? values[6] : values[0];
      const replacement = upward ? values[6] + rng.int(30, 60) : values[0] - rng.int(5, 9);
      const context = rng.pick([
        "the number of points a team scored in each of 7 games",
        "the number of books read by each of 7 students",
        "the length, in minutes, of each of 7 commutes",
        "the number of customers a shop served on each of 7 days",
      ]);
      const direction = upward ? "increases" : "decreases";
      const shift = tidy(Math.abs(replacement - replaced) / 7, 2);
      return {
        stem: `The list shows ${context}.\n\n$$${values.join(",\\ ")}$$\n\nIf the value $${replaced}$ is replaced by $${replacement}$, which statement about the mean and the median of the data is true?`,
        answer: optText(`The mean ${direction} and the median stays the same.`),
        distractors: [
          wrongText(
            `The mean and the median both ${upward ? "increase" : "decrease"}.`,
            `The median is the middle value, and the middle value is unchanged when only the ${upward ? "largest" : "smallest"} value changes.`,
          ),
          wrongText(
            `The median ${direction} and the mean stays the same.`,
            "The mean uses every value, so changing any value changes it. The median depends only on the middle of the ordered list.",
          ),
          wrongText(
            "Neither the mean nor the median changes.",
            "The sum of the values changes, so the mean must change.",
          ),
        ],
        steps: [
          step(
            "Check the median",
            `With 7 values, the median is the 4th value in order, $${values[3]}$. Replacing the ${upward ? "largest" : "smallest"} value does not move it.`,
          ),
          step(
            "Check the mean",
            `The sum changes by $${Math.abs(replacement - replaced)}$, so the mean ${direction} by $${Math.abs(replacement - replaced)} \\div 7 \\approx ${numTex(shift, 2)}$.`,
          ),
        ],
        hint: "The median resists extreme values; the mean does not.",
        insight:
          "This is why claim-size data, which has a few very large losses, is summarized with medians and percentiles as well as means.",
      };
    },
  },
  {
    id: "weighted-mean",
    skillId: "sat-data-summaries",
    title: "Combine two group means",
    levels: [2],
    formats: ["choice", "numeric"],
    build({ rng }) {
      const [a, b] = rng.pick([
        [1, 2],
        [2, 1],
        [2, 3],
        [3, 2],
        [1, 3],
        [3, 1],
        [3, 4],
        [4, 3],
      ]);
      const group = rng.pick([5, 6, 8, 10]);
      const n1 = group * a;
      const n2 = group * b;
      const spread = rng.pick([-3, -2, -1, 1, 2, 3]);
      const combined = rng.int(68, 84);
      const m1 = combined - b * spread;
      const m2 = combined + a * spread;
      return {
        stem: `Class A has ${n1} students and a mean test score of ${m1}. Class B has ${n2} students and a mean test score of ${m2}. What is the mean test score of the two classes combined?`,
        answer: opt(combined),
        distractors: [
          wrong(tidy((m1 + m2) / 2, 2), "The two means were averaged without weighting each by its class size."),
          wrong(combined + (a - b) * spread, "The class sizes were attached to the wrong means."),
          ...slips(combined),
        ],
        steps: [
          step(
            "Find the total points in each class",
            `$${n1} \\times ${m1} = ${n1 * m1}$ and $${n2} \\times ${m2} = ${n2 * m2}$.`,
          ),
          step(
            "Divide the combined total by the combined count",
            `$\\dfrac{${n1 * m1} + ${n2 * m2}}{${n1} + ${n2}} = \\dfrac{${n1 * m1 + n2 * m2}}{${n1 + n2}} = ${combined}$.`,
          ),
        ],
        hint: "A combined mean is total points over total students, not the average of the two means.",
        audit: { kind: "value", expression: `(${n1}*${m1} + ${n2}*${m2})/(${n1} + ${n2})` },
        insight:
          "Weighting each group's average by its size is how actuaries blend loss experience from groups with different exposure.",
      };
    },
  },
  {
    id: "linear-fit",
    skillId: "sat-data-summaries",
    title: "Use a line of best fit",
    levels: [1, 2],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      const slope = rng.pick([0.5, 1.5, 2, 2.5, 3, 3.5, 4.5]);
      const intercept = rng.int(20, 60);
      const k = rng.pick([2, 4, 6, 8, 10]);
      const predicted = tidy(intercept + slope * k);
      const context = rng.pick([
        {
          setup: "where $x$ is the number of hours a student studied and $y$ is the predicted test score",
          ask: `What test score does the line predict for a student who studied ${k} hours?`,
          actual: (value: number) =>
            `A student who studied ${k} hours scored ${value}. How many points above the predicted score is this?`,
        },
        {
          setup: "where $x$ is the number of days since planting and $y$ is the predicted height of a plant, in millimeters",
          ask: `What height, in millimeters, does the line predict ${k} days after planting?`,
          actual: (value: number) =>
            `A plant measured ${k} days after planting is ${value} millimeters tall. How many millimeters above the predicted height is this?`,
        },
        {
          setup: "where $x$ is the outdoor temperature in degrees Celsius and $y$ is the predicted number of drinks a kiosk sells",
          ask: `How many drinks does the line predict the kiosk sells when the temperature is ${k} degrees Celsius?`,
          actual: (value: number) =>
            `On a day when the temperature was ${k} degrees Celsius, the kiosk sold ${value} drinks. How many drinks above the predicted number is this?`,
        },
      ]);
      const model = `The line of best fit for a set of data is $y = ${intercept} + ${numTex(slope)}x$, ${context.setup}.`;
      if (level === 1) {
        return {
          stem: `${model} ${context.ask}`,
          answer: opt(predicted),
          distractors: [
            wrong(tidy(slope * k), "The constant term of the model was left out."),
            wrong(tidy(intercept + slope), "The slope was not multiplied by the value of $x$."),
            wrong(tidy((intercept + slope) * k), "The constant and the slope were added before multiplying."),
            ...slips(predicted),
          ],
          steps: [
            step("Substitute the value of x", `$y = ${intercept} + ${numTex(slope)}(${k})$.`),
            step("Evaluate", `$y = ${intercept} + ${numTex(slope * k)} = ${numTex(predicted)}$.`),
          ],
          hint: "Substitute the given value for x.",
          audit: { kind: "value", expression: `${intercept} + ${slope}*${k}` },
        };
      }
      const difference = rng.int(2, 9);
      const actual = tidy(predicted + difference);
      return {
        stem: `${model} ${context.actual(actual)}`,
        answer: opt(difference),
        distractors: [
          wrong(tidy(actual - slope * k), "The constant term was left out of the prediction."),
          wrong(predicted, "That is the predicted value itself, not the difference from it."),
          wrong(-difference, "The actual value was subtracted from the prediction, giving the wrong sign."),
          ...slips(difference),
        ],
        steps: [
          step(
            "Find the predicted value",
            `$y = ${intercept} + ${numTex(slope)}(${k}) = ${numTex(predicted)}$.`,
          ),
          step("Compare with the actual value", `$${numTex(actual)} - ${numTex(predicted)} = ${difference}$.`),
        ],
        hint: "Actual minus predicted.",
        audit: { kind: "value", expression: `${actual} - (${intercept} + ${slope}*${k})` },
        insight: "Actual minus predicted is called a residual — the quantity every regression model is built to keep small.",
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Probability                                                         */
  /* ------------------------------------------------------------------ */
  {
    id: "two-way-table",
    skillId: "sat-probability",
    title: "Probability from a two-way table",
    levels: [1, 2],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      const a = rng.int(8, 36);
      const b = intExcept(rng, 8, 36, [a]);
      const c = intExcept(rng, 8, 36, [a, b]);
      const d = intExcept(rng, 8, 36, [a, b, c]);
      const total = a + b + c + d;
      const topic = rng.pick([
        { intro: "the science course chosen by each student in two grades", columns: ["Biology", "Chemistry"], phrase: (name: string) => `chose ${name}` },
        { intro: "how each student in two grades travels to school", columns: ["Bus", "Bicycle"], phrase: (name: string) => `travels by ${name.toLowerCase()}` },
        { intro: "the elective chosen by each student in two grades", columns: ["Music", "Art"], phrase: (name: string) => `chose ${name}` },
      ]);
      const table = {
        headers: ["", topic.columns[0], topic.columns[1], "Total"],
        rows: [
          ["Grade 11", String(a), String(b), String(a + b)],
          ["Grade 12", String(c), String(d), String(c + d)],
          ["Total", String(a + c), String(b + d), String(total)],
        ],
      };
      const intro = `The table shows ${topic.intro}.`;
      const event = topic.phrase(topic.columns[0]);
      if (level === 1) {
        return {
          stem: `${intro} If one of the ${total} students is selected at random, what is the probability that the student is in Grade 11 and ${event}?`,
          table,
          answer: optFrac(a, total),
          distractors: [
            wrongFrac(a, a + b, "The count was divided by the number of Grade 11 students instead of by all students."),
            wrongFrac(a, a + c, `The count was divided by the number of students who ${event} instead of by all students.`),
            wrongFrac(a + b, total, "That is the probability of selecting a Grade 11 student, whatever the choice."),
            ...slipsFrac(a, total),
          ],
          steps: [
            step("Find the count that fits both conditions", `$${a}$ students are in Grade 11 and ${event}.`),
            step("Divide by all students", `The probability is $${fracStepTex(a, total)}$.`),
          ],
          hint: "The student is chosen from everyone, so divide by the grand total.",
          audit: { kind: "value", expression: `${a}/(${a} + ${b} + ${c} + ${d})` },
        };
      }
      return {
        stem: `${intro} If a Grade 11 student is selected at random, what is the probability that the student ${event}?`,
        table,
        answer: optFrac(a, a + b),
        distractors: [
          wrongFrac(a, total, "The count was divided by all students; the selection is made only from Grade 11."),
          wrongFrac(
            a,
            a + c,
            `The condition was reversed: this is the probability that a student who ${event} is in Grade 11.`,
          ),
          wrongFrac(b, a + b, "The other column of the Grade 11 row was used."),
          wrongFrac(a + c, total, `That is the probability that a student from either grade ${event}.`),
          ...slipsFrac(a, a + b),
        ],
        steps: [
          step("Restrict to the given group", `Only the ${a + b} Grade 11 students can be selected.`),
          step(
            "Count the favorable outcomes within that group",
            `$${a}$ of them fit the description, so the probability is $${fracStepTex(a, a + b)}$.`,
          ),
        ],
        hint: "“If a Grade 11 student is selected” means the denominator is the Grade 11 total.",
        audit: { kind: "value", expression: `${a}/(${a} + ${b})` },
        insight:
          "Dividing by the size of the group you are conditioning on, rather than by everyone, is the idea behind every rate an actuary computes.",
      };
    },
  },
  {
    id: "marbles",
    skillId: "sat-probability",
    title: "Probability of drawing objects",
    levels: [1, 2],
    formats: ["choice", "numeric"],
    build({ rng, level }) {
      const red = rng.int(3, 7);
      const blue = rng.int(2, 6);
      const green = rng.int(1, 5);
      const n = red + blue + green;
      const bag = `A bag contains ${red} red marbles, ${blue} blue ${blue === 1 ? "marble" : "marbles"} and ${green} green ${green === 1 ? "marble" : "marbles"}.`;
      if (level === 1) {
        return {
          stem: `${bag} One marble is drawn at random. What is the probability that it is not red?`,
          answer: optFrac(n - red, n),
          distractors: [
            wrongFrac(red, n, "That is the probability that the marble is red."),
            wrongFrac(blue, n, "Only the blue marbles were counted; green marbles are also not red."),
            wrongFrac(n - red, red, "The count was compared with the red marbles instead of with all the marbles."),
            ...slipsFrac(n - red, n),
          ],
          steps: [
            step("Count the favorable marbles", `$${blue} + ${green} = ${n - red}$ marbles are not red.`),
            step("Divide by all marbles", `There are ${n} marbles, so the probability is $${fracStepTex(n - red, n)}$.`),
          ],
          hint: "Use the complement: not red means blue or green.",
          audit: { kind: "value", expression: `1 - ${red}/${n}` },
        };
      }
      return {
        stem: `${bag} Two marbles are drawn at random, one after the other, without replacement. What is the probability that both marbles are red?`,
        answer: optFrac(red * (red - 1), n * (n - 1)),
        distractors: [
          wrongFrac(
            red * red,
            n * n,
            "The first marble was treated as if it were put back; without replacement, one fewer red marble and one fewer marble remain.",
          ),
          wrongFrac(red, n, "That is the probability for a single draw."),
          wrongFrac(red - 1, n - 1, "That is the probability for the second draw only."),
          wrongFrac(red * (red - 1), n * n, "The number of marbles left for the second draw was not reduced."),
          ...slipsFrac(red * (red - 1), n * (n - 1)),
        ],
        steps: [
          step("First draw", `The probability of red is $\\dfrac{${red}}{${n}}$.`),
          step(
            "Second draw",
            `One red marble is gone, so the probability of red is now $\\dfrac{${red - 1}}{${n - 1}}$.`,
          ),
          step(
            "Multiply",
            `$\\dfrac{${red}}{${n}} \\times \\dfrac{${red - 1}}{${n - 1}} = ${fracStepTex(red * (red - 1), n * (n - 1))}$.`,
          ),
        ],
        hint: "Multiply the probability of the first draw by the probability of the second draw given the first.",
        audit: { kind: "value", expression: `(${red}/${n})*((${red} - 1)/(${n} - 1))` },
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Inference from samples                                              */
  /* ------------------------------------------------------------------ */
  {
    id: "margin-of-error",
    skillId: "sat-inference",
    title: "Interpret a margin of error",
    levels: [2],
    formats: ["choice"],
    build({ rng }) {
      const percent = rng.int(38, 64);
      const margin = rng.pick([2, 3, 4, 5]);
      const size = rng.pick([400, 500, 600, 800, 1000, 1200]);
      const context = rng.pick([
        { group: "voters in a city", claim: "support building a new park" },
        { group: "students at a university", claim: "prefer evening classes" },
        { group: "residents of a town", claim: "favor opening a new library" },
        { group: "customers of a bank", claim: "use its mobile app every week" },
      ]);
      const low = percent - margin;
      const high = percent + margin;
      return {
        stem: `In a random sample of ${numText(size)} ${context.group}, ${percent}% ${context.claim}. The margin of error for this estimate is ${margin} percentage points. Which of the following is the most appropriate conclusion?`,
        answer: optText(
          `It is plausible that between ${low}% and ${high}% of all ${context.group} ${context.claim}.`,
        ),
        distractors: [
          wrongText(
            `Exactly ${percent}% of all ${context.group} ${context.claim}.`,
            "A sample estimate is unlikely to equal the population value exactly; the margin of error describes that uncertainty.",
          ),
          wrongText(
            `At least ${high}% of all ${context.group} ${context.claim}.`,
            "The upper end of the interval is the largest plausible value, not a minimum.",
          ),
          wrongText(
            `About ${margin}% of the people in the sample gave inaccurate answers.`,
            "The margin of error measures how much estimates vary from sample to sample, not mistakes made by respondents.",
          ),
        ],
        steps: [
          step(
            "Build the interval",
            `Estimate ± margin of error: $${percent}\\% - ${margin}\\% = ${low}\\%$ and $${percent}\\% + ${margin}\\% = ${high}\\%$.`,
          ),
          step(
            "Interpret it",
            "Because the sample was random, values in this interval are plausible for the whole population. The interval does not make any single value certain.",
          ),
        ],
        hint: "A margin of error gives a range of plausible values for the population, not a guarantee.",
        insight:
          "The same estimate-plus-margin reasoning underlies the confidence intervals actuaries put around claim frequencies.",
      };
    },
  },
  {
    id: "sampling-validity",
    skillId: "sat-inference",
    title: "Judge how a sample was chosen",
    levels: [1],
    formats: ["choice"],
    build({ rng }) {
      const size = rng.pick([40, 50, 60, 75, 80, 100, 120, 150]);
      const context = rng.pick([
        {
          goal: "the average number of hours that students at a high school sleep each night",
          sample: `${size} students who are in the school library before the first class`,
          population: "all students at the school",
        },
        {
          goal: "the average commuting time of workers in a city",
          sample: `${size} people at a downtown train station`,
          population: "all workers in the city",
        },
        {
          goal: "the proportion of adults in a town who exercise regularly",
          sample: `${size} members of a local gym`,
          population: "all adults in the town",
        },
        {
          goal: "the average amount that customers of a supermarket spend per visit",
          sample: `${size} customers who used the express checkout lane`,
          population: "all customers of the supermarket",
        },
        {
          goal: "the proportion of residents of a city who support building a new stadium",
          sample: `${size} people leaving a football game`,
          population: "all residents of the city",
        },
        {
          goal: "the average time that students at a school spend reading each week",
          sample: `${size} members of the school's book club`,
          population: "all students at the school",
        },
      ]);
      return {
        stem: `A researcher wants to estimate ${context.goal}. The researcher surveys ${context.sample}. Which of the following is the main reason the results may not be reliable for the researcher's purpose?`,
        answer: optText(`The people surveyed were not selected at random from ${context.population}.`),
        distractors: [
          wrongText(
            `A sample of ${size} people is too small for any survey.`,
            "Size is not the flaw here: a larger sample chosen the same way would be biased in the same direction.",
          ),
          wrongText(
            `The survey did not include every member of the population.`,
            "A sample never needs to include everyone; it needs to be chosen at random.",
          ),
          wrongText(
            "The survey asked about only one topic.",
            "Measuring a single variable is not a flaw in a survey.",
          ),
        ],
        steps: [
          step(
            "Compare the sample with the population",
            `The researcher wants a conclusion about ${context.population}, but everyone surveyed came from one particular group.`,
          ),
          step(
            "Identify the problem",
            "That group is likely to differ systematically from the population in exactly the quantity being measured, so the estimate is biased. Only random selection from the whole population removes that bias.",
          ),
        ],
        hint: "Ask whether every member of the population had the same chance of being surveyed.",
      };
    },
  },
];
