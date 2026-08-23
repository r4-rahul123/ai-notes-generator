import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import zlib from "zlib";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Robust Zero-Dependency PDF Text Extractor
 * Reads decompressed PDF streams, TJ text arrays, and text segments
 */
function extractTextFromBuffer(buffer: Buffer): { text: string; pages: number } {
  let fullText = "";
  const rawString = buffer.toString("binary");

  // Count page markers
  const pageMatches = rawString.match(/\/Type\s*\/Page\b/g);
  const pages = pageMatches ? pageMatches.length : 1;

  // Extract all streams
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;

  while ((match = streamRegex.exec(rawString)) !== null) {
    const streamContent = Buffer.from(match[1], "binary");
    let decompressed: Buffer | null = null;

    try {
      decompressed = zlib.inflateSync(streamContent);
    } catch {
      try {
        decompressed = zlib.inflateRawSync(streamContent);
      } catch {
        decompressed = streamContent;
      }
    }

    if (decompressed) {
      const decoded = decompressed.toString("utf-8");

      // 1. Extract BT ... ET text blocks
      const btMatches = decoded.match(/BT[\s\S]*?ET/g);
      if (btMatches) {
        for (const bt of btMatches) {
          // Standard parentheses text: (Hello)
          const textSegments = bt.match(/\(([^()]*)\)/g);
          if (textSegments) {
            const line = textSegments
              .map((s) => s.slice(1, -1))
              .join(" ")
              .trim();
            if (line) fullText += line + "\n";
          }

          // Array TJ text: [(H) 10 (ello)] TJ
          const tjMatches = bt.match(/\[(.*?)\]\s*TJ/g);
          if (tjMatches) {
            for (const tj of tjMatches) {
              const innerTexts = tj.match(/\(([^()]*)\)/g);
              if (innerTexts) {
                const line = innerTexts.map((s) => s.slice(1, -1)).join("");
                if (line) fullText += line + " ";
              }
            }
            fullText += "\n";
          }
        }
      }
    }
  }

  // Fallback: extract generic readable text strings if stream count was low
  if (fullText.trim().length < 30) {
    const genericMatches = rawString.match(/\(([^()]{3,})\)/g);
    if (genericMatches) {
      fullText = genericMatches
        .map((s) => s.slice(1, -1))
        .filter((s) => /[a-zA-Z0-9]/.test(s))
        .join(" ");
    }
  }

  return { text: fullText.trim(), pages: Math.max(1, pages) };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    // Max 15MB
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 15MB allowed." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";
    let totalPages = 1;

    // Native pure-JS stream parser
    const nativeResult = extractTextFromBuffer(buffer);
    extractedText = nativeResult.text;
    totalPages = nativeResult.pages;

    const cleanText = extractedText
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .replace(/\r\n/g, "\n")
      .trim();

    if (!cleanText || cleanText.length < 15) {
      return NextResponse.json(
        {
          error:
            "Could not extract readable text from this PDF. Please ensure it is a text-based PDF (not a scanned image without OCR).",
        },
        { status: 400 }
      );
    }

    // Limit to ~14,000 characters for optimal AI prompt size
    const truncated =
      cleanText.length > 14000
        ? cleanText.slice(0, 14000) + "\n\n[...Content summarized for optimal note generation]"
        : cleanText;

    return NextResponse.json({
      text: truncated,
      pages: totalPages,
      fileName: file.name,
    });
  } catch (error: any) {
    console.error("PDF Parse Server Error:", error);
    return NextResponse.json(
      { error: "Failed to parse PDF: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
