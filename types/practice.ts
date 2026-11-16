/**
 * Domain vocabulary for the practice platform.
 *
 * The platform is organised as course → domain → skill → template. A template
 * is a small program that, given a seed, writes one concrete question together
 * with its answer, its distractors and its worked solution. Everything a
 * student sees is therefore reproducible from four values — template, seed,
 * level and format — which is what makes the review notebook cheap to store
 * and the mock tests impossible to memorise.
 */

/* ------------------------------------------------------------------ */
/* Taxonomy                                                            */
/* ------------------------------------------------------------------ */

export type CourseId = "sat" | "ap-calculus" | "ap-statistics";

export type DomainId =
  | "sat-algebra"
  | "sat-advanced"
  | "sat-data"
  | "sat-geometry"
  | "calc-limits"
  | "calc-derivatives"
  | "calc-applications"
  | "calc-integrals"
  | "calc-series"
  | "stats-data"
  | "stats-probability"
  | "stats-sampling"
  | "stats-inference";

/** The three subject areas the platform is organised around, plus geometry. */
export type Subject = "algebra" | "statistics" | "calculus" | "geometry";

export interface Course {
  readonly id: CourseId;
  readonly name: string;
  readonly shortName: string;
  readonly description: string;
  readonly domains: readonly DomainId[];
}

export interface Domain {
  readonly id: DomainId;
  readonly course: CourseId;
  readonly subject: Subject;
  readonly name: string;
  readonly description: string;
}

export interface Skill {
  readonly id: string;
  readonly domain: DomainId;
  readonly name: string;
  /** One sentence on what a student who has this skill can do. */
  readonly description: string;
}

/* ------------------------------------------------------------------ */
/* Questions                                                           */
/* ------------------------------------------------------------------ */

/** 1 = foundational, 2 = standard, 3 = challenging. */
export type Level = 1 | 2 | 3;

export const LEVELS: readonly Level[] = [1, 2, 3];

export const LEVEL_LABELS: Readonly<Record<Level, string>> = {
  1: "Foundational",
  2: "Standard",
  3: "Challenging",
};

/** Multiple choice, or a typed answer (the SAT's "student-produced response"). */
export type AnswerFormat = "choice" | "numeric";

/**
 * Rich text: prose with `$inline$` and `$$display$$` maths. A literal dollar
 * sign is written `\$`. Blank lines separate paragraphs.
 */
export type RichText = string;

