<!--
  GitHub profile README.

  To publish: create a public repository named exactly `dung037517-netizen`
  (same as the username) and commit this file as its top-level README.md.
  GitHub renders it on github.com/dung037517-netizen automatically.

  Everything below is factual and verifiable from the two linked repositories.
  Optional personal details you may want to add yourself — school, graduating
  year, coursework, exam progress (e.g. SOA Exam P/FM), contact email — are
  deliberately absent rather than invented.
-->

<div align="center">

# Hi, I'm Dung 👋

**High School Developer & Aspiring Actuary** passionate about Applied Mathematics,
Probability Models, and Computational Tools for Student Success.

<br/>

### 🚀 Live Projects

[![MathForge](https://img.shields.io/badge/🚀_Live_Demo-MathForge_—_SAT%2FAP_Calculus_Learning_Platform-8957e5?style=for-the-badge&labelColor=1a1626)](https://mathforge-blush.vercel.app/)

[![FinHub Tracker](https://img.shields.io/badge/📊_Live_Demo-FinHub_Tracker_—_Student_Finance_Planning_Web_App-1f6feb?style=for-the-badge&labelColor=0b1014)](https://finhubtracker-maudung.vercel.app/)

<br/>

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white)
![Financial Mathematics](https://img.shields.io/badge/Financial_Mathematics-8957e5?style=flat-square)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![R](https://img.shields.io/badge/R-276DC3?style=flat-square&logo=r&logoColor=white)

</div>

---

## About

I build tools that make quantitative concepts **inspectable rather than magical**.

Most of my work is the same experiment run twice: take a body of theory — calculus, probability,
survival models, option pricing — implement it from first principles instead of importing a
library, and then build an interface that makes the theory legible to someone who has not read the
textbook.

Implementing from scratch is a deliberate constraint. Calling `scipy.stats.norm.ppf` teaches you
nothing; writing the probit function as Acklam's rational approximation refined by a Halley step,
and then proving $\Phi(\Phi^{-1}(p)) = p$ to ten decimal places, teaches you what the function
actually *is*. Both projects below are built that way, and both are pinned by test suites that
check against closed-form results rather than against themselves.

---

## Featured projects

<table>
<tr>
<td width="50%" valign="top">

### 🧮 [MathForge — SAT/AP Calculus Learning Platform](https://github.com/dung037517-netizen/mathforge)

**[🚀 Live demo](https://mathforge-blush.vercel.app/)**

Twelve exam-style AP Calculus AB/BC and AP Statistics problems, each solved with a **complete
step-by-step derivation** that names every rule it applies — product, quotient, chain, and
logarithmic differentiation for cases like $x^x$.

Built on a hand-written recursive-descent parser, adaptive Simpson quadrature, LU and Gauss-Jordan
linear algebra, and a Central Limit Theorem simulator that runs in a **Web Worker** — with **zero
runtime maths dependencies**.

Every AP topic is annotated with the actuarial technique it becomes.

`TypeScript` `Next.js 16` `React 19` `Web Workers` `KaTeX` `Recharts`

**48 tests passing** · [Engine source](https://github.com/dung037517-netizen/mathforge/blob/main/lib/math-engine.ts)

</td>
<td width="50%" valign="top">

### 📈 [FinHub Tracker — Student Finance Planning Web App](https://github.com/dung037517-netizen/financeflow)

**[📊 Live demo](https://finhubtracker-maudung.vercel.app/)**

A four-year college funding plan modelled the way an actuary would: tuition inflated forward,
savings accumulated as an **annuity-due**, drawn down semester by semester, then stress-tested
against **1,200 Monte Carlo futures** for shortfall probability and VaR.

Underneath sits a full risk desk — Value at Risk by four methods, Black-Scholes-Merton with an
eight-Greek surface, and marginal risk contributions from the covariance matrix — with **zero
finance libraries**.

It renders the put-call parity residual on screen, so a sign error is visible immediately.

`TypeScript` `Next.js 16` `React 19` `Recharts` `Framer Motion`

**63 tests passing** · [Engine source](https://github.com/dung037517-netizen/financeflow/blob/main/lib/finance-engine.ts)

</td>
</tr>
</table>

---

## The thread connecting both projects

The mathematics on an AP exam **is** the mathematics of risk. Only the vocabulary changes.

| What you learn in AP | What it becomes professionally |
|---|---|
| Chain rule on $e^{-x^2/2}$ | The standard normal density — behind every option Greek and VaR figure |
| Improper integral $\int_0^\infty e^{-\delta t}dt$ | The present value of a perpetuity; add survival and it is a life annuity $\bar{a}_x$ |
| Central Limit Theorem | Why insurers can price 10,000 policies more confidently than one — risk pooling |
| Geometric sequences | Tuition inflation, and every compound-growth projection |
| Conditional expectation | Expected shortfall, the coherent risk measure behind Solvency II |

Both apps make this explicit rather than implied — MathForge annotates each AP problem with its
professional counterpart, and FinHub demonstrates that funding a savings plan to its *expected*
return still leaves a coin-flip chance of falling short.

---

## Toolkit

<div align="center">

**Languages**

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![R](https://img.shields.io/badge/R-276DC3?style=flat-square&logo=r&logoColor=white)
![SQL](https://img.shields.io/badge/SQL-4479A1?style=flat-square&logo=postgresql&logoColor=white)

**Frontend**

![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Radix UI](https://img.shields.io/badge/Radix_UI-161618?style=flat-square&logo=radixui&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=flat-square&logo=framer&logoColor=white)

**Quantitative**

![Financial Mathematics](https://img.shields.io/badge/Financial_Mathematics-8957e5?style=flat-square)
![Probability Models](https://img.shields.io/badge/Probability_Models-1f6feb?style=flat-square)
![Survival Models](https://img.shields.io/badge/Survival_Models-0891b2?style=flat-square)
![Monte Carlo](https://img.shields.io/badge/Monte_Carlo-3fb950?style=flat-square)
![Numerical Analysis](https://img.shields.io/badge/Numerical_Analysis-db6d28?style=flat-square)
![Option Pricing](https://img.shields.io/badge/Option_Pricing-cf222e?style=flat-square)

**Engineering**

![Git](https://img.shields.io/badge/Git-F05032?style=flat-square&logo=git&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=flat-square&logo=eslint&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

</div>

---

## What I care about in code

**Types as documentation.** Both engines are strict TypeScript with no use of `any`. Failure is a
`Result<T, Error>` discriminated union rather than a thrown string, so the compiler forces the UI to
handle a singular matrix or an arbitrageable quote instead of rendering `NaN` at a user.

**Tests that check against something external.** A test comparing a function to itself proves
nothing. Mine compare a symbolic derivative against a central finite difference, a Monte Carlo
expectation against its closed form, a savings ledger against the annuity-due formula, and an
at-the-money call against the textbook 10.4506.

**Never blocking the main thread.** Half a million simulated paths run in a Web Worker; where a
worker is unavailable the same batched runner is driven one batch per animation frame — so the
longest task stays a few milliseconds either way, and results are bit-for-bit identical for a given
seed.

**Interfaces that admit their own errors.** Put-call parity residuals, $\bar{A}_x + \delta\bar{a}_x$,
and the CLT's $\sigma/\sqrt{n}$ check are all displayed on screen. If the maths is wrong, the page
says so rather than quietly showing a plausible number.

---

## Mathematics I've implemented from scratch

<div align="center">

| Area | Specifics |
|---|---|
| **Calculus** | recursive-descent parsing, symbolic differentiation with rule attribution, adaptive Simpson quadrature with Richardson extrapolation |
| **Linear algebra** | LU with partial pivoting, Gauss-Jordan inversion, RREF rank, cyclic Jacobi eigenvalues |
| **Special functions** | Lanczos $\ln\Gamma$, regularised incomplete gamma, $\mathrm{erf}$/$\mathrm{erfc}$, probit |
| **Probability** | nine distributions with closed-form moments, inverse-transform and Marsaglia-Tsang sampling |
| **Life contingencies** | Gompertz, Makeham, De Moivre, Weibull; ₜpₓ, e̊ₓ, Āₓ, āₓ, net premiums |
| **Interest theory** | compound accumulation, annuities-due, Macaulay & modified duration, convexity, IRR |
| **Risk measures** | VaR and TVaR — historical, parametric, Cornish-Fisher, Monte Carlo; shortfall risk |
| **Derivatives** | Black-Scholes-Merton, eight Greeks, implied volatility, put-call parity |
| **Stochastic methods** | seeded mulberry32, Box-Muller, GBM paths, inverse-transform lifetime sampling |

</div>

---

<div align="center">

<sub>Currently looking for people to build quantitative tools with.</sub>

</div>
