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

**Building tools that make quantitative concepts inspectable rather than magical.**

Actuarial science · Quantitative finance · Computer science

[![MathForge](https://img.shields.io/badge/MathForge-live-8957e5?style=for-the-badge)](https://mathforge-blush.vercel.app)
[![FinHub Tracker](https://img.shields.io/badge/FinHub_Tracker-live-1f6feb?style=for-the-badge)](https://finhubtracker-maudung.vercel.app)

</div>

---

## About

I'm interested in the point where mathematics stops being a formula on a page and starts being
something you can turn a dial on and watch respond. Most of my work is the same experiment run
twice: take a body of theory — survival models, option pricing, risk measurement — implement it
from first principles instead of importing a library, and then build an interface that makes the
theory legible to someone who hasn't read the textbook.

Implementing from scratch is a deliberate constraint. Calling `scipy.stats.norm.ppf` teaches you
nothing; writing the probit function as Acklam's rational approximation refined by a Halley step,
and then proving $\Phi(\Phi^{-1}(p)) = p$ to ten decimal places, teaches you what the function
actually is. Both projects below are built that way, and both are pinned by test suites that check
against closed-form results rather than against themselves.

---

## Featured projects

<table>
<tr>
<td width="50%" valign="top">

### 🧮 [MathForge](https://github.com/dung037517-netizen/mathforge)

**Interactive actuarial & probability computing workbench**

A recursive-descent parser, a symbolic differentiator that narrates every rule it applies, adaptive
Simpson quadrature, LU and Gauss-Jordan linear algebra, five parametric mortality laws, and seeded
Monte Carlo that runs in a Web Worker — with **zero runtime maths dependencies**.

Computes ₜpₓ, e̊ₓ, Āₓ, āₓ and net premiums, and displays Āₓ + δāₓ live as a self-check that it must
equal 1.

`TypeScript` `Next.js 16` `React 19` `Web Workers` `KaTeX` `Recharts`

**43 tests** · [Live demo](https://mathforge-blush.vercel.app) · [Engine](https://github.com/dung037517-netizen/mathforge/blob/main/lib/math-engine.ts)

</td>
<td width="50%" valign="top">

### 📈 [FinHub Tracker](https://github.com/dung037517-netizen/financeflow)

**Quantitative risk analytics & portfolio dashboard**

Value at Risk by four estimation methods (historical, parametric, Cornish-Fisher, Monte Carlo),
Black-Scholes-Merton with a full first- to third-order Greek surface, bracketed-Newton implied
volatility, Wilder's RSI, and marginal risk contributions from the covariance matrix — with **zero
finance libraries**.

Renders the put-call parity residual on screen, so a sign error anywhere in the pricer is visible
immediately.

`TypeScript` `Next.js 16` `React 19` `Recharts` `Framer Motion`

**49 tests** · [Live demo](https://finhubtracker-maudung.vercel.app) · [Engine](https://github.com/dung037517-netizen/financeflow/blob/main/lib/finance-engine.ts)

</td>
</tr>
</table>

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
![Survival Models](https://img.shields.io/badge/Survival_Models-1f6feb?style=flat-square)
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

**Types as documentation.** Both engines are written in strict TypeScript with no use of `any`.
Failure is modelled as a `Result<T, Error>` discriminated union rather than a thrown string, so the
compiler forces the UI to handle a singular matrix or an arbitrageable option quote instead of
rendering `NaN` at a user.

**Tests that check against something external.** A test comparing a function to itself proves
nothing. Mine compare a symbolic derivative against a central finite difference, a Monte Carlo
expectation against its closed form, and an at-the-money call against the textbook 10.4506.

**Never blocking the main thread.** Half a million simulated paths run in a Web Worker, and where a
worker is unavailable the same batched runner is driven one batch per animation frame — so the
longest task stays a few milliseconds either way, and results are bit-for-bit identical for a given
seed.

**Interfaces that admit their own errors.** Put-call parity residuals and actuarial identities are
displayed on screen. If the maths is wrong, the page says so rather than quietly showing a
plausible number.

---

## Mathematics I've implemented from scratch

<div align="center">

| Area | Specifics |
|---|---|
| **Calculus** | recursive-descent parsing, symbolic differentiation with rule attribution, adaptive Simpson quadrature with Richardson extrapolation |
| **Linear algebra** | LU with partial pivoting, Gauss-Jordan inversion, RREF rank, cyclic Jacobi eigenvalues |
| **Special functions** | Lanczos $\ln\Gamma$, regularised incomplete gamma, $\mathrm{erf}$/$\mathrm{erfc}$, probit |
| **Life contingencies** | Gompertz, Makeham, De Moivre, Weibull; ₜpₓ, e̊ₓ, Āₓ, āₓ, net premiums |
| **Interest theory** | compound accumulation, annuities, Macaulay & modified duration, convexity, IRR |
| **Risk measures** | VaR and TVaR — historical, parametric, Cornish-Fisher, Monte Carlo |
| **Derivatives** | Black-Scholes-Merton, eight Greeks, implied volatility, put-call parity |
| **Stochastic methods** | seeded mulberry32, Box-Muller, GBM paths, inverse-transform lifetime sampling |

</div>

---

<div align="center">

<sub>Currently looking for people to build quantitative tools with.</sub>

</div>
