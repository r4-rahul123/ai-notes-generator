import { jsonrepair } from "jsonrepair";
import JSON5 from "json5";

/**
 * Ultra-robust JSON parser for AI outputs.
 * Uses a 5-tier parsing pipeline:
 * 1. Standard JSON.parse
 * 2. jsonrepair + JSON.parse (fixes unescaped quotes, missing commas/brackets, control chars)
 * 3. JSON5.parse
 * 4. jsonrepair + JSON5.parse
 * 5. Regex-based key-value extraction fallback
 */
export function parseAiJson<T = any>(rawText: string): T {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("Empty AI response received.");
  }

  // 1. Remove markdown fences (```json ... ``` or ``` ...)
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
  cleaned = cleaned.replace(/\s*```$/i, "");
  cleaned = cleaned.trim();

  // 2. Extract content between first { or [ and last } or ]
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  const startIdx =
    firstBrace !== -1 && firstBracket !== -1
      ? Math.min(firstBrace, firstBracket)
      : firstBrace !== -1
      ? firstBrace
      : firstBracket;

  const lastBrace = cleaned.lastIndexOf("}");
  const lastBracket = cleaned.lastIndexOf("]");
  const endIdx = Math.max(lastBrace, lastBracket);

  if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }

  // Tier 1: Direct JSON.parse
  try {
    return JSON.parse(cleaned);
  } catch {}

  // Tier 2: jsonrepair
  try {
    const repaired = jsonrepair(cleaned);
    return JSON.parse(repaired);
  } catch {}

  // Tier 3: JSON5
  try {
    return JSON5.parse(cleaned);
  } catch {}

  // Tier 4: jsonrepair + JSON5
  try {
    const repaired = jsonrepair(cleaned);
    return JSON5.parse(repaired);
  } catch {}

  // Tier 5: Fallback regex extractor for note fields if it's a note object
  try {
    const extractString = (key: string): string => {
      const match = cleaned.match(new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"(?=\\s*,\\s*"\\w+"\\s*:|\\s*})`));
      return match ? match[1].replace(/\\"/g, '"').replace(/\\n/g, "\n") : "";
    };

    const title = extractString("title") || "Study Notes";
    const summary = extractString("summary") || "";
    const content = extractString("content") || cleaned;
    const shortNotes = extractString("shortNotes") || "";

    if (title || summary || content) {
      return {
        title,
        summary,
        content,
        shortNotes,
        importantQuestions: [],
        mcqs: [],
        mermaidCharts: [],
      } as unknown as T;
    }
  } catch {}

  console.error("Critical AI JSON parsing failure. Raw text:", rawText);
  throw new Error("Unable to parse AI response. Please try again.");
}
