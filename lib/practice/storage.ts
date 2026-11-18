/**
 * Saving progress in the browser.
 *
 * There are no accounts and no server: a student's history lives in their own
 * browser's localStorage and nowhere else. Anything read back is validated
 * field by field, because stored data outlives the code that wrote it and can
 * be edited by hand. A record that does not fit is dropped rather than trusted.
 */

import { isCourseId } from "@/lib/practice/taxonomy";
import type {
  AnswerFormat,
  AttemptRecord,
  AttemptSource,
  CourseId,
  DiagnosticRecord,
  Level,
  MockItem,
  MockModuleResult,
  MockResponse,
  MockResult,
  MockSession,
  ProgressState,
  Response,
  ReviewCard,
  ScoreEstimate,
} from "@/types/practice";

export const STORAGE_KEY = "mathforge:progress:v1";
export const MAX_ATTEMPTS = 6000;
export const MAX_MOCKS = 40;

type Dict = Record<string, unknown>;

function isDict(value: unknown): value is Dict {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isLevel(value: unknown): value is Level {
  return value === 1 || value === 2 || value === 3;
}

function isFormat(value: unknown): value is AnswerFormat {
  return value === "choice" || value === "numeric";
}

function isSource(value: unknown): value is AttemptSource {
  return value === "practice" || value === "diagnostic" || value === "mock" || value === "review";
}

function hasRef(value: Dict): boolean {
  return (
    typeof value.templateId === "string" &&
    value.templateId.length > 0 &&
    value.templateId.length < 80 &&
    isFiniteNumber(value.seed) &&
    isLevel(value.level) &&
    isFormat(value.format)
  );
}

function readAttempt(value: unknown): AttemptRecord | null {
  if (!isDict(value) || !hasRef(value)) return null;
  if (!isFiniteNumber(value.at) || typeof value.skillId !== "string") return null;
  if (typeof value.correct !== "boolean" || !isSource(value.source)) return null;
  return {
    templateId: value.templateId as string,
    seed: value.seed as number,
    level: value.level as Level,
    format: value.format as AnswerFormat,
    at: value.at,
    skillId: value.skillId,
    correct: value.correct,
    ms: isFiniteNumber(value.ms) ? Math.max(0, value.ms) : 0,
    source: value.source,
  };
}

function readCard(value: unknown): ReviewCard | null {
  if (!isDict(value) || !hasRef(value)) return null;
  if (typeof value.skillId !== "string" || !isFiniteNumber(value.dueAt)) return null;
  return {
    templateId: value.templateId as string,
    seed: value.seed as number,
    level: value.level as Level,
    format: value.format as AnswerFormat,
    skillId: value.skillId,
    box: isFiniteNumber(value.box) ? Math.min(8, Math.max(0, Math.round(value.box))) : 0,
    dueAt: value.dueAt,
    addedAt: isFiniteNumber(value.addedAt) ? value.addedAt : value.dueAt,
    lapses: isFiniteNumber(value.lapses) ? Math.max(0, Math.round(value.lapses)) : 0,
  };
}

function readResponse(value: unknown): Response | null {
  if (!isDict(value)) return null;
  if (value.kind === "choice" && isFiniteNumber(value.index)) return { kind: "choice", index: value.index };
  if (value.kind === "numeric" && typeof value.text === "string") {
    return { kind: "numeric", text: value.text.slice(0, 24) };
  }
  return null;
}

function readItem(value: unknown): MockItem | null {
  if (!isDict(value) || !hasRef(value) || typeof value.skillId !== "string") return null;
  return {
    templateId: value.templateId as string,
    seed: value.seed as number,
    level: value.level as Level,
    format: value.format as AnswerFormat,
    skillId: value.skillId,
  };
}

function readItems(value: unknown): MockItem[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 60) return null;
  const items = value.map(readItem);
  return items.every((item): item is MockItem => item !== null) ? items : null;
}

function readModuleResult(value: unknown): MockModuleResult | null {
  if (!isDict(value)) return null;
  const items = readItems(value.items);
  if (items === null || !Array.isArray(value.responses) || value.responses.length !== items.length) return null;
  const responses: MockResponse[] = [];
  for (const entry of value.responses) {
    if (!isDict(entry) || typeof entry.correct !== "boolean") return null;
    responses.push({
      response: entry.response === null ? null : readResponse(entry.response),
      correct: entry.correct,
      ms: isFiniteNumber(entry.ms) ? Math.max(0, entry.ms) : 0,
      flagged: entry.flagged === true,
    });
  }
  return { items, responses, secondsUsed: isFiniteNumber(value.secondsUsed) ? Math.max(0, value.secondsUsed) : 0 };
}

function readEstimate(value: unknown): ScoreEstimate | null {
  if (!isDict(value)) return null;
  const { score, low, high, theta, sd } = value;
  if (![score, low, high, theta, sd].every(isFiniteNumber)) return null;
  return { score: score as number, low: low as number, high: high as number, theta: theta as number, sd: sd as number };
}

function readMock(value: unknown): MockResult | null {
  if (!isDict(value) || typeof value.id !== "string") return null;
  if (value.kind !== "full" && value.kind !== "quick") return null;
  if (value.route !== "lower" && value.route !== "higher") return null;
  if (!Array.isArray(value.modules) || value.modules.length !== 2) return null;
  const first = readModuleResult(value.modules[0]);
  const second = readModuleResult(value.modules[1]);
  const estimate = readEstimate(value.estimate);
  if (first === null || second === null || estimate === null) return null;
  if (!isFiniteNumber(value.seed) || !isFiniteNumber(value.startedAt) || !isFiniteNumber(value.finishedAt)) return null;
  return {
    id: value.id,
    kind: value.kind,
    seed: value.seed,
    startedAt: value.startedAt,
    finishedAt: value.finishedAt,
    route: value.route,
    modules: [first, second],
    estimate,
  };
}

