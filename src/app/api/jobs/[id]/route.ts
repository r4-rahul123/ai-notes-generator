import { NextResponse } from "next/server";
import { notesQueue } from "@/lib/queue";
import { getAuth } from "@clerk/nextjs/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
    const jobId = resolvedParams.id;
    
    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    const job = await notesQueue.getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    return NextResponse.json({
      id: job.id,
      state,
      progress,
      result,
      failedReason
    });
  } catch (error: any) {
    console.error("Job API Error:", error);
    return NextResponse.json({ error: "Failed to fetch job status" }, { status: 500 });
  }
}
