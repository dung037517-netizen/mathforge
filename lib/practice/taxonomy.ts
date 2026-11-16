/**
 * Course → domain → skill map.
 *
 * The SAT domains follow the four content areas of the digital SAT Math
 * section; the AP domains follow the unit structure of the AP Calculus and AP
 * Statistics course descriptions. Skills are the level at which mastery is
 * estimated and at which a student is told what to practise next.
 */

import type { Course, CourseId, Domain, DomainId, Skill, Subject } from "@/types/practice";

export const COURSES: readonly Course[] = [
  {
    id: "sat",
    name: "SAT Math",
    shortName: "SAT",
    description:
      "The four content areas of the digital SAT Math section: algebra, advanced math, " +
      "problem-solving and data analysis, and geometry and trigonometry.",
    domains: ["sat-algebra", "sat-advanced", "sat-data", "sat-geometry"],
  },
  {
    id: "ap-calculus",
    name: "AP Calculus",
    shortName: "AP Calc",
    description:
      "Limits, derivatives, integrals and their applications from AP Calculus AB, with the " +
      "series and integration techniques added in BC.",
    domains: [
      "calc-limits",
      "calc-derivatives",
      "calc-applications",
      "calc-integrals",
      "calc-series",
    ],
  },
  {
    id: "ap-statistics",
    name: "AP Statistics",
    shortName: "AP Stats",
    description:
      "Describing data, probability and random variables, sampling distributions, and " +
      "statistical inference.",
    domains: ["stats-data", "stats-probability", "stats-sampling", "stats-inference"],
  },
];

export const DOMAINS: readonly Domain[] = [
  {
    id: "sat-algebra",
    course: "sat",
    subject: "algebra",
    name: "Algebra",
    description: "Linear equations, functions, systems and inequalities.",
  },
  {
    id: "sat-advanced",
    course: "sat",
    subject: "algebra",
    name: "Advanced Math",
    description: "Quadratics, exponentials, polynomials and other nonlinear equations.",
  },
  {
    id: "sat-data",
    course: "sat",
    subject: "statistics",
    name: "Problem-Solving & Data Analysis",
    description: "Ratios and percentages, data summaries, probability and inference from samples.",
  },
  {
    id: "sat-geometry",
    course: "sat",
    subject: "geometry",
    name: "Geometry & Trigonometry",
    description: "Area and volume, triangles, circles and right-triangle trigonometry.",
  },
  {
    id: "calc-limits",
    course: "ap-calculus",
    subject: "calculus",
    name: "Limits & Continuity",
    description: "Evaluating limits and deciding where a function is continuous.",
  },
  {
    id: "calc-derivatives",
    course: "ap-calculus",
    subject: "calculus",
    name: "Differentiation",
    description: "The derivative rules, the chain rule and implicit differentiation.",
  },
  {
    id: "calc-applications",
    course: "ap-calculus",
    subject: "calculus",
    name: "Applications of Derivatives",
    description: "Tangent lines, motion, extrema, optimisation and related rates.",
  },
  {
    id: "calc-integrals",
    course: "ap-calculus",
    subject: "calculus",
    name: "Integration",
    description: "Definite integrals, the Fundamental Theorem and accumulation.",
  },
  {
    id: "calc-series",
    course: "ap-calculus",
    subject: "calculus",
    name: "Series & BC Techniques",
    description: "Geometric and Taylor series, improper integrals and integration by parts.",
  },
  {
    id: "stats-data",
    course: "ap-statistics",
    subject: "statistics",
    name: "Exploring Data",
    description: "Describing distributions, standardising, and linear regression.",
  },
  {
    id: "stats-probability",
    course: "ap-statistics",
    subject: "statistics",
    name: "Probability & Random Variables",
    description: "Probability rules, Bayes' rule, expected value, and standard models.",
  },
  {
    id: "stats-sampling",
    course: "ap-statistics",
    subject: "statistics",
    name: "Sampling Distributions",
    description: "How sample means and proportions vary, and the Central Limit Theorem.",
  },
  {
    id: "stats-inference",
    course: "ap-statistics",
    subject: "statistics",
    name: "Inference",
    description: "Confidence intervals and significance tests.",
  },
];

