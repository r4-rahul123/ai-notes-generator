import { GoogleGenAI } from "@google/genai";

let genAIInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }
    genAIInstance = new GoogleGenAI({ apiKey });
  }
  return genAIInstance;
}

/**
 * Generates a vector embedding for a single piece of text using Gemini Embeddings API.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const ai = getGenAI();
  const cleanText = text.replace(/\n+/g, " ").trim();

  try {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: cleanText,
    });

    const values = response.embeddings?.[0]?.values;
    if (!values || !Array.isArray(values)) {
      throw new Error("Invalid embedding response from Gemini API.");
    }

    return values;
  } catch (err: any) {
    console.error("Gemini Embedding Error:", err);
    throw err;
  }
}

/**
 * Generates embeddings in controlled parallel batches to prevent rate limits.
 */
export async function generateBatchEmbeddings(
  texts: string[],
  concurrency = 5
): Promise<number[][]> {
  const results: number[][] = new Array(texts.length);

  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency);
    const batchPromises = batch.map(async (text, batchOffset) => {
      const globalIndex = i + batchOffset;
      const embedding = await generateEmbedding(text);
      results[globalIndex] = embedding;
    });

    await Promise.all(batchPromises);
  }

  return results;
}
