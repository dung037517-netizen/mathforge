<div align="center">

# MathForge — SAT/AP Math Practice Platform

**Diagnose, practice, review: free practice for SAT Math, AP Calculus and AP Statistics, with step-by-step worked solutions and mock tests in the digital SAT format.**

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Tests](https://img.shields.io/badge/tests-228_passing-3fb950?style=flat-square&logo=vitest&logoColor=white)](./tests)
[![Question types](https://img.shields.io/badge/question_types-118-f78166?style=flat-square)](./lib/practice/templates)
[![Runtime math dependencies](https://img.shields.io/badge/runtime_math_deps-0-8957e5?style=flat-square)](./lib/math-engine.ts)

[🚀 **Live site**](https://mathforge-blush.vercel.app) · [How it works](https://mathforge-blush.vercel.app/method) · [Question bank](./lib/practice/templates) · [Tests](./tests)

</div>

---

## What this is

A practice platform for **SAT Math, AP Calculus (AB with the BC additions) and AP Statistics**,
built around one loop:

| Step | What happens |
|---|---|
| **1. Diagnose** | A short adaptive test visits every skill of the course once and produces a first mastery estimate for each, with its uncertainty. |
| **2. Practice** | Questions are drawn mostly from the weakest skills, at a difficulty matched to the student. Each comes with a worked solution and the specific mistake behind every wrong choice. |
| **3. Review** | Every miss is filed in a notebook and returns after 1, 3 and 7 days — with new numbers — until it has been answered correctly four times in a row. |

Around the loop: **timed mock tests** in the two-module adaptive format of the digital SAT Math
section, and a **progress report** that tracks 36 skills over time.

There are no accounts, no ads and no server. Progress is stored in the student's own browser and
can be exported as a file.

## The question bank

Every question is original and is written as a small program — a *template* — rather than as text.
Given a seed, a template picks numbers so the answer comes out clean, writes the question, builds
the wrong choices from specific named mistakes, and writes the worked solution.

- **118 templates** across 36 skills in 13 domains
  ([SAT](./lib/practice/templates/sat-algebra.ts) ·
  [AP Calculus](./lib/practice/templates/ap-calculus.ts) ·
  [AP Statistics](./lib/practice/templates/ap-statistics.ts))
- Multiple-choice and typed-answer formats; typed answers are graded with the SAT's own rule
  (2/3 may be entered as `2/3`, `0.666` or `0.667`, but not `0.67`)
- A question is fully determined by four values — template, seed, level, format — so a missed
  question is stored in a few bytes and can always be rebuilt exactly

### Answer keys are checked, not trusted

A template states, in plain infix, a fact its answer must satisfy. In the test suite an expression
engine written from scratch for this project ([`lib/math-engine.ts`](./lib/math-engine.ts)) checks
that fact independently — by direct evaluation, numerical differentiation, adaptive quadrature or a
two-sided limit — for **30 seeds of every level and format of every template**. The same run
compiles every formula with KaTeX in strict mode, rejects typesetting glitches such as `1x` or
`+ -3`, and requires four distinct choices with a stated misconception behind each wrong one.

```
✓ 228 tests passing      npm test
```

A wrong answer key, a malformed formula or a duplicated choice fails the build.

## The measurement model

Described in full, with its limitations, on the site's
[How it works](https://mathforge-blush.vercel.app/method) page. In brief:

- **Response model.** Each question is a three-parameter logistic item,
  $P(\text{correct}\mid\theta) = c + (1-c)\,\sigma\big(a(\theta-b)\big)$, with ability estimated by
  exact Bayesian updating on a grid ([`irt.ts`](./lib/practice/irt.ts)).
- **Hierarchical mastery.** Ability is modeled at three nested levels — course, domain, skill —
  and the posterior is computed exactly by belief propagation on that tree
  ([`mastery.ts`](./lib/practice/mastery.ts)). A skill with three answers is not judged on three
  answers alone: it borrows strength from the rest of its domain in proportion to how little is
  known about it. This is the partial pooling behind an actuarial credibility premium.
- **Recency.** An answer's weight halves every 30 days.
- **Honest uncertainty.** Every estimate is drawn with a one-standard-deviation band; below a
  minimum amount of evidence a skill is labeled "Not enough data" and given no number.
- **Selection.** Practice uses Thompson sampling over skills
  ([`selection.ts`](./lib/practice/selection.ts)); the notebook is a Leitner system
  ([`review.ts`](./lib/practice/review.ts)).
- **Mock tests.** Two modules of 22 questions and 35 minutes, in the section's published domain
  mix; the second module is assembled after the first is graded
  ([`mock.ts`](./lib/practice/mock.ts)). The 200–800 figure is an estimate with a range.

### What the numbers do not mean

- Item parameters are **set by design, not calibrated on response data** — the site collects none.
- The mock score is an **unofficial estimate** that has never been equated against real results.
- The bank is broad, not complete.

## Why a practice site is built on actuarial ideas

| In the product | The actuarial idea behind it |
|---|---|
| A thinly observed skill is pulled toward its domain | Credibility theory: blend individual experience with the collective in proportion to its volume |
| Mastery is reported with a range, or not at all | Reserving with an explicit margin for uncertainty rather than a point estimate |
| Recent answers outweigh old ones | Experience weighting in ratemaking |
| Answer keys are verified by a second, independent method | Model validation: no result is trusted until it is reproduced another way |
| Insurance contexts in the statistics questions | Expected claim cost, pooled risk and Bayes' theorem as they are used on Exam P |

## The Lab

The [Lab](https://mathforge-blush.vercel.app/lab) holds the tools the project started with, running
on the same engine that audits the question bank — no computer-algebra library, strict TypeScript,
zero uses of `any`:

- a recursive-descent parser and a symbolic differentiator that names every rule it applies
- adaptive Simpson quadrature, LU decomposition, Jacobi eigenvalues
- nine probability distributions, five parametric mortality laws and life-contingency functions
- a Monte Carlo laboratory that runs in a Web Worker

The engine has its own tests against closed-form results (for example $\bar{A}_x + \delta\bar{a}_x = 1$
under a Gompertz law, which has no closed form for either term).

## Project structure

```
app/                      routes: / diagnostic practice review mock progress lab method
components/practice/      the practice UI (question view, solution, mock runner, reports)
components/math/          the Lab (workbench, visualizers, simulation)
lib/practice/
  templates/              the question bank, one file per course area
  question.ts             building and grading questions
  audit.ts                independent verification of answer keys
  irt.ts  mastery.ts      response model and hierarchical mastery
  selection.ts            adaptive practice and the diagnostic
  mock.ts                 mock test assembly, routing and scoring
  review.ts               the mistake notebook
  storage.ts  store.ts    validated localStorage persistence
lib/math-engine.ts        the expression, calculus, linear algebra and probability engine
tests/                    template audits, engine tests, model tests
```

## How this was built

This project was built with substantial AI assistance (Claude), and the commit history shows that
openly: most of the implementation is AI-authored. I chose the problem — a practice tool for the
exams I was preparing for myself — and set what it had to do. What I ask a reader to judge is what
can be checked independently of who typed it: every statement on the *How it works* page
corresponds to code in this repository, and the test suite re-derives the answer to every generated
question by a second method.

## Running locally

```bash
git clone https://github.com/dung037517-netizen/mathforge.git
cd mathforge
npm install
npm run dev        # http://localhost:3000

npm test           # vitest
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run build      # next build
```

Requires Node.js 20 or newer.

## Related work

**[FinHub Tracker →](https://github.com/dung037517-netizen/finhub-tracker)** — a planning tool for
the cost of applying to and attending university abroad.

---

<sub>SAT® and AP® are trademarks registered by the College Board, which is not affiliated with, and
does not endorse, this site. All questions are original.</sub>
