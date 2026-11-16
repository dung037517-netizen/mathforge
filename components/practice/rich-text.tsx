"use client";

import * as React from "react";

import { Latex } from "@/components/math/latex";
import { parseRichText, type Block, type Inline } from "@/lib/practice/rich-text";
import { cn } from "@/lib/utils";

function renderInlines(inlines: readonly Inline[]): React.ReactNode {
  return inlines.map((inline, index) =>
    inline.kind === "math" ? (
      <Latex key={index}>{inline.tex}</Latex>
    ) : (
      <React.Fragment key={index}>{inline.text}</React.Fragment>
    ),
  );
}

export interface RichTextProps {
  /** Prose with `$inline$` and `$$display$$` maths. */
  readonly text: string;
  readonly className?: string;
  /**
   * Render everything in one line of flowing text, for places such as answer
   * choices where a block element would be invalid or would break the layout.
   */
  readonly inline?: boolean;
}

/** Typeset a rich-text string from the question bank. */
export function RichText({ text, className, inline = false }: RichTextProps) {
  const blocks: readonly Block[] = React.useMemo(() => parseRichText(text).blocks, [text]);

  if (inline) {
    return (
      <span className={className}>
        {blocks.map((block, index) => (
          <React.Fragment key={index}>
            {index > 0 ? " " : null}
            {block.kind === "display" ? <Latex>{block.tex}</Latex> : renderInlines(block.inlines)}
          </React.Fragment>
        ))}
      </span>
    );
  }

  return (
    <div className={cn("space-y-3 leading-relaxed", className)}>
      {blocks.map((block, index) =>
        block.kind === "display" ? (
          <Latex key={index} display className="py-1">
            {block.tex}
          </Latex>
        ) : (
          <p key={index}>{renderInlines(block.inlines)}</p>
        ),
      )}
    </div>
  );
}