export const SKILLS: readonly Skill[] = [
  /* ---------------------------- SAT · Algebra ---------------------------- */
  {
    id: "sat-linear-equations",
    domain: "sat-algebra",
    name: "Linear equations",
    description: "Solve a linear equation in one variable and decide how many solutions it has.",
  },
  {
    id: "sat-linear-functions",
    domain: "sat-algebra",
    name: "Linear functions",
    description: "Find and interpret slope and intercepts, and build a linear model from a context.",
  },
  {
    id: "sat-linear-systems",
    domain: "sat-algebra",
    name: "Systems of linear equations",
    description: "Solve a pair of linear equations and recognise when a system has no solution.",
  },
  {
    id: "sat-linear-inequalities",
    domain: "sat-algebra",
    name: "Linear inequalities",
    description: "Solve and apply linear inequalities, including constraints from a context.",
  },
  /* ------------------------- SAT · Advanced Math ------------------------- */
  {
    id: "sat-quadratics",
    domain: "sat-advanced",
    name: "Quadratics",
    description: "Solve quadratic equations and read the vertex, roots and discriminant.",
  },
  {
    id: "sat-exponentials",
    domain: "sat-advanced",
    name: "Exponentials",
    description: "Apply exponent rules and interpret exponential growth and decay models.",
  },
  {
    id: "sat-polynomials",
    domain: "sat-advanced",
    name: "Polynomials & expressions",
    description: "Expand, factor and rewrite expressions, and evaluate and compose functions.",
  },
  {
    id: "sat-nonlinear-equations",
    domain: "sat-advanced",
    name: "Nonlinear equations",
    description: "Solve rational, radical and absolute-value equations and nonlinear systems.",
  },
  /* ------------------- SAT · Problem-Solving & Data ---------------------- */
  {
    id: "sat-ratios-percents",
    domain: "sat-data",
    name: "Ratios, rates & percentages",
    description: "Reason with proportions, unit rates and percentage change.",
  },
  {
    id: "sat-data-summaries",
    domain: "sat-data",
    name: "Data summaries & models",
    description: "Work with mean, median and spread, and use a line of best fit.",
  },
  {
    id: "sat-probability",
    domain: "sat-data",
    name: "Probability",
    description: "Compute probabilities, including conditional probabilities from a two-way table.",
  },
  {
    id: "sat-inference",
    domain: "sat-data",
    name: "Samples & margin of error",
    description: "Judge what a sample result does and does not say about a population.",
  },
  /* ------------------------- SAT · Geometry ------------------------------ */
  {
    id: "sat-area-volume",
    domain: "sat-geometry",
    name: "Area, volume & scale",
    description: "Use area and volume formulas and reason about how scaling changes them.",
  },
  {
    id: "sat-triangles",
    domain: "sat-geometry",
    name: "Angles & triangles",
    description: "Use angle relationships, the Pythagorean theorem, similarity and special triangles.",
  },
  {
    id: "sat-circles",
    domain: "sat-geometry",
    name: "Circles",
    description: "Work with the equation of a circle, arcs and sectors.",
  },
  {
    id: "sat-trigonometry",
    domain: "sat-geometry",
    name: "Trigonometry",
    description: "Use sine, cosine and tangent in right triangles and convert angle measures.",
  },
  /* ---------------------------- AP Calculus ------------------------------ */
  {
    id: "calc-limits",
    domain: "calc-limits",
    name: "Evaluating limits",
    description: "Evaluate limits algebraically, at infinity, and with L'Hôpital's rule.",
  },
  {
    id: "calc-continuity",
    domain: "calc-limits",
    name: "Continuity",
    description: "Decide whether a function is continuous and choose constants that make it so.",
  },
  {
    id: "calc-derivative-rules",
    domain: "calc-derivatives",
    name: "Derivative rules",
    description: "Differentiate with the power, product and quotient rules.",
  },
  {
    id: "calc-chain-rule",
    domain: "calc-derivatives",
    name: "Chain rule & implicit differentiation",
    description: "Differentiate composite functions and implicitly defined curves.",
  },
  {
    id: "calc-tangents-motion",
    domain: "calc-applications",
    name: "Tangent lines & motion",
    description: "Write tangent lines and interpret derivatives as velocity and acceleration.",
  },
  {
    id: "calc-optimization",
    domain: "calc-applications",
    name: "Extrema & optimisation",
    description: "Locate and classify critical points and solve optimisation problems.",
  },
  {
    id: "calc-related-rates",
    domain: "calc-applications",
    name: "Related rates & the Mean Value Theorem",
    description: "Relate rates of change and apply the Mean Value Theorem.",
  },
  {
    id: "calc-definite-integrals",
    domain: "calc-integrals",
    name: "Definite integrals",
    description: "Evaluate definite integrals directly and by substitution.",
  },
  {
    id: "calc-ftc",
    domain: "calc-integrals",
    name: "The Fundamental Theorem",
    description: "Differentiate accumulation functions and approximate integrals from data.",
  },
  {
    id: "calc-integral-applications",
    domain: "calc-integrals",
    name: "Applications of integrals",
    description: "Find average value, area between curves, and solve growth models.",
  },
  {
    id: "calc-series",
    domain: "calc-series",
    name: "Series",
    description: "Sum geometric series and find Taylor coefficients.",
  },
  {
    id: "calc-advanced-integration",
    domain: "calc-series",
    name: "Improper integrals & parts",
    description: "Evaluate improper integrals and integrate by parts.",
  },
  /* --------------------------- AP Statistics ----------------------------- */
  {
    id: "stats-describing-data",
    domain: "stats-data",
    name: "Describing distributions",
    description: "Standardise values, identify outliers and track how transformations change summaries.",
  },
  {
    id: "stats-regression",
    domain: "stats-data",
    name: "Linear regression",
    description: "Interpret slope, residuals and the coefficient of determination.",
  },
  {
    id: "stats-probability-rules",
    domain: "stats-probability",
    name: "Probability rules & Bayes",
    description: "Apply the addition and multiplication rules and reverse a conditional probability.",
  },
  {
    id: "stats-random-variables",
    domain: "stats-probability",
    name: "Random variables",
    description: "Find expected values and combine independent random variables.",
  },
  {
    id: "stats-distributions",
    domain: "stats-probability",
    name: "Binomial, geometric & normal models",
    description: "Compute probabilities from the standard discrete and continuous models.",
  },
  {
    id: "stats-sampling-distributions",
    domain: "stats-sampling",
    name: "Sampling distributions",
    description: "Describe the centre and spread of sample means and proportions.",
  },
  {
    id: "stats-confidence-intervals",
    domain: "stats-inference",
    name: "Confidence intervals",
    description: "Construct and interpret intervals and choose a sample size.",
  },
  {
    id: "stats-significance-tests",
    domain: "stats-inference",
    name: "Significance tests",
    description: "Compute test statistics and draw conclusions from P-values.",
  },
];

