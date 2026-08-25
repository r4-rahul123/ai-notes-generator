import fs from "node:fs";
import { PDFParse } from "pdf-parse";

const buf = fs.readFileSync("Quantam_physics_Notes (2).pdf");
const parser = new PDFParse({ data: buf });
const result = await parser.getText();
console.log(result.text);
