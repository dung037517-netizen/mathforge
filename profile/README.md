<!--
  GitHub profile README.

  To publish: create a public repository named exactly `dung037517-netizen`
  (same as the GitHub username) and commit this file as its top-level README.md.
  GitHub renders it on github.com/dung037517-netizen automatically.

  Everything below is factual and verifiable from the two linked repositories.
  School, graduating year and exam sittings are deliberately absent rather than
  invented — add them yourself once they are true.
-->

<div align="center">

# Nguyen Mau Dung

### Aspiring Actuarial Scientist · Quantitative Risk Student

*Pricing uncertainty before I am old enough to underwrite it.*

[![Email](https://img.shields.io/badge/nguyenmaudung79@gmail.com-EA4335?style=flat-square&logo=gmail&logoColor=white)](mailto:nguyenmaudung79@gmail.com)
[![GitHub](https://img.shields.io/badge/@dung037517--netizen-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/dung037517-netizen)

</div>

---

## What I work on

I am interested in the question actuaries exist to answer: **given that the
future is uncertain, how much must we set aside today, and how confident are we
that it will be enough?**

My work follows one method. Take a body of actuarial theory — annuity valuation,
life contingencies, coherent risk measures, stochastic reserving — implement it
**from its mathematical definition rather than from a library**, then build an
interface that makes the model's assumptions visible to whoever relies on it.

The constraint is deliberate. A black-box function that returns a reserve figure
teaches you nothing about whether that reserve is defensible — and *defensible*
is the entire job.

---

## Projects

### 📊 [FinHub Tracker](https://github.com/dung037517-netizen/finhub-tracker) · [live](https://finhubtracker-maudung.vercel.app/)

**A Personal Asset-Liability Management & Solvency Framework.**

Treats four years of university as a **defined-benefit liability** funded by a
risky asset portfolio. Benefits are inflation-indexed, assets accumulate as an
**annuity-due**, and the fund is run off against 1,200 lognormal scenarios to
produce a ruin probability, expected shortfall, VaR and **CTE**.

The finding: **funding the Best Estimate Liability still leaves ~50% probability
of ruin**, because the median lognormal path sits below the mean. Reaching 90%
confidence requires a **Risk Margin of 36–44%** — the same loading Solvency II
and IFRS 17 mandate above a best estimate.

`TypeScript` · `98 tests` ·
[actuarial derivations](https://github.com/dung037517-netizen/finhub-tracker/blob/main/DERIVATION.md) ·
[model risk log](https://github.com/dung037517-netizen/finhub-tracker/blob/main/POSTMORTEM.md)

### 🧮 [MathForge](https://github.com/dung037517-netizen/mathforge) · [live](https://mathforge-blush.vercel.app/)

**The mathematics underneath, worked step by step.**

Hand-written recursive-descent parser, symbolic differentiator that names every
rule it applies, adaptive Simpson quadrature, **five parametric mortality laws**
(Gompertz, Makeham, De Moivre, Weibull, constant force) with the full life
contingency stack — $_tp_x$, $\mathring{e}_x$, $\bar{A}_x$, $\bar{a}_x$ and the
net annual premium by the equivalence principle.

Displays $\bar{A}_x + \delta\bar{a}_x$ live on screen. It must equal exactly 1,
so any quadrature error is visible rather than hidden.

`TypeScript` · `48 tests` ·
[engine](https://github.com/dung037517-netizen/mathforge/blob/main/lib/math-engine.ts)

---

## Where I am going

I am applying to study **Actuarial Science** in the United States, and I intend
to sit the professional examinations — beginning with **SOA Exam P**
(Probability) and **Exam FM** (Financial Mathematics), which cover the material
these two projects are built from.

What draws me to the profession is its central discipline: a number put forward
as a reserve, a premium or a capital requirement must survive challenge by
someone whose job is to challenge it. That standard is unusual, and it is the
reason the field appeals to me more than quantitative finance generally.

Longer term I want to work where actuarial modelling meets computation —
pension and insurance valuation, capital modelling, and the reserving problems
where getting the tail right *is* the job.

---

## On using AI

Both projects were built with substantial AI assistance, and their git history
shows it. I state this in every repository README rather than letting a reviewer
discover it.

What I claim is narrower and checkable: I chose the problems, I own the
mathematics
([DERIVATION.md](https://github.com/dung037517-netizen/finhub-tracker/blob/main/DERIVATION.md)),
I own the mistakes
([POSTMORTEM.md](https://github.com/dung037517-netizen/finhub-tracker/blob/main/POSTMORTEM.md)
— including a disclosed Risk Margin that was wrong by a factor of three, and a
validation oracle that was itself incorrect), and I can defend every design
decision in the engine.

Using AI to build past my current ability, then working backwards until I
understood what it built, was a deliberate choice about how to learn quickly.

---

## How I think about models

**A point estimate is usually a design failure.** If the honest answer is a
distribution, a single number hides exactly what the decision-maker needs. This
is why the model reports a ruin probability and a conditional tail expectation,
not a projected balance.

**Validate against closed form, never against yourself.** A model that agrees
only with its own prior output proves nothing. Mine are anchored to analytic
identities: $\ddot{s}_{\overline{n}\rvert i} = \frac{(1+i)^n-1}{d}$,
$\bar{A}_x = \frac{\mu}{\mu+\delta}$, and $\bar{A}_x + \delta\bar{a}_x = 1$.

**Choose numerical methods by their failure mode.** Newton-Raphson converges
faster than bisection when it converges. Against a solvency objective that is
monotone but **kinked**, it has no convergence guarantee at all. For a reserve a
family will act on, *always right and slightly slower* wins.

**Coherence is not pedantry.** VaR is not subadditive — it can assert that
diversification increases risk. CTE satisfies all four coherence axioms, which is
why Solvency II is built on it, and why my model reports both.

---

## Toolkit

<div align="center">

**Languages**

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![R](https://img.shields.io/badge/R-276DC3?style=flat-square&logo=r&logoColor=white)
![SQL](https://img.shields.io/badge/SQL-4479A1?style=flat-square&logo=postgresql&logoColor=white)

**Actuarial domains**

![Life Contingencies](https://img.shields.io/badge/Life_Contingencies-8957e5?style=flat-square)
![Survival Models](https://img.shields.io/badge/Survival_Models-0891b2?style=flat-square)
![Interest Theory](https://img.shields.io/badge/Interest_Theory-1f6feb?style=flat-square)
![ALM](https://img.shields.io/badge/Asset--Liability_Management-16a34a?style=flat-square)
![Stochastic Reserving](https://img.shields.io/badge/Stochastic_Reserving-3fb950?style=flat-square)
![VaR & CTE](https://img.shields.io/badge/VaR_%26_CTE-cf222e?style=flat-square)
![Solvency II](https://img.shields.io/badge/Solvency_II_%2F_IFRS_17-db6d28?style=flat-square)
![Numerical Analysis](https://img.shields.io/badge/Numerical_Analysis-a855f7?style=flat-square)

**Engineering**

![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=flat-square&logo=git&logoColor=white)

</div>

---

<div align="center">
<sub>Currently working through <a href="https://github.com/dung037517-netizen/finhub-tracker/blob/main/DERIVATION.md">the actuarial mathematics</a> behind what I have built.</sub>
</div>
