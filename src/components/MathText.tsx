"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { prepareMarkdown } from "@/lib/prepareMarkdown";

interface MathTextProps {
  children: string;
  className?: string;
}

/**
 * Renders a short string that may contain LaTeX math expressions
 * ($...$, $$...$$, \(...\), \[...\]).
 *
 * Safe to embed inside any HTML element (p, h4, span, button, …) because it
 * never introduces extra block-level wrappers — the default <p> that
 * react-markdown would normally emit is replaced with an inline <span>.
 *
 * KaTeX itself only emits <span> elements, so the output is always inline-safe.
 */
export default function MathText({ children, className }: MathTextProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false, output: "html" }]]}
      components={{
        // Replace the block-level <p> wrapper with an inline <span> so this
        // component is safe inside headings, table cells, buttons, etc.
        p: ({ children: c }) => <span className={className}>{c}</span>,
      }}
    >
      {prepareMarkdown(children ?? "")}
    </ReactMarkdown>
  );
}
