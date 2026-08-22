import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongoose";
import Note from "@/lib/models/Note";
import User from "@/lib/models/User";

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
    const { answers, mcqs } = await req.json();

    if (!mcqs || !Array.isArray(mcqs) || mcqs.length === 0) {
      return NextResponse.json(
        { error: "Invalid MCQs payload" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const user = await User.findOne({ clerkId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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

    let score = 0;
    const processedMCQs = mcqs.map((mcq: any, idx: number) => {
      const userAnswer = answers[idx] || "";
      const isCorrect = userAnswer === mcq.correctAnswer;
      if (isCorrect) score += 1;
      return {
        question: mcq.question,
        options: mcq.options,
        correctAnswer: mcq.correctAnswer,
        userAnswer,
      };
    });

    const newAttempt = {
      attemptNumber: attemptsCount + 1,
      score,
      total: mcqs.length,
      submittedAt: new Date(),
      mcqs: processedMCQs,
    };

    if (!note.quizAttempts) {
      note.quizAttempts = [];
    }
    note.quizAttempts.push(newAttempt);
    await note.save();

    return NextResponse.json({
      success: true,
      attempt: newAttempt,
      totalAttempts: note.quizAttempts.length,
    });
  } catch (error: any) {
    console.error("Submit MCQ error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit quiz attempt" },
      { status: 500 }
    );
  }
}
