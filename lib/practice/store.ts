/**
 * The one place progress is read and written.
 *
 * A tiny external store: components subscribe through `useSyncExternalStore`,
 * actions replace the state immutably and persist it. The server snapshot is
 * always the empty state, so the first client render matches the server and
 * the student's saved history arrives a moment later without a hydration
 * mismatch.
 */

import { finishMock } from "@/lib/practice/mock";
import { isAnswered, isCorrect } from "@/lib/practice/question";
import { addMiss, gradeCard } from "@/lib/practice/review";
import {
  clearProgress,
  emptyProgress,
  loadProgress,
  MAX_ATTEMPTS,
  MAX_MOCKS,
  saveProgress,
  STORAGE_KEY,
  type KeyValueStore,
} from "@/lib/practice/storage";
import type {
  AttemptRecord,
  AttemptSource,
  CourseId,
  MockResult,
  MockSession,
  ProgressState,
  Question,
  Response,
} from "@/types/practice";

export interface ProgressSnapshot {
  readonly state: ProgressState;
  /** False until the saved history has been read on the client. */
  readonly hydrated: boolean;
  /** True while the simulated sample student is being shown. */
  readonly demo: boolean;
  /** False if the browser refused the last write. */
  readonly persisted: boolean;
}

const SERVER_SNAPSHOT: ProgressSnapshot = {
  state: emptyProgress(0),
  hydrated: false,
  demo: false,
  persisted: true,
};

let snapshot: ProgressSnapshot = SERVER_SNAPSHOT;
/** The student's real state, kept aside while the sample student is shown. */
let stashed: ProgressState | null = null;
const listeners = new Set<() => void>();

function storage(): KeyValueStore | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

function commit(state: ProgressState): void {
  const persisted = snapshot.demo ? snapshot.persisted : saveProgress(storage(), state);
  snapshot = { ...snapshot, state, persisted };
  emit();
}

function hydrate(): void {
  if (snapshot.hydrated) return;
  snapshot = { state: loadProgress(storage(), Date.now()), hydrated: true, demo: false, persisted: true };
}

function onStorage(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY || snapshot.demo) return;
  snapshot = { ...snapshot, state: loadProgress(storage(), Date.now()) };
  emit();
}

export interface RecordInput {
  readonly question: Question;
  readonly response: Response | null;
  readonly ms: number;
  readonly source: AttemptSource;
  /** When reviewing, the notebook card this answer should be graded against. */
  readonly cardKey?: string;
  readonly at?: number;
}

export interface RecordOutcome {
  readonly correct: boolean;
  /** True if this answer cleared a card from the notebook. */
  readonly resolved: boolean;
}

function toAttempt(question: Question, correct: boolean, ms: number, source: AttemptSource, at: number): AttemptRecord {
  return {
    templateId: question.templateId,
    seed: question.seed,
    level: question.level,
    format: question.format,
    skillId: question.skillId,
    at,
    correct,
    ms: Math.max(0, Math.round(ms)),
    source,
  };
}

export const progressStore = {
  subscribe(listener: () => void): () => void {
    if (listeners.size === 0 && typeof window !== "undefined") {
      hydrate();
      window.addEventListener("storage", onStorage);
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && typeof window !== "undefined") {
        window.removeEventListener("storage", onStorage);
      }
    };
  },

  getSnapshot(): ProgressSnapshot {
    return snapshot;
  },

  getServerSnapshot(): ProgressSnapshot {
    return SERVER_SNAPSHOT;
  },

  setCourse(course: CourseId): void {
    if (snapshot.state.course === course) return;
    commit({ ...snapshot.state, course });
  },

  /** Grade a response, log it, and file or update the notebook card. */
  record(input: RecordInput): RecordOutcome {
    const at = input.at ?? Date.now();
    const state = snapshot.state;
    const correct = isCorrect(input.question, input.response);
    const attempt = toAttempt(input.question, correct, input.ms, input.source, at);
    let cards = state.cards;
    let resolved = false;
    if (input.cardKey !== undefined) {
      const outcome = gradeCard(cards, input.cardKey, correct, at);
      cards = outcome.cards;
      resolved = outcome.resolved;
    } else if (!correct) {
      cards = addMiss(cards, attempt, at);
    }
    commit({
      ...state,
      attempts: [...state.attempts, attempt].slice(-MAX_ATTEMPTS),
      cards,
      resolved: state.resolved + (resolved ? 1 : 0),
    });
    return { correct, resolved };
  },

  recordDiagnostic(course: CourseId, answered: number, correct: number): void {
    const state = snapshot.state;
    commit({
      ...state,
      diagnostics: [...state.diagnostics, { course, at: Date.now(), answered, correct }].slice(-60),
    });
  },

  saveMock(session: MockSession | null): void {
    commit({ ...snapshot.state, activeMock: session });
  },

  /**
   * Score a finished mock test, log every question as an attempt and file the
   * misses in the notebook. Returns the result, or null if the session was
   * not ready to be scored.
   */
  completeMock(session: MockSession): MockResult | null {
    const now = Date.now();
    const result = finishMock(session, now);
    if (result === null) return null;
    const state = snapshot.state;
    const attempts: AttemptRecord[] = [];
    let cards = state.cards;
    for (const part of result.modules) {
      part.items.forEach((item, index) => {
        const response = part.responses[index];
        const attempt: AttemptRecord = {
          ...item,
          at: now,
          correct: response?.correct ?? false,
          ms: Math.round(response?.ms ?? 0),
          source: "mock",
        };
        attempts.push(attempt);
        if (!attempt.correct) cards = addMiss(cards, attempt, now);
      });
    }
    commit({
      ...state,
      attempts: [...state.attempts, ...attempts].slice(-MAX_ATTEMPTS),
      cards,
      mocks: [...state.mocks, result].slice(-MAX_MOCKS),
      activeMock: null,
    });
    return result;
  },

  /** Replace everything with an imported backup. */
  replace(state: ProgressState): void {
    stashed = null;
    snapshot = { ...snapshot, demo: false };
    commit(state);
  },

  reset(): void {
    stashed = null;
    clearProgress(storage());
    snapshot = { state: emptyProgress(Date.now(), snapshot.state.course), hydrated: true, demo: false, persisted: true };
    emit();
  },

  /** Show a simulated student without touching what is saved. */
  enterDemo(state: ProgressState): void {
    if (!snapshot.demo) stashed = snapshot.state;
    snapshot = { ...snapshot, state, demo: true };
    emit();
  },

  exitDemo(): void {
    if (!snapshot.demo) return;
    snapshot = { ...snapshot, state: stashed ?? loadProgress(storage(), Date.now()), demo: false };
    stashed = null;
    emit();
  },
};

/** True when a response would be recorded as an attempt (not left blank). */
export function wasAttempted(response: Response | null): boolean {
  return isAnswered(response);
}
