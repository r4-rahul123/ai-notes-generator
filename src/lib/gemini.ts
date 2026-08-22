import { GoogleGenAI } from "@google/genai";

const FALLBACK_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
];

export async function generateWithFallback(options: {
  contents: any;
  config?: any;
  preferredModel?: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in environment");

  const ai = new GoogleGenAI({ apiKey });
  const models = options.preferredModel
    ? [options.preferredModel, ...FALLBACK_MODELS.filter((m) => m !== options.preferredModel)]
    : FALLBACK_MODELS;

  // Normalize contents to structured format
  const normalizedContents =
    typeof options.contents === "string"
      ? [{ role: "user", parts: [{ text: options.contents }] }]
      : options.contents;

  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: normalizedContents,
        config: options.config,
      });

      if (response && response.text) {
        return response;
      }
    } catch (err: any) {
      console.warn(`Model ${model} failed, trying next fallback model:`, err?.message || err);
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error("All Gemini models failed to respond");
}
