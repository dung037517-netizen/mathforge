/**
 * Independent verification of an answer key.
 *
 * A template states, in plain infix, a fact its answer must satisfy. This
 * module checks that fact with the hand-written expression engine — a code
 * path that shares nothing with the arithmetic the template used to pick its
 * numbers. The test suite runs it over thousands of generated questions.
 */

import { compile, evaluateExpression, integrateNumeric, numericDerivative, parse } from "@/lib/math-engine";
import type { Audit } from "@/types/practice";

export interface AuditOutcome {
  readonly ok: boolean;
  /** What the engine computed, when the audit yields a single number. */
  readonly computed: number | null;
  readonly detail: string;
}

function close(actual: number, expected: number, relative: number): boolean {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
  return Math.abs(actual - expected) <= relative * Math.max(1, Math.abs(expected));
}

function outcome(ok: boolean, computed: number | null, detail: string): AuditOutcome {
  return { ok, computed, detail };
}

/** Estimate a limit from both sides (or far out, for a limit at infinity). */
function estimateLimit(fn: (x: number) => number, at: number): number {
  if (!Number.isFinite(at)) {
    const direction = at > 0 ? 1 : -1;
    return fn(direction * 1e7);
  }
  const h = 1e-4 * Math.max(1, Math.abs(at));
  return (fn(at + h) + fn(at - h)) / 2;
}

export function checkAudit(audit: Audit, answer: number): AuditOutcome {
  if (audit.kind === "value") {
    const result = evaluateExpression(audit.expression);
    if (!result.ok) return outcome(false, null, result.error.message);
    return outcome(
      close(result.value, answer, 1e-7),
      result.value,
      `${audit.expression} = ${result.value}`,
    );
  }

  if (audit.kind === "root") {
    const result = evaluateExpression(audit.expression, { [audit.variable]: answer });
    if (!result.ok) return outcome(false, null, result.error.message);
    return outcome(
      Math.abs(result.value) <= 1e-6 * Math.max(1, Math.abs(answer)),
      null,
      `${audit.expression} at ${audit.variable} = ${answer} is ${result.value}`,
    );
  }

  const ast = parse(audit.expression);
  if (!ast.ok) return outcome(false, null, ast.error.message);
  const fn = compile(ast.value, audit.variable);

  if (audit.kind === "derivative") {
    const computed = numericDerivative(fn, audit.at, 1e-5);
    return outcome(close(computed, answer, 1e-5), computed, `d/d${audit.variable} at ${audit.at} = ${computed}`);
  }
  if (audit.kind === "integral") {
    const computed = integrateNumeric(fn, audit.lower, audit.upper, 1e-11);
    return outcome(close(computed, answer, 1e-6), computed, `integral = ${computed}`);
  }
  const computed = estimateLimit(fn, audit.at);
  return outcome(close(computed, answer, 1e-4), computed, `limit = ${computed}`);
}
