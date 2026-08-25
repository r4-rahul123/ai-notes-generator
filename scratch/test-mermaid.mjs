import mermaid from "mermaid";
import { JSDOM } from "jsdom";

const code = `graph TD
A["Quantum State Formalisms"] --> B["Pure States: $$|\\psi\\rangle \\in \\mathcal{H}$$"]
A --> C["Mixed States: $$\\rho = \\sum p_i |\\psi_i\\rangle\\langle\\psi_i|$$"]
B --> D["Purity: $$\\text{Tr}(\\rho^2) = 1$$"]
C --> E["Purity: $$\\text{Tr}(\\rho^2) < 1$$"]
D --> F["Schmidt Decomposition: $$|\\Psi\\rangle = \\sum \\lambda_i |i_A\\rangle |i_B\\rangle$$"]
F --> G["Schmidt Rank $$k=1$$: Separable"]
F --> H["Schmidt Rank $$k>1$$: Entangled"]`;

async function test() {
  const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="container"></div></body></html>`);
  global.window = dom.window;
  global.document = dom.window.document;

  mermaid.initialize({ startOnLoad: false });
  try {
    const { svg } = await mermaid.render("test", code);
    console.log("Success! SVG length:", svg.length);
  } catch (err) {
    console.error("Mermaid error:", err);
  }
}

test();
