import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";
import { searchSimilarChunks, indexDocument } from "@/lib/rag/vectorSearch";
import { generateWithFallback } from "@/lib/gemini";
import DocumentChunk from "@/lib/models/DocumentChunk";
import connectToDatabase from "@/lib/mongoose";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, noteContext, noteId } = await req.json();

    if (!message || !noteContext) {
      return NextResponse.json(
        { error: "Message and noteContext are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // RAG Semantic Vector Retrieval
    let retrievedChunks: any[] = [];
    if (noteId && mongoose.Types.ObjectId.isValid(noteId)) {
      try {
        // Check if chunks already exist; if not, index on-the-fly
        const existingCount = await DocumentChunk.countDocuments({
          noteId: new mongoose.Types.ObjectId(noteId),
        });

        if (existingCount === 0) {
          const textToIndex = `${noteContext.title}\n\n${noteContext.summary}\n\n${noteContext.content}\n\n${noteContext.shortNotes}`;
          await indexDocument(noteId, clerkId, textToIndex, `${noteContext.topic}.pdf`);
        }

        retrievedChunks = await searchSimilarChunks(noteId, message, 3);
      } catch (ragSearchErr) {
        console.warn("RAG search fallback to full note context:", ragSearchErr);
      }
    }

    // Format retrieved vector chunks
    const ragContextText =
      retrievedChunks.length > 0
        ? retrievedChunks
            .map(
              (c, i) =>
                `[Source Section #${c.chunkIndex + 1} (Similarity: ${Math.round(
                  c.similarity * 100
                )}%)]:\n${c.text}`
            )
            .join("\n\n")
        : noteContext.content;

    const systemPrompt = `You are an expert AI tutor grounded in a Retrieval-Augmented Generation (RAG) study system. 

The student is studying: "${noteContext.title}" (Topic: ${noteContext.topic}, Level: ${noteContext.classLevel})

--- RETRIEVED RELEVANT SOURCE CONTEXT (RAG VECTOR SEARCH) ---
${ragContextText}
--- END RETRIEVED CONTEXT ---

STUDENT NOTE SUMMARY:
${noteContext.summary}

INSTRUCTIONS:
1. Answer the student's question accurately using the retrieved source context above.
2. If the answer is directly supported by the retrieved context, explain clearly and concisely.
3. If it's a general academic question on this topic, provide a helpful and conceptual explanation.
4. Format your response cleanly using markdown (bullet points, bold key terms, simple code blocks).
5. Keep your tone encouraging, professional, and easy to understand.`;

    const response = await generateWithFallback({
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt + "\n\nStudent's Question: " + message }],
        },
      ],
    });

    const reply = response.text;
    if (!reply) throw new Error("Empty response from AI");

    const ragSources = retrievedChunks.map((c) => ({
      chunkIndex: c.chunkIndex,
      similarity: c.similarity,
      snippet: c.text.slice(0, 140) + "...",
    }));

    return NextResponse.json({ reply, ragSources });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get response" },
      { status: 500 }
    );
  }
}
