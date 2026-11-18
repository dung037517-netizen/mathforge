/**
 * Rich text: prose with `$inline$` and `$$display$$` maths.
 *
 * Question text is authored as plain strings so that templates stay readable
 * and serializable. This module turns such a string into blocks the renderer
 * can lay out, and reports malformed markup so the test suite can reject it
 * before a student ever sees a stray dollar sign.
 */

export type Inline =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "math"; readonly tex: string };

export type Block =
  | { readonly kind: "paragraph"; readonly inlines: readonly Inline[] }
  | { readonly kind: "display"; readonly tex: string };

export interface ParsedRichText {
  readonly blocks: readonly Block[];
  readonly errors: readonly string[];
}

/** Index of the closing delimiter, skipping backslash-escaped characters. */
function findClose(source: string, from: number, display: boolean): number {
  let index = from;
  while (index < source.length) {
    const character = source[index];
    if (character === "\\") {
      index += 2;
      continue;
    }
    if (character === "$") {
      if (!display) return index;
      if (source[index + 1] === "$") return index;
    }
    index += 1;
  }
  return -1;
}

function tidyInlines(inlines: readonly Inline[]): Inline[] {
  const merged: Inline[] = [];
  for (const inline of inlines) {
    const last = merged[merged.length - 1];
    if (inline.kind === "text" && last !== undefined && last.kind === "text") {
      merged[merged.length - 1] = { kind: "text", text: last.text + inline.text };
    } else {
      merged.push(inline);
    }
  }
  const collapsed = merged.map((inline) =>
    inline.kind === "text" ? { kind: "text" as const, text: inline.text.replace(/\s+/g, " ") } : inline,
  );
  const first = collapsed[0];
  if (first !== undefined && first.kind === "text") {
    collapsed[0] = { kind: "text", text: first.text.replace(/^\s+/, "") };
  }
  const lastIndex = collapsed.length - 1;
  const last = collapsed[lastIndex];
  if (last !== undefined && last.kind === "text") {
    collapsed[lastIndex] = { kind: "text", text: last.text.replace(/\s+$/, "") };
  }
  return collapsed.filter((inline) => inline.kind === "math" || inline.text.length > 0);
}

export function parseRichText(source: string): ParsedRichText {
  const blocks: Block[] = [];
  const errors: string[] = [];
  let inlines: Inline[] = [];
  let text = "";

  const flushText = (): void => {
    if (text.length > 0) {
      inlines.push({ kind: "text", text });
      text = "";
    }
  };
  const flushParagraph = (): void => {
    flushText();
    const tidied = tidyInlines(inlines);
    if (tidied.length > 0) blocks.push({ kind: "paragraph", inlines: tidied });
    inlines = [];
  };

  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (character === "\\" && source[index + 1] === "$") {
      text += "$";
      index += 2;
      continue;
    }
    if (character === "$") {
      const display = source[index + 1] === "$";
      const width = display ? 2 : 1;
      const close = findClose(source, index + width, display);
      if (close === -1) {
        errors.push(`Unclosed ${display ? "$$" : "$"} at offset ${index}.`);
        text += source.slice(index);
        break;
      }
      const tex = source.slice(index + width, close).trim();
      if (tex.length === 0) errors.push(`Empty maths at offset ${index}.`);
      if (display) {
        flushParagraph();
        blocks.push({ kind: "display", tex });
      } else {
        flushText();
        inlines.push({ kind: "math", tex });
      }
      index = close + width;
      continue;
    }
    if (character === "\n") {
      const blank = /^\n[ \t]*\n\s*/.exec(source.slice(index));
      if (blank !== null) {
        flushParagraph();
        index += blank[0].length;
        continue;
      }
      text += " ";
      index += 1;
      continue;
    }
    text += character;
    index += 1;
  }
  flushParagraph();
  return { blocks, errors };
}

/** Every LaTeX fragment in a rich-text string, with its display mode. */
export function mathFragments(source: string): { tex: string; display: boolean }[] {
  const fragments: { tex: string; display: boolean }[] = [];
  for (const block of parseRichText(source).blocks) {
    if (block.kind === "display") {
      fragments.push({ tex: block.tex, display: true });
    } else {
      for (const inline of block.inlines) {
        if (inline.kind === "math") fragments.push({ tex: inline.tex, display: false });
      }
    }
  }
  return fragments;
}

/** The prose of a rich-text string with the maths removed. */
export function proseOnly(source: string): string {
  const parts: string[] = [];
  for (const block of parseRichText(source).blocks) {
    if (block.kind !== "paragraph") continue;
    parts.push(
      block.inlines.map((inline) => (inline.kind === "text" ? inline.text : " ")).join(""),
    );
  }
  return parts.join("\n");
}
