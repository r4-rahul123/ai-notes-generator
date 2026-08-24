export function prepareMarkdown(text: string): string {
  if (!text) return "";
  let clean = text;

  // 1. Fix literal \n strings stored as \\n in JSON
  clean = clean.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");

  // 2. Unescape \$ -> $
  clean = clean.replace(/\\\$/g, "$");

  // Helper to safely format math content by replacing | with \vert 
  // to prevent remark-gfm from misinterpreting them as markdown tables.
  const safeMath = (math: string) => math.replace(/\|/g, "\\vert ");

  // 3. Handle double-escaped \\( \\) and \\[ \\] from JSON
  clean = clean.replace(/\\\\([[(])([\s\S]*?)\\\\([\])])/g, (_, open, content, close) => {
    if (open === "[" && close === "]") return `\n\n$$${safeMath(content).trim()}$$\n\n`;
    if (open === "(" && close === ")") return `$${safeMath(content).trim()}$`;
    return _;
  });

  // 4. Single-escaped \[ ... \] -> $$ ... $$
  clean = clean.replace(/\\\[([\s\S]*?)\\\]/g, (_, p1) => `\n\n$$${safeMath(p1).trim()}$$\n\n`);

  // 5. Single-escaped \( ... \) -> $ ... $
  clean = clean.replace(/\\\(([\s\S]*?)\\\)/g, (_, p1) => `$${safeMath(p1).trim()}$`);

  // 6. Backtick-wrapped LaTeX on its own line -> display math
  clean = clean.replace(/(?:^|\n)\s*`([^`\n]*?\\[a-zA-Z]+[^`\n]*?)`\s*(?:\n|$)/g, (_, p1) => `\n\n$$${safeMath(p1).trim()}$$\n\n`);

  // 7. Inline backtick-wrapped LaTeX -> inline math
  clean = clean.replace(/`([^`\n]*?\\[a-zA-Z]+[^`\n]*?)`/g, (_, p1) => `$${safeMath(p1).trim()}$`);

  // 8. Fix squished table rows which remark-gfm hates
  clean = clean.replace(/\|\s*\|\s*([:-]+)/g, "|\n| $1");
  clean = clean.replace(/\|\s*\|\s*([^\s|])/g, "|\n| $1");

  return clean;
}
