import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PDFParse } from "pdf-parse";

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

    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 10MB allowed." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Using PDFParse from pdf-parse v2
    const parser = new PDFParse({ data: uint8Array });
    const textResult = await parser.getText();

    const text = textResult?.text?.trim();
    if (!text || text.length < 20) {
      return NextResponse.json({ error: "Could not extract text from PDF. Please make sure it's a text-based PDF (not a scanned image)." }, { status: 400 });
    }

    // Limit to ~15000 chars to avoid prompt limit
    const truncated = text.length > 15000 ? text.slice(0, 15000) + "\n\n[Content truncated for processing...]" : text;

    return NextResponse.json({
      text: truncated,
      pages: textResult.total || 1,
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
