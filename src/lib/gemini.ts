import { GoogleGenAI } from "@google/genai";
import { Mistral } from "@mistralai/mistralai";

const FALLBACK_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
];

export async function generateWithFallback(options: {
  contents: any;
  config?: any;
  preferredModel?: string;
}) {
  // Normalize contents to structured format
  const normalizedContents =
    typeof options.contents === "string"
      ? [{ role: "user", parts: [{ text: options.contents }] }]
      : options.contents;

  // 1. Try Mistral if API key is provided
  const mistralKey = process.env.MISTRAL_API_KEY;
  if (mistralKey) {
    try {
      const client = new Mistral({ apiKey: mistralKey });
      const messages = [];
      
      // Handle system instruction if present
      if (options.config?.systemInstruction?.parts?.[0]?.text) {
        messages.push({ role: "system", content: options.config.systemInstruction.parts[0].text });
      }

      // Convert Gemini conversation format to Mistral format
      for (const msg of normalizedContents) {
        const role = msg.role === 'model' ? 'assistant' : 'user';
        const text = msg.parts.map((p: any) => p.text).join('\n');
        messages.push({ role, content: text });
      }

      const response = await client.chat.complete({
        model: "mistral-large-latest", // Force Mistral Large
        messages: messages,
        temperature: options.config?.temperature || 0.7,
        responseFormat: options.config?.responseMimeType === "application/json" ? { type: "json_object" } : { type: "text" },
      });

      const responseText = response.choices?.[0]?.message?.content || "";
      if (responseText) {
        return {
          text: responseText,
          candidates: [
            {
              content: {
                parts: [{ text: responseText }]
              }
            }
          ]
        };
      }
    } catch (err: any) {
      console.warn(`Mistral failed, falling back to Gemini:`, err?.message || err);
    }
  }

  // 2. Fallback to Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Neither MISTRAL_API_KEY nor GEMINI_API_KEY is set in environment");

  const ai = new GoogleGenAI({ apiKey });
  const models = options.preferredModel && !mistralKey
    ? [options.preferredModel, ...FALLBACK_MODELS.filter((m) => m !== options.preferredModel)]
    : FALLBACK_MODELS;

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

  throw lastError || new Error("All LLM models failed to respond");
}