function readGrid<T>(value: unknown, lengths: readonly number[], read: (cell: unknown) => T): T[][] | null {
  if (!Array.isArray(value) || value.length !== lengths.length) return null;
  const grid: T[][] = [];
  for (let index = 0; index < lengths.length; index += 1) {
    const row: unknown = value[index];
    if (!Array.isArray(row) || row.length !== lengths[index]) return null;
    grid.push(row.map(read));
  }
  return grid;
}

function readSession(value: unknown): MockSession | null {
  if (!isDict(value) || typeof value.id !== "string") return null;
  if (value.kind !== "full" && value.kind !== "quick") return null;
  if (value.moduleIndex !== 0 && value.moduleIndex !== 1) return null;
  if (!Array.isArray(value.modules) || value.modules.length !== value.moduleIndex + 1) return null;
  const modules: MockItem[][] = [];
  for (const entry of value.modules) {
    const items = readItems(entry);
    if (items === null) return null;
    modules.push(items);
  }
  const lengths = modules.map((module) => module.length);
  const answers = readGrid(value.answers, lengths, (cell) => (cell === null ? null : readResponse(cell)));
  const flags = readGrid(value.flags, lengths, (cell) => cell === true);
  const timeSpent = readGrid(value.timeSpent, lengths, (cell) => (isFiniteNumber(cell) ? Math.max(0, cell) : 0));
  if (answers === null || flags === null || timeSpent === null) return null;
  const firstModule = value.moduleIndex === 1 ? readModuleResult(value.firstModule) : null;
  const route = value.route === "lower" || value.route === "higher" ? value.route : null;
  if (value.moduleIndex === 1 && (firstModule === null || route === null)) return null;
  if (!isFiniteNumber(value.seed) || !isFiniteNumber(value.startedAt) || !isFiniteNumber(value.secondsLeft)) return null;
  return {
    id: value.id,
    kind: value.kind,
    seed: value.seed,
    startedAt: value.startedAt,
    moduleIndex: value.moduleIndex,
    route,
    modules,
    answers,
    flags,
    timeSpent,
    secondsLeft: Math.max(0, value.secondsLeft),
    savedAt: isFiniteNumber(value.savedAt) ? value.savedAt : value.startedAt,
    firstModule,
  };
}

function readDiagnostic(value: unknown): DiagnosticRecord | null {
  if (!isDict(value) || !isCourseId(value.course)) return null;
  if (!isFiniteNumber(value.at) || !isFiniteNumber(value.answered) || !isFiniteNumber(value.correct)) return null;
  return { course: value.course, at: value.at, answered: value.answered, correct: value.correct };
}

function readList<T>(value: unknown, read: (entry: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  const list: T[] = [];
  for (const entry of value) {
    const parsed = read(entry);
    if (parsed !== null) list.push(parsed);
  }
  return list;
}

export function emptyProgress(now: number, course: CourseId = "sat"): ProgressState {
  return {
    version: 1,
    createdAt: now,
    course,
    attempts: [],
    cards: [],
    mocks: [],
    diagnostics: [],
    activeMock: null,
    resolved: 0,
  };
}

/** Rebuild a trustworthy state from untrusted data, or null if it is not ours. */
export function sanitizeProgress(value: unknown, now: number): ProgressState | null {
  if (!isDict(value) || value.version !== 1) return null;
  return {
    version: 1,
    createdAt: isFiniteNumber(value.createdAt) ? value.createdAt : now,
    course: isCourseId(value.course) ? value.course : "sat",
    attempts: readList(value.attempts, readAttempt).slice(-MAX_ATTEMPTS),
    cards: readList(value.cards, readCard),
    mocks: readList(value.mocks, readMock).slice(-MAX_MOCKS),
    diagnostics: readList(value.diagnostics, readDiagnostic).slice(-60),
    activeMock: readSession(value.activeMock),
    resolved: isFiniteNumber(value.resolved) ? Math.max(0, Math.round(value.resolved)) : 0,
  };
}

/** The subset of the Web Storage API this module needs. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function loadProgress(store: KeyValueStore | null, now: number): ProgressState {
  if (store === null) return emptyProgress(now);
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (raw === null) return emptyProgress(now);
    return sanitizeProgress(JSON.parse(raw) as unknown, now) ?? emptyProgress(now);
  } catch {
    return emptyProgress(now);
  }
}

/** Returns false when the browser refused the write (private mode, full quota). */
export function saveProgress(store: KeyValueStore | null, state: ProgressState): boolean {
  if (store === null) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearProgress(store: KeyValueStore | null): void {
  try {
    store?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

interface ExportEnvelope {
  readonly app: "mathforge";
  readonly version: 1;
  readonly exportedAt: string;
  readonly data: ProgressState;
}

export function exportProgress(state: ProgressState, now: number): string {
  const envelope: ExportEnvelope = {
    app: "mathforge",
    version: 1,
    exportedAt: new Date(now).toISOString(),
    data: state,
  };
  return JSON.stringify(envelope, null, 2);
}

export type ImportResult =
  | { readonly ok: true; readonly state: ProgressState }
  | { readonly ok: false; readonly error: string };

export function importProgress(text: string, now: number): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }
  if (!isDict(parsed) || parsed.app !== "mathforge") {
    return { ok: false, error: "That file was not exported from MathForge." };
  }
  const state = sanitizeProgress(parsed.data, now);
  if (state === null) return { ok: false, error: "That backup uses a format this version cannot read." };
  return { ok: true, state };
}
