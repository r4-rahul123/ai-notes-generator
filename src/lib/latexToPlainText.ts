/**
 * Converts LaTeX math source into a readable, pure-ASCII plain-text
 * approximation. Used by the server-side jsPDF export, which draws raw text
 * and cannot render KaTeX/LaTeX like the browser (react-markdown + rehype-katex)
 * pipeline does.
 */

// Placeholder for literal "|" characters that originate from math (bra-kets,
// absolute value, \vert, \mid, ...). Markdown tables in the jsPDF route are
// parsed by naively splitting a row on "|", so a bra-ket like \(|\psi\rangle\)
// inside a table cell would otherwise be misread as extra table columns.
// We swap real pipes for this placeholder during table-row parsing and
// restore them afterwards via `restorePipes`.
const PIPE_PLACEHOLDER = "\u0003";
// Placeholders for literal `{` / `}` (from escaped \{ \} set notation) so a
// later cleanup pass that strips leftover LaTeX grouping braces doesn't eat them.
const BRACE_OPEN_PLACEHOLDER = "\u0001";
const BRACE_CLOSE_PLACEHOLDER = "\u0002";

/** Restores pipe placeholders back into literal "|" characters. Call this on
 * any text that isn't going through the jsPDF table-row "|" splitter. */
export function restorePipes(text: string): string {
  return text.replace(new RegExp(PIPE_PLACEHOLDER, "g"), "|");
}

// Symbols/macros that take no arguments — LaTeX command name -> plain text.
const SYMBOL_MAP: Record<string, string> = {
  // Lowercase Greek
  alpha: "alpha", beta: "beta", gamma: "gamma", delta: "delta",
  epsilon: "epsilon", varepsilon: "epsilon", zeta: "zeta", eta: "eta",
  theta: "theta", vartheta: "theta", iota: "iota", kappa: "kappa",
  lambda: "lambda", mu: "mu", nu: "nu", xi: "xi", pi: "pi", varpi: "pi",
  rho: "rho", varrho: "rho", sigma: "sigma", varsigma: "sigma", tau: "tau",
  upsilon: "upsilon", phi: "phi", varphi: "phi", chi: "chi", psi: "psi",
  omega: "omega",
  // Uppercase Greek
  Gamma: "Gamma", Delta: "Delta", Theta: "Theta", Lambda: "Lambda",
  Xi: "Xi", Pi: "Pi", Sigma: "Sigma", Upsilon: "Upsilon", Phi: "Phi",
  Psi: "Psi", Omega: "Omega",
  // Operators
  times: "*", div: "/", pm: "+/-", mp: "-/+", cdot: ".", cdots: "...",
  ldots: "...", dots: "...", vdots: "...", ddots: "...",
  ast: "*", star: "*", circ: "o", bullet: "-", oplus: "(+)", otimes: "(x)",
  // Relations
  le: "<=", leq: "<=", ge: ">=", geq: ">=", neq: "!=", ne: "!=",
  approx: "~=", sim: "~", simeq: "~=", equiv: "==", propto: "is proportional to",
  // Set theory / logic
  in: " in ", notin: " not in ", ni: " contains ",
  subset: " subset ", subseteq: " subset-eq ",
  supset: " superset ", supseteq: " superset-eq ",
  cup: " union ", cap: " intersect ", setminus: " minus ",
  emptyset: "empty set", varnothing: "empty set",
  forall: "for all ", exists: "there exists ", nexists: "there does not exist ",
  wedge: " AND ", land: " AND ", vee: " OR ", lor: " OR ",
  neg: "NOT ", lnot: "NOT ",
  // Arrows
  to: "->", rightarrow: "->", longrightarrow: "->",
  leftarrow: "<-", longleftarrow: "<-",
  leftrightarrow: "<->", longleftrightarrow: "<->",
  Rightarrow: "=>", Longrightarrow: "=>", implies: "=>",
  Leftarrow: "<=", Longleftarrow: "<=",
  Leftrightarrow: "<=>", Longleftrightarrow: "<=>", iff: "<=>",
  mapsto: `${PIPE_PLACEHOLDER}->`, longmapsto: `${PIPE_PLACEHOLDER}->`,
  // Calculus / analysis
  infty: "infinity", partial: "d", nabla: "nabla",
  hbar: "hbar", hslash: "hbar", ell: "l",
  sum: "sum", prod: "prod", coprod: "coprod",
  int: "integral", oint: "contour-integral",
  iint: "double-integral", iiint: "triple-integral",
  lim: "lim", limsup: "limsup", liminf: "liminf",
  sup: "sup", inf: "inf", max: "max", min: "min",
  // Function names
  sin: "sin", cos: "cos", tan: "tan", cot: "cot", sec: "sec", csc: "csc",
  sinh: "sinh", cosh: "cosh", tanh: "tanh",
  log: "log", ln: "ln", exp: "exp",
  det: "det", dim: "dim", ker: "ker", deg: "deg", gcd: "gcd", arg: "arg",
  Pr: "Pr", hom: "hom",
  Re: "Re", Im: "Im",
  // Misc symbols
  dagger: "dagger", ddagger: "ddagger",
  langle: "<", rangle: ">",
  vert: PIPE_PLACEHOLDER, mid: PIPE_PLACEHOLDER,
  Vert: `${PIPE_PLACEHOLDER}${PIPE_PLACEHOLDER}`, parallel: `${PIPE_PLACEHOLDER}${PIPE_PLACEHOLDER}`,
  therefore: "therefore", because: "because",
  perp: "perpendicular", angle: "angle", triangle: "triangle",
  top: "true", bot: "false", aleph: "aleph",
  quad: "  ", qquad: "    ",
  // Spacing commands
  ",": " ", ";": " ", ":": " ", "!": "",
  // Escaped literal characters
  "{": BRACE_OPEN_PLACEHOLDER, "}": BRACE_CLOSE_PLACEHOLDER,
  "$": "$", "%": "%", "&": "&", "_": "_", "#": "#", " ": " ",
};

