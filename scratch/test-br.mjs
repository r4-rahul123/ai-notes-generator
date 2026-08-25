import { JSDOM } from "jsdom";

// DOM globals BEFORE importing mermaid so its bundled DOMPurify binds
const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="c"></div></body></html>`, { pretendToBeVisual: true });
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, "navigator", { value: dom.window.navigator, configurable: true });

const mermaid = (await import("mermaid")).default;

// replicate current sanitizeMermaid (core parts)
function sanitizeMermaid(code) {
  if (!code) return "";
  let clean = code.trim();
  clean = clean.replace(/\r\n/g, "\n").replace(/\\n(?=\s)/g, "\n");
  clean = clean.replace(/\$\$([\s\S]*?)\$\$/g, (_m, math) => `$$${math.replace(/\\?\|/g, "\\vert ")}$$`);
  const lines = clean.split("\n");
  const processed = lines.map((line) => {
    let l = line.trim();
    if (!l) return "";
    if (/^(style |classDef |class )/.test(l)) return "";
    if (/^(graph|flowchart|sequenceDiagram|classDiagram|erDiagram|stateDiagram)/.test(l)) return l;
    l = l.replace(/<br\s*\/?>/gi, "\u0001BR\u0001");
    l = l.replace(
      /(\b[A-Za-z0-9_]+)\s*\[([^\]]*?)\]"?(?=\s*(?:-->|---|==>|-\.->|\||$))/g,
      (match, id, content) => {
        let inner = content.trim();
        if (inner.startsWith('"') && inner.endsWith('"') && inner.length >= 2) inner = inner.slice(1, -1);
        inner = inner.replace(/(?<!\\)"/g, "'").trim();
        inner = inner.replace(/\$\$([\s\S]*?)\$\$/g, (m, math) => {
          let s = math.replace(/</g, " \\lt ").replace(/>/g, " \\gt ");
          s = s.replace(/(\^|_)\\{1,2}([a-zA-Z]+)(?!\{)/g, "$1{\\$2}");
          s = s.replace(/\\\\([a-zA-Z]+)/g, "\\$1");
          return "$$" + s + "$$";
        });
        inner = inner.replace(/<(?!\/?br\b)([a-zA-Z])/gi, "< $1");
        return `${id}["${inner}"]`;
      }
    );
    l = l.replace(/\u0001BR\u0001/g, "<br/>");
    return l;
  });
  return processed.filter(Boolean).join("\n");
}

// The exact pattern from the user's screenshot
const chart = `graph TD
A["State Classification in Quantum Mechanics"] --> B["Pure States:<br>rho = $$|\\psi\\rangle\\langle\\psi|$$<br>Tr(rho^2) = 1<br>Zero Entropy"]
A --> C["Mixed States:<br>rho = $$\\sum_i p_i |\\psi_i\\rangle\\langle\\psi_i|$$<br>Tr(rho^2) < 1<br>Non-zero Entropy"]`;

const clean = sanitizeMermaid(chart);
console.log("SANITIZED:");
console.log(clean);
console.log();

mermaid.initialize({ startOnLoad: false, securityLevel: "loose", suppressErrorRendering: true });
try {
  const { svg } = await mermaid.render(`t${Date.now()}`, clean);
  const hasBr = svg.includes("<br");
  const hasBrokenBr = svg.includes("< br");
  const hasPlaceholder = svg.includes("\u0001");
  console.log(`render: SUCCESS (svg ${svg.length} chars)`);
  console.log(`svg contains <br tags: ${hasBr} | broken "< br": ${hasBrokenBr} | placeholder leak: ${hasPlaceholder}`);
  process.exit(hasBr && !hasBrokenBr && !hasPlaceholder ? 0 : 1);
} catch (err) {
  console.log("render FAILED:", String(err).slice(0, 200));
  process.exit(1);
}
