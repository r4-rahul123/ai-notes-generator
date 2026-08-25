export function prepareMarkdown(text: string): string {
  if (!text) return "";
  let clean = text;

  // 2. Unescape \$ -> $
  clean = clean.replace(/\\\$/g, "$");

  // Helper to safely format math content by replacing | with \vert
  // to prevent remark-gfm from misinterpreting them as markdown tables.
  // Also fixes KaTeX parse errors for unbraced macro superscripts (e.g. ^\dagger -> ^{\dagger})
  const safeMath = (math: string) => {
    // Replace | and \| with \vert to prevent table breaks and fix KaTeX double-backslash newline errors.
    let m = math.replace(/\\?\|/g, "\\vert ");
    // Normalize double-escaped macros the AI sometimes mixes into otherwise
    // single-escaped formulas (e.g. "\\hbar" -> "\hbar"). A literal "\\"
    // immediately followed by letters is always an escaping artifact — a real
    // KaTeX linebreak "\\" is followed by whitespace or "[...]", never letters.
    m = m.replace(/\\\\([a-zA-Z]+)/g, "\\$1");
    // Only auto-brace UNBRACED macro superscripts/subscripts.
    // e.g.  ^\dagger -> ^{\dagger}   but  ^{\dagger} stays unchanged.
    // The negative lookahead (?!\{) prevents double-wrapping already-braced macros.
    m = m.replace(/(\^|_)\\([a-zA-Z]+)(?!\{)/g, "$1{\\$2}");
    // Collapse newlines — remark-math cannot parse "$$...$$" spans containing
    // line breaks, and a broken span swallows the rest of the paragraph.
    m = m.replace(/\s*\n\s*/g, " ");
    return m;
  };

  // 3. Handle double-escaped \\( \\) and \\[ \\] from JSON (well-formed pairs only;
  //    anything mismatched falls through to the repair pass below)
  clean = clean.replace(/\\\\([[(])([\s\S]*?)\\\\([\])])/g, (_, open, content, close) => {
    if (open === "[" && close === "]") return `\n\n$$${safeMath(content).trim()}$$\n\n`;
    if (open === "(" && close === ")") return `$${safeMath(content).trim()}$`;
    return _;
  });

  // 4. Repair + normalize ALL remaining math delimiters with a stack-based pass.
  //    LLMs sometimes emit MISMATCHED delimiters (e.g. "\\(\\lambda_i$ for ..." — opened
  //    with \\( but closed with $). The old lazy regexes then paired the first \\( with a
  //    LATER \\), swallowing prose into math spans and leaving raw LaTeX on the page.
  //    This pass pairs every opener with the very next closer and:
  //      - matched pairs  -> normalized to $...$ / $$...$$ (safeMath applied)
  //      - mismatched pair -> repaired the same way, but ONLY if the content
  //        actually looks like LaTeX (protects prose, prices like "$5 and $10")
  //      - orphan closers / unclosed openers -> left untouched as plain text
  clean = repairMathDelimiters(clean, safeMath);

  // 5. Backtick-wrapped LaTeX on its own line -> display math
  clean = clean.replace(/(?:^|\n)\s*`([^`\n]*?\\[a-zA-Z]+[^`\n]*?)`\s*(?:\n|$)/g, (_, p1) => `\n\n$$${safeMath(p1).trim()}$$\n\n`);

  // 6. Inline backtick-wrapped LaTeX -> inline math
  clean = clean.replace(/`([^`\n]*?\\[a-zA-Z]+[^`\n]*?)`/g, (_, p1) => `$${safeMath(p1).trim()}$`);

  // 6.5. Wrap bare \begin{env}...\end{env} blocks that the AI emitted without
  //       surrounding $$ or \[...\] delimiters.  We only target the KaTeX
  //       environments that make sense as standalone display math.
  //       The negative lookbehind prevents double-wrapping when the environment
  //       is already inside $$...$$ written by the AI.
  const mathEnvPattern =
    "align|aligned|equation|gather|gathered|" +
    "array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|" +
    "cases|multline|split|eqnarray";
  clean = clean.replace(
    new RegExp(
      `(?<!\\$\\$\\s*)(\\\\begin\\{(?:${mathEnvPattern})[*]?\\}[\\s\\S]*?\\\\end\\{(?:${mathEnvPattern})[*]?\\})(?!\\s*\\$\\$)`,
      "g"
    ),
    (match) => `\n\n$$${safeMath(match.trim())}$$\n\n`
  );

  // 7. Fix squished table rows which remark-gfm hates
  clean = clean.replace(/\|\s*\|\s*([:-]+)/g, "|\n| $1");
  clean = clean.replace(/\|\s*\|\s*([^\s|])/g, "|\n| $1");

  // 8. Format squished bullet points (literal • characters) into proper markdown lists
  // Some AI generations output a single paragraph with • instead of proper markdown lists.
  clean = clean.replace(/(?:^|\s)•\s+/g, "\n\n- ");

  return clean;
}

/**
 * Heuristic: does this string look like LaTeX/math content rather than plain prose?
 * Used ONLY to decide whether a MISMATCHED delimiter pair should be repaired into
 * real math or left as literal text.
 */
function looksLikeMath(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (/\\[a-zA-Z]+/.test(t)) return true; // LaTeX command e.g. \lambda, \frac
  if (/[\^_{}=<>|≤≥≠≈±∑∏∫√⟨⟩]/.test(t)) return true; // math punctuation / operators
  if (!/\s/.test(t)) return true; // compact token e.g. f(x), n+1, mc^2
  if (/^[a-zA-Z0-9\s+\-*/().,']+$/.test(t) && /[+\-*/]/.test(t)) return true; // simple spaced expr e.g. a + b
  return false;
}

/**
 * Stack-based math delimiter repair. Scans the text once, pairing every opener
 * ($, $$, \(, \[) with the NEXT closer ($, $$, \), \]) and re-emitting each span
 * with canonical $...$ / $$...$$ delimiters. Mismatched pairs (the LLM glitch
 * that produced raw LaTeX on the page) are repaired when the enclosed content
 * looks like math, otherwise the original text is preserved verbatim.
 */
function repairMathDelimiters(text: string, safeMath: (m: string) => string): string {
  const delimRe = /\$\$|\\\[|\\\]|\\\(|\\\)|\$/g;
  const isDisplayOp = (op: string) => op === "$$" || op === "\\[";
  const expectedCloser = (op: string) => (op === "\\(" ? "\\)" : op === "\\[" ? "\\]" : op);

  let out = "";
  // start of the not-yet-emitted plain-text region
  let pos = 0;
  const stack: Array<{ op: string; openerStart: number; contentStart: number }> = [];

  let m: RegExpExecArray | null;
  while ((m = delimRe.exec(text)) !== null) {
    const tok = m[0];
    const opens =
      tok === "\\[" || tok === "\\(" || ((tok === "$" || tok === "$$") && stack.length === 0);

    if (opens) {
      if (stack.length > 0) continue; // nested opener inside math -> treat as content
      out += text.slice(pos, m.index); // flush plain text before the opener
      stack.push({ op: tok, openerStart: m.index, contentStart: m.index + tok.length });
      pos = m.index + tok.length;
      continue;
    }

    // tok is a closer ($$ | \] | \) | $)
    if (stack.length === 0) continue; // orphan closer -> leave as literal text
    const frame = stack[stack.length - 1];
    const content = text.slice(frame.contentStart, m.index);
    const end = m.index + tok.length;
    const matched = tok === expectedCloser(frame.op);
    const dollar = frame.op === "$" || frame.op === "$$";

    // Inline math must not swallow paragraph breaks — a "pair" spanning a blank
    // line is almost always a pairing accident, so keep the original text instead.
    const spansParagraphs = !isDisplayOp(frame.op) && /\n\n/.test(content);
    // Content still containing delimiter tokens is a cascade artifact (e.g.
    // "$...\\) collapses. Then \\(x = 1" ) — never treat that as one formula.
    const contentHasDelims = /\$\$|\$|\\\[|\\\]|\\\(|\\\)/.test(content);
    const plausible = !spansParagraphs && !contentHasDelims && looksLikeMath(content);
    // Explicit \\( \\) / \\[ \\] pairs are honored as-is; bare $ pairs must also
    // pass the math-likeness check so prices/prose ($5 and $10) stay prose.
    const accept = matched ? (!dollar || plausible) : plausible;

    if (accept) {
      const inner = safeMath(content).trim();
      out += isDisplayOp(frame.op) ? `\n\n$$${inner}$$\n\n` : `$${inner}$`;
      stack.pop();
      pos = end;
    } else {
      // Restore as plain text: escape the dollars so remark-math cannot pair
      // them with later ones, and re-scan the inner content for valid pairs.
      stack.pop();
      out +=
        (dollar ? "\\" + frame.op : frame.op) +
        repairMathDelimiters(content, safeMath) +
        (tok === "$" || tok === "$$" ? "\\" + tok : tok);
      pos = end;
    }
  }

  if (stack.length > 0) {
    // Unclosed opener: keep everything from that opener onward as plain text.
    return out + text.slice(stack[0].openerStart);
  }
  return out + text.slice(pos);
}
