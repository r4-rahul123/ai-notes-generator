import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateWithFallback } from "@/lib/gemini";
import connectToDatabase from "@/lib/mongoose";
import User from "@/lib/models/User";
import Note from "@/lib/models/Note";
import { GoogleGenAI } from "@google/genai";
import { parseAiJson } from "@/lib/parseAiJson";
import { indexDocument } from "@/lib/rag/vectorSearch";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topic, classLevel, additionalInstructions, pdfContent, pdfFileName } = await req.json();

    if (!topic || !classLevel) {
      return NextResponse.json(
        { error: "Topic and classLevel are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    let user = await User.findOne({ clerkId });
    if (!user) {
      user = await User.create({
        clerkId,
        email: "unknown@placeholder.com",
        credits: 15,
      });
    }

    if (user.credits < 1) {
      return NextResponse.json(
        { error: "Not enough credits. Please buy more." },
        { status: 403 }
      );
    }

    // Build context section based on whether PDF is provided
    const contentContext = pdfContent
      ? `
The student has uploaded a PDF document titled "${pdfFileName || "document"}" with the following content:

--- PDF CONTENT START ---
${pdfContent}
--- PDF CONTENT END ---

Generate notes BASED ON this PDF content. Extract and organize the key information from the PDF.
Topic filter: "${topic}" (focus on this aspect if mentioned in the PDF, otherwise cover the main content).
`
      : `Generate comprehensive notes on the topic: "${topic}"`;

    const prompt = `You are an expert AI tutor and note-maker. ${contentContext}
Target student level: "${classLevel}"
${additionalInstructions ? `Special instructions: ${additionalInstructions}` : ""}

IMPORTANT FORMATTING RULES for the "content" field:
- Use rich markdown formatting to make notes visually attractive
- Start with a brief intro paragraph
- Use ## for main sections, ### for subsections  
- Use **bold** for key terms, *italics* for emphasis
- Use bullet points (- item) and numbered lists where appropriate
- Add relevant emojis to section headings (e.g. ## 🔬 Core Concepts)
- Include a "💡 Key Takeaways" section
- Include a "⚡ Quick Facts" section with interesting facts
- Include a "🧠 Memory Tips" section with mnemonics or tricks
- Use > blockquotes for important definitions
- Use tables (markdown table format) where data comparison is useful
- Use \`code blocks\` for formulas or technical notation
- Make it engaging, clear, and easy to read

You MUST respond with a RAW JSON object (no markdown code blocks around it). Follow this exact structure:
{
  "title": "An engaging, catchy title with an emoji",
  "summary": "A well-written 2-3 paragraph summary that gives a clear overview of the topic",
  "content": "The full detailed explanation in RICH markdown format as described above — minimum 600 words",
  "shortNotes": "# Quick Revision\\n\\n- **Point 1**: explanation\\n- **Point 2**: explanation\\n(use markdown bullet points with bold key terms)",
  "importantQuestions": [
    {
      "question": "Question 1 (Core concept / definition)",
      "answer": "Detailed, step-by-step clear answer explaining this concept with key points."
    },
    {
      "question": "Question 2 (Application / Mechanism)",
      "answer": "Detailed explanation of how this works in practice with examples."
    },
    {
      "question": "Question 3 (Comparison / Analysis)",
      "answer": "Clear analytical answer contrasting components or detailing trade-offs."
    },
    {
      "question": "Question 4 (Code / Real-world scenario)",
      "answer": "Practical explanation or code approach with insights."
    },
    {
      "question": "Question 5 (Exam High-Yield question)",
      "answer": "Comprehensive examination-ready answer covering critical points."
    }
  ],
  "mcqs": [
    {
      "question": "Clear MCQ question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "The exact string of the correct option from the options array"
    }
  ],
  "mermaidCharts": [
    "graph TD\\n  A[\\\"Start Process\\\"] --> B[\\\"Step 1\\\"]\\n  B --> C[\\\"Step 2\\\"]"
  ]
}

Provide at least 6 MCQs and at least 2 mermaid charts. In Mermaid charts, ALWAYS wrap all node label texts in double quotes like A[\"Label (with details)\"] to prevent syntax errors. Make sure correctAnswer EXACTLY matches one of the options strings.`;

    const response = await generateWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text;
    if (!rawText) throw new Error("Empty response from AI");

    const noteData = parseAiJson<{
      title: string;
      summary: string;
      content: string;
      shortNotes: string;
      importantQuestions: any[];
      mcqs: any[];
      mermaidCharts: string[];
    }>(rawText);

    // Normalize important questions structure
    const normalizedQuestions = (noteData.importantQuestions || []).map((q: any) => {
      if (typeof q === "object" && q !== null) {
        return {
          question: q.question || q.q || String(q),
          answer: q.answer || q.a || "",
        };
      }
      return {
        question: String(q),
        answer: "",
      };
    });

    // Deduct credit
    user.credits -= 1;
    await user.save();

    // Save note
    const newNote = await Note.create({
      userId: user._id,
      topic,
      classLevel,
      title: noteData.title || topic,
      summary: noteData.summary || "",
      content: noteData.content || "",
      shortNotes: noteData.shortNotes || "",
      importantQuestions: normalizedQuestions,
      mcqs: noteData.mcqs || [],
      mermaidCharts: noteData.mermaidCharts || [],
    });

    // RAG Pipeline: Index document into Vector Database (Chunks + Gemini Embeddings)
    try {
      const textToIndex = pdfContent
        ? `${pdfContent}\n\n=== AI GENERATED NOTES ===\n${noteData.content}`
        : `${noteData.title}\n\n${noteData.summary}\n\n${noteData.content}\n\n${noteData.shortNotes}`;

      await indexDocument(
        newNote._id.toString(),
        user._id.toString(),
        textToIndex,
        pdfFileName || `${topic}_notes.pdf`
      );
    } catch (ragErr) {
      console.warn("RAG Vector Indexing warning (proceeding):", ragErr);
    }

    return NextResponse.json({ success: true, noteId: newNote._id });
  } catch (error: any) {
    console.error("Generate API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate notes" },
      { status: 500 }
    );
  }
}
