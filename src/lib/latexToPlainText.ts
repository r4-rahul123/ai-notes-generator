// src/lib/latexToPlainText.ts

const PIPE_PLACEHOLDER = "___PIPE_PLACEHOLDER___";
const BRACE_OPEN_PLACEHOLDER = "___BRACE_OPEN___";
const BRACE_CLOSE_PLACEHOLDER = "___BRACE_CLOSE___";

/** Restores pipe placeholders back into literal "|" characters. Call this on
 * any text that isn't going through the jsPDF table-row "|" splitter. */
export function restorePipes(text: string): string {
  if (!text) return "";
  return text.replace(new RegExp(PIPE_PLACEHOLDER, "g"), "|");
}

/**
 * We used to try to aggressively convert LaTeX into ASCII plain-text, but
 * this produces very ugly results for advanced math (e.g. "subset-eq").
 * Now we just leave it as raw LaTeX, which is highly readable for STEM users,
 * while ONLY protecting "|" characters so they don't break markdown table parsing.
 */
function protectLatexPipes(math: string): string {
  let m = math;
  // Protect \{ and \}
  m = m.replace(/\\\{/g, BRACE_OPEN_PLACEHOLDER);
  m = m.replace(/\\\}/g, BRACE_CLOSE_PLACEHOLDER);
  
  // Protect literal | and \| and \vert
  m = m.replace(/\\\|/g, PIPE_PLACEHOLDER);
  m = m.replace(/\\vert/g, PIPE_PLACEHOLDER);
  m = m.replace(/\\Vert/g, `${PIPE_PLACEHOLDER}${PIPE_PLACEHOLDER}`);
  m = m.replace(/\|/g, PIPE_PLACEHOLDER);

  // Restore braces
  m = m.replace(new RegExp(BRACE_OPEN_PLACEHOLDER, "g"), "\\{");
  m = m.replace(new RegExp(BRACE_CLOSE_PLACEHOLDER, "g"), "\\}");

  return m;
}

/**
 * Scans arbitrary note text for LaTeX math regions ( \(..\), \[..\], $$..$$, $..$ )
 * and protects their pipe characters. Leaves LaTeX math completely raw so it looks
 * readable in the PDF.
 */
export function convertMathInText(text: string): string {
  if (!text) return "";
  let out = text;

  // Double-escaped from inconsistent AI JSON escaping: \\[ ... \\] / \\( ... \\)
  out = out.replace(/\\\\([[(])([\s\S]*?)\\\\([\])])/g, (full, open, inner, close) => {
    const converted = protectLatexPipes(inner);
    if (open === "[" && close === "]") return `\n${converted}\n`;
    if (open === "(" && close === ")") return converted;
    return full;
  });

  // Display math: $$ ... $$
  out = out.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => `\n${protectLatexPipes(inner)}\n`);
  
  // Display math: \[ ... \]
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `\n${protectLatexPipes(inner)}\n`);
  
  // Inline math: \( ... \)
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => protectLatexPipes(inner));
  
  // Inline math: $ ... $ (avoid matching lone currency like "$5")
  out = out.replace(/(^|[^\\$])\$([^$\n]+?)\$/g, (_, before, inner) => `${before}${protectLatexPipes(inner)}`);

  return out;
}
