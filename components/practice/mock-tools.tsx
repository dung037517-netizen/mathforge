"use client";

import * as React from "react";

import { Latex } from "@/components/math/latex";
import { Modal } from "@/components/practice/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { evaluateExpression } from "@/lib/math-engine";
import { formatNumber } from "@/lib/utils";

const REFERENCE: readonly { readonly title: string; readonly formulas: readonly string[] }[] = [
  {
    title: "Circle",
    formulas: ["A = \\pi r^2", "C = 2\\pi r"],
  },
  {
    title: "Rectangle and triangle",
    formulas: ["A = \\ell w", "A = \\tfrac{1}{2}bh", "c^2 = a^2 + b^2"],
  },
  {
    title: "Special right triangles",
    formulas: ["30^\\circ\\text{-}60^\\circ\\text{-}90^\\circ:\\ x,\\ x\\sqrt{3},\\ 2x", "45^\\circ\\text{-}45^\\circ\\text{-}90^\\circ:\\ s,\\ s,\\ s\\sqrt{2}"],
  },
  {
    title: "Volume",
    formulas: [
      "V = \\ell wh",
      "V = \\pi r^2 h",
      "V = \\tfrac{4}{3}\\pi r^3",
      "V = \\tfrac{1}{3}\\pi r^2 h",
      "V = \\tfrac{1}{3}\\ell wh",
    ],
  },
];

export function ReferenceSheet({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Reference sheet">
      <div className="grid gap-5 sm:grid-cols-2">
        {REFERENCE.map((group) => (
          <section key={group.title}>
            <h3 className="mb-2 text-sm font-medium">{group.title}</h3>
            <ul className="space-y-1.5 text-sm">
              {group.formulas.map((formula) => (
                <li key={formula}>
                  <Latex>{formula}</Latex>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <ul className="mt-5 space-y-1 border-t border-border pt-4 text-sm text-muted-foreground">
        <li>The number of degrees of arc in a circle is 360.</li>
        <li>
          The number of radians of arc in a circle is <Latex>{"2\\pi"}</Latex>.
        </li>
        <li>The sum of the measures of the angles of a triangle is 180 degrees.</li>
      </ul>
    </Modal>
  );
}

interface Line {
  readonly input: string;
  readonly output: string;
  readonly ok: boolean;
}

/** A small calculator backed by the site's own expression engine. */
export function Calculator({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  const [input, setInput] = React.useState("");
  const [lines, setLines] = React.useState<readonly Line[]>([]);

  const run = (): void => {
    const source = input.trim();
    if (source.length === 0) return;
    const result = evaluateExpression(source);
    const line: Line = result.ok
      ? { input: source, output: formatNumber(result.value, 8), ok: Number.isFinite(result.value) }
      : { input: source, output: result.error.message, ok: false };
    setLines((current) => [line, ...current].slice(0, 6));
    if (result.ok) setInput("");
  };

  return (
    <Modal open={open} onClose={onClose} title="Calculator">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          run();
        }}
      >
        <label htmlFor="calculator-input" className="sr-only">
          Expression
        </label>
        <Input
          id="calculator-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="e.g. (3^2 + 4^2)^0.5"
          autoComplete="off"
          spellCheck={false}
          className="numeric"
        />
        <Button type="submit">=</Button>
      </form>
      <p className="mt-2 text-xs text-muted-foreground">
        Supports + − × ÷ ^, parentheses, sqrt, abs, ln, log10, exp, sin, cos, tan (in radians), pi and e.
      </p>
      <ol className="mt-4 space-y-2" aria-live="polite">
        {lines.map((line, index) => (
          <li key={`${line.input}-${index}`} className="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm">
            <span className="numeric text-muted-foreground">{line.input}</span>
            <span className={line.ok ? "numeric block font-medium" : "block text-destructive"}>
              {line.ok ? `= ${line.output}` : line.output}
            </span>
          </li>
        ))}
      </ol>
    </Modal>
  );
}
