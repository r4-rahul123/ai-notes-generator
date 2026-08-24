/**
 * mathPrerender.ts
 *
 * Pre-renders LaTeX math to KaTeX HTML BEFORE passing to ReactMarkdown.
 * This completely bypasses the remark-math vs remark-gfm conflict (pipe `|`
 * inside math blocks being parsed as table separators, etc.).
 *
 * Usage:
 *   import { processMathMarkdown } from '@/lib/mathPrerender';
 *   // Pass result to ReactMarkdown with rehype-raw plugin.
 */

import katex from "katex";

/**
 * Normalizes various LaTeX notation forms into $...$ / $$...$$
 */
export function normalizeLatex(text: string): string {
  if (!text) return "";
  let clean = text;

  // Fix literal \n strings stored as \\n in JSON
  clean = clean.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");

  // Unescape \$ -> $
  clean = clean.replace(/\\\$/g, "$");

  // Double-escaped \\( \\) \\[ \\] from JSON
  clean = clean.replace(/\\\\([[(])([\s\S]*?)\\\\([\])])/g, (_, open, content, close) => {
    if (open === "[" && close === "]") return `\n\n$$${content.trim()}$$\n\n`;
    if (open === "(" && close === ")") return `$${content.trim()}$`;
    return _;
  });

  // Single-escaped \[ ... \] -> $$ ... $$
  clean = clean.replace(/\\\[([\s\S]*?)\\\]/g, (_, p1) => `\n\n$$${p1.trim()}$$\n\n`);

  // Single-escaped \( ... \) -> $ ... $
  clean = clean.replace(/\\\(([\s\S]*?)\\\)/g, (_, p1) => `$${p1.trim()}$`);

  // Backtick-wrapped LaTeX on its own line -> display math
  clean = clean.replace(/(?:^|\n)\s*`([^`\n]*?\\[a-zA-Z]+[^`\n]*?)`\s*(?:\n|$)/g, (_, p1) => `\n\n$$${p1.trim()}$$\n\n`);

  // Inline backtick-wrapped LaTeX -> inline math
  clean = clean.replace(/`([^`\n]*?\\[a-zA-Z]+[^`\n]*?)`/g, (_, p1) => `$${p1.trim()}$`);

  // Fix unclosed $ signs per line
  const lines = clean.split("\n");
  clean = lines.map((line) => {
    if (line.trim().startsWith("$$")) return line;
    let count = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === "$") {
        if (line[i + 1] === "$") { i++; }
        else { count++; }
      }
    }
    return count % 2 !== 0 ? line + "$" : line;
  }).join("\n");

  // Fix squished table rows
  clean = clean.replace(/\|\s*\|\s*([:-]+)/g, "|\n| $1");
  clean = clean.replace(/\|\s*\|\s*([^\s|])/g, "|\n| $1");

  return clean;
}

/**
 * Pre-renders all $$ ... $$ and $ ... $ math to KaTeX HTML.
 * Uses output:"html" (no MathML) to keep output simple for rehype-raw.
 */
export function preRenderMath(text: string): string {
  if (!text) return "";
  let result = text;

  // Step 1: Display math $$ ... $$ (MUST be before inline math)
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    const cleaned = math.trim();
    if (!cleaned) return "";
    try {
      const html = katex.renderToString(cleaned, {
        displayMode: true,
        throwOnError: false,
        strict: false,
        trust: true,
        output: "html",
      });
      return `\n\n<div class="katex-display-block overflow-x-auto my-4 py-2 text-center">${html}</div>\n\n`;
    } catch {
      return `\n\n\`\`\`\n${cleaned}\n\`\`\`\n\n`;
    }
  });

  // Step 2: Inline math $ ... $ (display math already replaced above)
  result = result.replace(/\$([^$\n]+?)\$/g, (match, math) => {
    const trimmed = math.trim();
    // Skip likely non-LaTeX (e.g. prices like $100, $USD)
    if (!trimmed || !/[\\^_{]|[a-zA-Z]{2,}/.test(trimmed)) return match;
    try {
      const html = katex.renderToString(trimmed, {
        displayMode: false,
        throwOnError: false,
        strict: false,
        output: "html",
      });
      return html;
    } catch {
      return match;
    }
  });

  return result;
}

/**
 * Full pipeline: normalize LaTeX notation → pre-render to KaTeX HTML
 * Ready for ReactMarkdown + rehype-raw
 */
export function processMathMarkdown(text: string): string {
  return preRenderMath(normalizeLatex(text));
}