const COURSE_BY_ID = new Map<CourseId, Course>(COURSES.map((course) => [course.id, course]));
const DOMAIN_BY_ID = new Map<DomainId, Domain>(DOMAINS.map((domain) => [domain.id, domain]));
const SKILL_BY_ID = new Map<string, Skill>(SKILLS.map((skill) => [skill.id, skill]));

export function getCourse(id: CourseId): Course {
  const course = COURSE_BY_ID.get(id);
  if (course === undefined) throw new Error(`Unknown course "${id}".`);
  return course;
}

export function getDomain(id: DomainId): Domain {
  const domain = DOMAIN_BY_ID.get(id);
  if (domain === undefined) throw new Error(`Unknown domain "${id}".`);
  return domain;
}

export function findSkill(id: string): Skill | null {
  return SKILL_BY_ID.get(id) ?? null;
}

export function getSkill(id: string): Skill {
  const skill = SKILL_BY_ID.get(id);
  if (skill === undefined) throw new Error(`Unknown skill "${id}".`);
  return skill;
}

export function skillsInDomain(domain: DomainId): readonly Skill[] {
  return SKILLS.filter((skill) => skill.domain === domain);
}

export function skillsInCourse(course: CourseId): readonly Skill[] {
  const domains = new Set<DomainId>(getCourse(course).domains);
  return SKILLS.filter((skill) => domains.has(skill.domain));
}

export function courseOfSkill(skillId: string): CourseId | null {
  const skill = findSkill(skillId);
  return skill === null ? null : getDomain(skill.domain).course;
}

export function isCourseId(value: unknown): value is CourseId {
  return typeof value === "string" && COURSE_BY_ID.has(value as CourseId);
}

export const SUBJECT_LABELS: Readonly<Record<Subject, string>> = {
  algebra: "Algebra",
  statistics: "Statistics",
  calculus: "Calculus",
  geometry: "Geometry",
};
