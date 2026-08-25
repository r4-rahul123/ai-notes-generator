import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongoose";
import User from "@/lib/models/User";
import { notesQueue } from "@/lib/queue";
import { redis } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = getAuth(req as any);
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Basic Rate Limiting: Max 3 requests per minute per user
    const rateLimitKey = `rate-limit:generate:${clerkId}`;
    const requestsCount = await redis.incr(rateLimitKey);
    if (requestsCount === 1) {
      await redis.expire(rateLimitKey, 60); // Expire in 60 seconds
    }
    if (requestsCount > 3) {
      return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
    }

    const { topic, classLevel, additionalInstructions, pdfContent, pdfFileName } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    await connectToDatabase();
    let user = await User.findOne({ clerkId });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.credits < 1) {
      return NextResponse.json(
        { error: "Insufficient credits. Please upgrade your plan." },
        { status: 403 }
      );
    }

    // Add job to BullMQ queue
    const job = await notesQueue.add('generate-note', {
      userId: user._id.toString(),
      topic,
      classLevel,
      pdfContent,
    });

    // Return the Job ID so the frontend can poll its status
    return NextResponse.json({ success: true, jobId: job.id }, { status: 202 });
  } catch (error: any) {
    console.error("Generate API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to enqueue note generation" },
      { status: 500 }
    );
  }
}
