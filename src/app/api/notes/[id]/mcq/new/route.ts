import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongoose";
import Note from "@/lib/models/Note";
import { generateWithFallback } from "@/lib/gemini";
import { parseAiJson } from "@/lib/parseAiJson";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const note = await Note.findById(id);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const attemptsCount = note.quizAttempts?.length || 0;
    if (attemptsCount >= 5) {
      return NextResponse.json(
        { error: "Maximum limit of 5 quiz attempts reached for this note." },
        { status: 400 }
      );
    }

    // Collect past questions so Gemini avoids repeating identical questions
    const previousQuestions: string[] = [];
    if (note.mcqs && Array.isArray(note.mcqs)) {
      note.mcqs.forEach((m: any) => previousQuestions.push(m.question));
    }
    if (note.quizAttempts && Array.isArray(note.quizAttempts)) {
      note.quizAttempts.forEach((att: any) => {
        if (att.mcqs && Array.isArray(att.mcqs)) {
          att.mcqs.forEach((m: any) => previousQuestions.push(m.question));
        }
      });
    }

    const prompt = `You are an expert examiner. Generate a BRAND NEW set of 5-6 multiple-choice questions (MCQs) for a student at the "${note.classLevel}" level based on this topic and study material.

Topic: "${note.topic}"
Title: "${note.title}"
Summary: ${note.summary}
Key Content: ${note.content ? note.content.slice(0, 3000) : ""}

PREVIOUS QUESTIONS TO AVOID (Do NOT repeat these questions):
${previousQuestions.slice(0, 25).map((q, i) => `${i + 1}. ${q}`).join("\n")}

REQUIREMENTS:
- Generate 5-6 fresh, diverse, high-quality MCQs (conceptual, scenario-based, analytical).
- Each question must have exactly 4 options.
- The "correctAnswer" string must EXACTLY match one of the options.
- In questions and options, wrap inline math in \\\\( ... \\\\) and display math in \\\\[ ... \\\\]. Never emit bare LaTeX or use dollar signs.
- Every math span must open and close with the SAME delimiter: \\\\( closes with \\\\) and \\\\[ closes with \\\\]. Never mix styles or leave a span unclosed.
- Because the response is raw JSON, escape every LaTeX backslash as a double backslash. Example raw JSON string: "\\\\(x = \\\\frac{1}{2}\\\\)".
- Return ONLY valid RAW JSON matching this structure:
{
  "mcqs": [
    {
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "The exact string of the correct option"
    }
  ]
}`;

    const response = await generateWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text;
    if (!rawText) throw new Error("Empty response from AI");

    const parsed = parseAiJson<{ mcqs: any[] }>(rawText);

    if (!parsed.mcqs || !Array.isArray(parsed.mcqs) || parsed.mcqs.length === 0) {
      throw new Error("No MCQs generated in response.");
    }

    return NextResponse.json({
      success: true,
      mcqs: parsed.mcqs,
      attemptNumber: attemptsCount + 1,
      maxAttempts: 5,
    });
  } catch (error: any) {
    console.error("Generate new MCQs error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate new MCQs" },
      { status: 500 }
    );
  }
}