export interface TableSpec {
  readonly caption?: string;
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

export interface WorkedStep {
  /** Short imperative title, e.g. "Distribute the 3". */
  readonly title: string;
  readonly body: RichText;
}

/** An answer option before it is laid out as a lettered choice. */
export interface Option {
  readonly display: RichText;
  /** Present when the option is a single real number. */
  readonly value?: number;
}

export interface Distractor extends Option {
  /** The specific mistake that produces this wrong answer. */
  readonly why?: string;
}

/**
 * A machine-checkable statement of why the answer is right, evaluated in the
 * test suite by the same from-scratch engine that powers the lab. A template
 * that carries an audit cannot ship a wrong answer key without failing CI.
 */
export type Audit =
  /** The answer equals this expression. */
  | { readonly kind: "value"; readonly expression: string }
  /** Substituting the answer for `variable` makes the expression vanish. */
  | { readonly kind: "root"; readonly expression: string; readonly variable: string }
  /** The answer is the derivative of the expression at a point. */
  | {
      readonly kind: "derivative";
      readonly expression: string;
      readonly variable: string;
      readonly at: number;
    }
  /** The answer is a definite integral. */
  | {
      readonly kind: "integral";
      readonly expression: string;
      readonly variable: string;
      readonly lower: number;
      readonly upper: number;
    }
  /** The answer is the limit of the expression as the variable approaches a point. */
  | {
      readonly kind: "limit";
      readonly expression: string;
      readonly variable: string;
      readonly at: number;
    };

/** What a template returns: one concrete problem, before formatting. */
export interface Draft {
  readonly stem: RichText;
  readonly table?: TableSpec;
  readonly answer: Option;
  /** At least three, each a different plausible mistake. */
  readonly distractors: readonly Distractor[];
  readonly steps: readonly WorkedStep[];
  readonly hint?: RichText;
  readonly audit?: Audit;
  /** Absolute tolerance for a typed answer. Defaults to an exact match. */
  readonly tolerance?: number;
  /** Where this idea reappears in actuarial or quantitative work. */
  readonly insight?: string;
}

export interface TemplateContext {
  readonly rng: PracticeRng;
  readonly level: Level;
}

/** The subset of the random source a template is allowed to use. */
export interface PracticeRng {
  float(): number;
  int(min: number, max: number): number;
  nonZero(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  bool(probability?: number): boolean;
  sign(): 1 | -1;
}

export interface Template {
  readonly id: string;
  readonly skillId: string;
  /** Short name shown in review lists, e.g. "Solve a linear equation". */
  readonly title: string;
  readonly levels: readonly Level[];
  readonly formats: readonly AnswerFormat[];
  build(context: TemplateContext): Draft;
}

export interface ChoiceAnswer {
  readonly kind: "choice";
  readonly choices: readonly RichText[];
  readonly correctIndex: number;
  /** Parallel to `choices`: the mistake behind each wrong option, if known. */
  readonly rationales: readonly (string | null)[];
}

export interface NumericAnswer {
  readonly kind: "numeric";
  readonly value: number;
  /** How the exact answer is typeset in the solution. */
  readonly display: RichText;
  readonly tolerance: number;
}

export type AnswerKey = ChoiceAnswer | NumericAnswer;

/** The four values that regenerate a question exactly. */
export interface QuestionRef {
  readonly templateId: string;
  readonly seed: number;
  readonly level: Level;
  readonly format: AnswerFormat;
}

export interface Question extends QuestionRef {
  readonly id: string;
  readonly skillId: string;
  readonly title: string;
  readonly stem: RichText;
  readonly table?: TableSpec;
  readonly answer: AnswerKey;
  readonly steps: readonly WorkedStep[];
  readonly hint?: RichText;
  readonly audit?: Audit;
  readonly insight?: string;
  /** The correct answer as a number, when it is one. */
  readonly numericValue?: number;
}

/** A student's response: a choice index, or the raw text they typed. */
export type Response =
  | { readonly kind: "choice"; readonly index: number }
  | { readonly kind: "numeric"; readonly text: string };

/* ------------------------------------------------------------------ */
/* Records                                                             */
/* ------------------------------------------------------------------ */

export type AttemptSource = "practice" | "diagnostic" | "mock" | "review";

export interface AttemptRecord extends QuestionRef {
  /** Epoch milliseconds. */
  readonly at: number;
  readonly skillId: string;
  readonly correct: boolean;
  /** Time spent on the question, in milliseconds. */
  readonly ms: number;
  readonly source: AttemptSource;
}

/** A missed question waiting in the review notebook. */
export interface ReviewCard extends QuestionRef {
  readonly skillId: string;
  /** Leitner box: 0 is "due now", higher boxes wait longer. */
  readonly box: number;
  readonly dueAt: number;
  readonly addedAt: number;
  readonly lapses: number;
}

/* ------------------------------------------------------------------ */
/* Ability and mastery                                                 */
/* ------------------------------------------------------------------ */

/** Three-parameter logistic item: discrimination, difficulty, guessing floor. */
export interface ItemParameters {
  readonly a: number;
  readonly b: number;
  readonly c: number;
}

export interface AbilityEstimate {
  /** Posterior mean on the logit ability scale. */
  readonly theta: number;
  /** Posterior standard deviation. */
  readonly sd: number;
  /** Effective number of responses behind the estimate (after recency decay). */
  readonly evidence: number;
}

export type MasteryBand = "unknown" | "needs-work" | "developing" | "proficient" | "strong";

export interface Mastery extends AbilityEstimate {
  /** Probability of answering a standard-level question correctly, 0–1. */
  readonly value: number;
  /** One posterior standard deviation either side of `value`. */
  readonly low: number;
  readonly high: number;
  readonly band: MasteryBand;
  readonly attempts: number;
  readonly correct: number;
  readonly lastAt: number | null;
}

export interface MasteryReport {
  readonly course: Mastery;
  readonly domains: Readonly<Record<string, Mastery>>;
  readonly skills: Readonly<Record<string, Mastery>>;
}

export interface TimelinePoint {
  /** Local calendar day, `YYYY-MM-DD`. */
  readonly day: string;
  readonly at: number;
  readonly course: number;
  readonly domains: Readonly<Record<string, number>>;
  readonly answered: number;
  readonly correct: number;
}

/* ------------------------------------------------------------------ */
/* Mock tests                                                          */
/* ------------------------------------------------------------------ */

export type MockKind = "full" | "quick";
export type ModuleRoute = "lower" | "higher";

export interface MockBlueprint {
  readonly kind: MockKind;
  readonly name: string;
  readonly questionsPerModule: number;
  readonly secondsPerModule: number;
  /** Questions per SAT domain in each module. */
  readonly domainQuota: Readonly<Record<string, number>>;
  /** Typed-answer questions per module. */
  readonly numericPerModule: number;
}

export interface MockItem extends QuestionRef {
  readonly skillId: string;
}

export interface MockResponse {
  readonly response: Response | null;
  readonly correct: boolean;
  readonly ms: number;
  readonly flagged: boolean;
}

export interface MockModuleResult {
  readonly items: readonly MockItem[];
  readonly responses: readonly MockResponse[];
  readonly secondsUsed: number;
}

export interface ScoreEstimate {
  /** Section score on the 200–800 scale, to the nearest 10. */
  readonly score: number;
  readonly low: number;
  readonly high: number;
  readonly theta: number;
  readonly sd: number;
}

export interface MockResult {
  readonly id: string;
  readonly kind: MockKind;
  readonly seed: number;
  readonly startedAt: number;
  readonly finishedAt: number;
  readonly route: ModuleRoute;
  readonly modules: readonly [MockModuleResult, MockModuleResult];
  readonly estimate: ScoreEstimate;
}

/** A mock test in progress, saved so a refresh does not lose it. */
export interface MockSession {
  readonly id: string;
  readonly kind: MockKind;
  readonly seed: number;
  readonly startedAt: number;
  /** 0 or 1. */
  readonly moduleIndex: number;
  readonly route: ModuleRoute | null;
  readonly modules: readonly (readonly MockItem[])[];
  /** Saved answers for each module, parallel to `modules`. */
  readonly answers: readonly (readonly (Response | null)[])[];
  readonly flags: readonly (readonly boolean[])[];
  readonly timeSpent: readonly (readonly number[])[];
  /** Seconds left in the current module when it was last saved. */
  readonly secondsLeft: number;
  readonly savedAt: number;
  /** Completed first module, kept until the test is scored. */
  readonly firstModule: MockModuleResult | null;
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

export interface DiagnosticRecord {
  readonly course: CourseId;
  readonly at: number;
  readonly answered: number;
  readonly correct: number;
}

export interface ProgressState {
  readonly version: 1;
  readonly createdAt: number;
  readonly course: CourseId;
  readonly attempts: readonly AttemptRecord[];
  readonly cards: readonly ReviewCard[];
  readonly mocks: readonly MockResult[];
  readonly diagnostics: readonly DiagnosticRecord[];
  readonly activeMock: MockSession | null;
  /** Cards that left the notebook because they were answered correctly enough times. */
  readonly resolved: number;
}
