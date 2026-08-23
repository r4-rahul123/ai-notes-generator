import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PDFParse } from "pdf-parse";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    // Max 15MB
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 15MB allowed." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    let extractedText = "";
    let totalPages = 1;

    try {
      const parser = new PDFParse({ data: uint8Array });
      const textResult = await parser.getText();
      extractedText = textResult?.text || "";
      totalPages = textResult?.total || 1;
    } catch (parseErr: any) {
      console.warn("Primary PDFParse failed, attempting buffer recovery:", parseErr);
      // Fallback: try raw buffer decoding if text stream is standard
      const rawString = new TextDecoder("utf-8", { fatal: false }).decode(uint8Array);
      const textMatches = rawString.match(/\(([^()]{3,})\)/g);
      if (textMatches && textMatches.length > 10) {
        extractedText = textMatches.map((m) => m.slice(1, -1)).join(" ");
      }
    }

    const cleanText = extractedText
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // remove control chars
      .replace(/\r\n/g, "\n")
      .trim();

    if (!cleanText || cleanText.length < 15) {
      return NextResponse.json(
        {
          error:
            "Could not extract text from this PDF. Please ensure it contains selectable text (not a scanned image or protected PDF).",
        },
        { status: 400 }
      );
    }

    // Limit to ~14,000 characters to ensure fast, high-quality AI generation within token limits
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
    console.error("PDF Parse Error:", error);
    return NextResponse.json(
      { error: "Failed to parse PDF: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
