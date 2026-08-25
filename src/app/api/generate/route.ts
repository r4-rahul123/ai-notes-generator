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

IMPORTANT MATHEMATICAL FORMATTING RULES for EVERY user-visible text field (summary, content, shortNotes, questions, answers, MCQs, and options):
- Use \\\\( ... \\\\) for INLINE math and \\\\[ ... \\\\] for DISPLAY/BLOCK math. NEVER use dollar signs for text-field math and NEVER wrap formulas in code backticks.
- CRITICAL DELIMITER RULE: every math span must open and close with the SAME delimiter style. A span opened with \\\\( MUST be closed with \\\\) — never with a dollar sign. A span opened with \\\\[ MUST be closed with \\\\]. Never mix the two styles inside one span, and never leave a span unclosed.
- The response is raw JSON, so EVERY LaTeX backslash must be escaped as a double backslash. Example raw JSON string: "\\\\(E = \\\\frac{1}{2}mc^2\\\\)".
- Do not emit bare LaTeX commands outside math delimiters.

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
- Use tables (markdown table format) where data comparison is useful
- Use \`code blocks\` ONLY for real programming code (e.g. Python, JavaScript, C++, SQL).
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
    "graph TD\\n  A[\\\"State evolves: $$\\\\vert \\\\psi(t)\\\\rangle = e^{-i\\\\hat{H}t/\\\\hbar} \\\\vert \\\\psi(0)\\\\rangle$$\\\"] --> B[\\\"Next concept\\\"]"
  ]
}

Provide at least 6 MCQs and at least 2 mermaid charts. In Mermaid charts:
- ALWAYS wrap every node label in double quotes, like A[\"Label (with details)\"].
- Mermaid math is different from content-field math: wrap every formula in $$...$$ inside the quoted label. NEVER use \\(...\\) or \\[...\\] in Mermaid charts.
- NEVER use the | pipe character inside $$...$$ math in labels — write \\\\vert instead (pipes break Mermaid's edge syntax).
- Because the chart is inside JSON, escape every LaTeX backslash as a double backslash. For example, output \\\\psi rather than \\psi in the raw JSON.
- Keep prose outside the $$ delimiters, for example A[\"State: $$E = mc^2$$\"].
Make sure correctAnswer EXACTLY matches one of the options strings.`;

    const response = await generateWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // Large cap — the full JSON (5 answers + 6 MCQs + charts) is token-heavy
        // and a truncated response loses the arrays that sit at the END of it.
        maxOutputTokens: 16384,
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

    // ── Completeness guard ──
    // The JSON fields are ordered with the arrays LAST, so a truncated AI
    // response loses or shortens exactly the questions/MCQs/charts. If anything
    // is missing or suspiciously short, run one focused follow-up call and MERGE
    // the results in.
    const missingSections: string[] = [];
    if ((noteData.importantQuestions?.length || 0) < 3) missingSections.push("importantQuestions");
    if ((noteData.mcqs?.length || 0) < 4) missingSections.push("mcqs");
    if ((noteData.mermaidCharts?.length || 0) < 1) missingSections.push("mermaidCharts");

    if (missingSections.length > 0) {
      console.warn("Notes missing sections, generating supplement:", missingSections);
      try {
        const supplementPrompt = `You are an expert AI tutor. Based on the study notes below, generate ONLY the missing sections.

Topic: "${topic}" (Level: "${classLevel}")
Title: "${noteData.title || topic}"

Notes summary: "${(noteData.summary || noteData.content || "").slice(0, 1200)}"

Return ONLY a RAW JSON object (no markdown fences, no commentary) containing ALL of these keys:
{
  "importantQuestions": [
    { "question": "Core concept question", "answer": "Detailed step-by-step answer" },
    ... (exactly 5 questions covering: core concept, mechanism, comparison, real-world scenario, exam high-yield)
  ],
  "mcqs": [
    { "question": "MCQ text", "options": ["Option A", "Option B", "Option C", "Option D"], "correctAnswer": "The exact string of the correct option" },
    ... (exactly 6 MCQs)
  ],
  "mermaidCharts": [
    "graph TD\\n  A[\\\"Label with $$formula$$\\\"] --> B[\\\"Next\\\"]",
    ... (exactly 2 valid Mermaid flowcharts: every label double-quoted, formulas inside $$...$$, NEVER use | pipes inside $$ math — write \\\\vert instead, every backslash doubled because this is raw JSON)
  ]
}

MATH RULES for question/answer text: use \\\\( ... \\\\) for inline and \\\\[ ... \\\\] for display math, always closed with the SAME delimiter, every backslash doubled (raw JSON).
correctAnswer MUST exactly match one of the options strings.`;

        const suppRes = await generateWithFallback({
          contents: supplementPrompt,
          config: {
            responseMimeType: "application/json",
            maxOutputTokens: 8192,
          },
        });
        const supplement = parseAiJson<{
          importantQuestions?: any[];
          mcqs?: any[];
          mermaidCharts?: string[];
        }>(suppRes.text || "");

        if (supplement.importantQuestions?.length) {
          noteData.importantQuestions = [
            ...(noteData.importantQuestions || []),
            ...supplement.importantQuestions,
          ];
        }
        if (supplement.mcqs?.length) {
          noteData.mcqs = [...(noteData.mcqs || []), ...supplement.mcqs];
        }
        if (supplement.mermaidCharts?.length) {
          noteData.mermaidCharts = [
            ...(noteData.mermaidCharts || []),
            ...supplement.mermaidCharts,
          ];
        }
      } catch (suppErr: any) {
        console.warn("Supplemental section generation failed (proceeding):", suppErr?.message || suppErr);
      }
    }

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

    // Save note without destructive backend sanitization (frontend prepareMarkdown handles this safely now)
    const newNote = await Note.create({
      userId: user._id,
      topic,
      classLevel,
      title: noteData.title || "Generated Notes",
      summary: noteData.summary || "Summary not provided by AI.",
      content: noteData.content || "Content not provided by AI.",
      shortNotes: noteData.shortNotes || "No short notes generated.",
      importantQuestions: normalizedQuestions.map((q: any) => ({
        question: q.question || "Untitled question",
        answer: q.answer || "No answer provided.",
      })),
      mcqs: (noteData.mcqs || []).map((mcq: any) => ({
        ...mcq,
        question: mcq.question || "Untitled question",
        correctAnswer: mcq.correctAnswer || "Not provided",
      })),
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
