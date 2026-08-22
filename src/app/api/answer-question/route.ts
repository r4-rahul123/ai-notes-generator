import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateWithFallback } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { question, topic, classLevel } = await req.json();

    if (!question) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const prompt = `You are an expert professor and academic tutor. Provide a direct, structured, rich Markdown model answer for this exam question:

Question: "${question}"
Topic: "${topic || "Academic Studies"}"
Level: "${classLevel || "College / Higher Education"}"

FORMATTING & CONTENT INSTRUCTIONS:
1. Provide a complete, direct, accurate answer formatted in BEAUTIFUL MARKDOWN.
2. Use **bold text** for core terms, definitions, and key takeaways.
3. Use clean bullet points (- item) or numbered lists (1. item) for steps, mechanisms, or advantages/disadvantages.
4. If code or technical formulas are relevant, include concise \`code\` or \`\`\`code\`\`\` snippets.
5. If a comparison is asked, use a clean markdown table with proper headers.
6. Keep the answer comprehensive, structured, and easy for a student to study.
7. NEVER say "refer to notes" or "read above". Give the complete, factual, independent answer immediately.`;

    const response = await generateWithFallback({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const answer = response.text?.trim() || "No answer generated.";

    return NextResponse.json({ success: true, answer });
  } catch (error: any) {
    console.error("Answer question API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate answer" },
      { status: 500 }
    );
  }
}
