export interface TextChunk {
  text: string;
  chunkIndex: number;
  charLength: number;
  wordCount: number;
  page?: number;
}

interface ChunkerOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

/**
 * Recursive character text splitter that splits documents into overlapping chunks
 * while preserving natural boundaries (paragraphs, sentences, punctuation).
 */
export function recursiveTextSplitter(
  text: string,
  options: ChunkerOptions = {}
): TextChunk[] {
  const chunkSize = options.chunkSize || 800;
  const chunkOverlap = options.chunkOverlap || 120;
  const separators = options.separators || ["\n\n", "\n", ". ", "? ", "! ", "; ", ", ", " "];

  if (!text || text.trim().length === 0) {
    return [];
  }

  const rawChunks: string[] = splitRecursively(text.trim(), chunkSize, chunkOverlap, separators);

  return rawChunks
    .map((chunkText, idx) => {
      const cleaned = chunkText.trim();
      return {
        text: cleaned,
        chunkIndex: idx,
        charLength: cleaned.length,
        wordCount: cleaned.split(/\s+/).filter(Boolean).length,
      };
    })
    .filter((chunk) => chunk.charLength >= 20); // filter out tiny fragments
}

function splitRecursively(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
  separators: string[]
): string[] {
  if (text.length <= chunkSize) {
    return [text];
  }

  let separator = "";
  let parts: string[] = [];

  for (const sep of separators) {
    if (text.includes(sep)) {
      separator = sep;
      parts = text.split(sep);
      break;
    }
  }

  // If no separator found, hard split by character limit
  if (!separator || parts.length <= 1) {
    const result: string[] = [];
    let start = 0;
    while (start < text.length) {
      result.push(text.slice(start, start + chunkSize));
      start += chunkSize - chunkOverlap;
    }
    return result;
  }

  const chunks: string[] = [];
  let currentChunk = "";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const candidate = currentChunk ? currentChunk + separator + part : part;

    if (candidate.length <= chunkSize) {
      currentChunk = candidate;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        // Overlap: keep tail of currentChunk
        const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
        const overlapText = currentChunk.slice(overlapStart);
        currentChunk = overlapText ? overlapText + separator + part : part;
      } else {
        // Single part is larger than chunkSize, split it recursively with next separator level
        const subSeparators = separators.slice(separators.indexOf(separator) + 1);
        const subChunks = splitRecursively(part, chunkSize, chunkOverlap, subSeparators);
        chunks.push(...subChunks);
        currentChunk = "";
      }
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}