// Commands wrapping a single {argument} whose braces should just be
// stripped (the wrapping/formatting itself can't be shown in plain text).
const IDENTITY_WRAPPERS = new Set([
  "text", "mathrm", "mathbf", "mathit", "mathcal", "mathbb", "mathscr",
  "mathfrak", "boldsymbol", "operatorname", "hat", "widehat", "vec",
  "overrightarrow", "overleftarrow", "bar", "overline", "underline",
  "dot", "ddot", "tilde", "widetilde", "textbf", "textit", "emph",
]);

const TWO_ARG_COMMANDS: Record<string, (a: string, b: string) => string> = {
  frac: (a, b) => `(${a})/(${b})`,
  dfrac: (a, b) => `(${a})/(${b})`,
  tfrac: (a, b) => `(${a})/(${b})`,
  binom: (a, b) => `C(${a},${b})`,
};

/** Reads a single LaTeX "argument": a {..} group, a \command token, or one char. */
function readArg(str: string, start: number): [string, number] {
  let i = start;
  while (str[i] === " ") i++;
  if (str[i] === "{") {
    let depth = 0;
    const contentStart = i;
    for (; i < str.length; i++) {
      if (str[i] === "\\") { i++; continue; }
      if (str[i] === "{") depth++;
      else if (str[i] === "}") {
        depth--;
        if (depth === 0) { i++; break; }
      }
    }
    return [str.slice(contentStart + 1, i - 1), i];
  }
  if (str[i] === "\\") {
    const cmdStart = i;
    i++;
    while (i < str.length && /[a-zA-Z]/.test(str[i])) i++;
    return [str.slice(cmdStart, i), i];
  }
  return [str[i] ?? "", i + 1];
}

/** Strips \left / \right, keeping the delimiter that follows them. */
function stripLeftRight(str: string): string {
  return str.replace(/\\(left|right)\s*(\\\{|\\\}|\\\||\\vert|\\Vert|\.|.)/g, (_, _kind, delim) => {
    if (delim === "\\{") return "{";
    if (delim === "\\}") return "}";
    if (delim === "\\|" || delim === "\\vert") return PIPE_PLACEHOLDER;
    if (delim === "\\Vert") return `${PIPE_PLACEHOLDER}${PIPE_PLACEHOLDER}`;
    if (delim === ".") return "";
    return delim;
  });
}

/** Handles \sqrt{x} and \sqrt[n]{x}. */
function handleSqrt(str: string): string {
  let out = "";
  let i = 0;
  while (i < str.length) {
    if (str.startsWith("\\sqrt", i)) {
      let j = i + 5;
      let root: string | null = null;
      if (str[j] === "[") {
        const close = str.indexOf("]", j);
        if (close !== -1) {
          root = str.slice(j + 1, close);
          j = close + 1;
        }
      }
      const [arg, next] = readArg(str, j);
      const transformedArg = latexToPlainText(arg);
      out += root ? `(${transformedArg})^(1/${latexToPlainText(root)})` : `sqrt(${transformedArg})`;
      i = next;
      continue;
    }
    out += str[i];
    i++;
  }
  return out;
}

/** Converts ^{...} and _{...} into ^(...) and _(...); leaves ^x / _x as-is. */
function handleScripts(str: string): string {
  let out = "";
  let i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (ch === "^" || ch === "_") {
      const [arg, next] = readArg(str, i + 1);
      const transformed = latexToPlainText(arg);
      out += transformed.length > 1 ? `${ch}(${transformed})` : `${ch}${transformed}`;
      i = next;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/**
 * Recursively converts a raw LaTeX math snippet (delimiters already
 * stripped) into a readable plain-text approximation. Literal "|" characters
 * (bra-kets, absolute value, \vert, \mid) are replaced with a placeholder —
 * call `restorePipes` on the final assembled text once it's safe to do so
 * (i.e. after any pipe-sensitive parsing like markdown table splitting).
 */
export function latexToPlainText(math: string): string {
  if (!math) return "";
  let m = math;

  m = stripLeftRight(m);
  m = handleSqrt(m);

  // Two-argument commands (\frac, \binom, ...)
  for (const [name, format] of Object.entries(TWO_ARG_COMMANDS)) {
    const pattern = new RegExp(`\\\\${name}\\b`);
    let match: RegExpMatchArray | null;
    // Loop in case of multiple occurrences of the same command.
    while ((match = m.match(pattern))) {
      const idx = match.index!;
      const [a, afterA] = readArg(m, idx + match[0].length);
      const [b, afterB] = readArg(m, afterA);
      m = m.slice(0, idx) + format(latexToPlainText(a), latexToPlainText(b)) + m.slice(afterB);
    }
  }

  // One-argument "identity" wrapper commands (\text{}, \mathcal{}, \hat{}, ...)
  for (const name of IDENTITY_WRAPPERS) {
    const pattern = new RegExp(`\\\\${name}\\b`);
    let match: RegExpMatchArray | null;
    while ((match = m.match(pattern))) {
      const idx = match.index!;
      const [a, afterA] = readArg(m, idx + match[0].length);
      m = m.slice(0, idx) + latexToPlainText(a) + m.slice(afterA);
    }
  }

  m = handleScripts(m);

  // Zero-argument named symbols (\alpha, \infty, \subset, ...)
  m = m.replace(/\\([a-zA-Z]+|.)/g, (full, name) => {
    if (name in SYMBOL_MAP) return SYMBOL_MAP[name];
    // Unknown macro: drop the backslash but keep the readable word/char.
    return name;
  });

  // Drop any remaining structural (unconsumed) LaTeX grouping braces.
  m = m.replace(/[{}]/g, "");

  // Restore literal braces that came from escaped \{ and \} (set notation).
  m = m.replace(new RegExp(BRACE_OPEN_PLACEHOLDER, "g"), "{").replace(new RegExp(BRACE_CLOSE_PLACEHOLDER, "g"), "}");

  // Any remaining literal "|" (bra-kets, absolute value bars) -> placeholder,
  // so they survive markdown table-row parsing intact further downstream.
  m = m.replace(/\|/g, PIPE_PLACEHOLDER);

  // Collapse repeated whitespace produced by symbol substitutions.
  m = m.replace(/[ \t]+/g, " ").trim();

  return m;
}

/**
 * Scans arbitrary note text for LaTeX math regions ( \(..\), \[..\], $$..$$, $..$ )
 * and replaces them in-place with readable plain-text approximations.
 * Leaves surrounding prose/markdown untouched. Literal "|" characters from
 * math are left as a placeholder — call `restorePipes` on the result once
 * it's safe (see `latexToPlainText` docs).
 */
export function convertMathInText(text: string): string {
  if (!text) return "";
  let out = text;

  // Double-escaped from inconsistent AI JSON escaping: \\[ ... \\] / \\( ... \\)
  out = out.replace(/\\\\([[(])([\s\S]*?)\\\\([\])])/g, (full, open, inner, close) => {
    const converted = latexToPlainText(inner);
    if (open === "[" && close === "]") return `\n${converted}\n`;
    if (open === "(" && close === ")") return converted;
    return full;
  });
  // Display math: $$ ... $$
  out = out.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => `\n${latexToPlainText(inner)}\n`);
  // Display math: \[ ... \]
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `\n${latexToPlainText(inner)}\n`);
  // Inline math: \( ... \)
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => latexToPlainText(inner));
  // Inline math: $ ... $ (avoid matching lone currency like "$5")
  out = out.replace(/(^|[^\\$])\$([^$\n]+?)\$/g, (_, before, inner) => `${before}${latexToPlainText(inner)}`);

  return out;
}
