import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import connectToDatabase from "@/lib/mongoose";
import User from "@/lib/models/User";
import Note from "@/lib/models/Note";
import DashboardClient from "@/components/DashboardClient";

export default async function DashboardPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  await connectToDatabase();
  let user = await User.findOne({ clerkId });
  if (!user) {
    user = await User.create({
      clerkId,
      email: "unknown@placeholder.com",
      credits: 3,
    });
  }

  const rawNotes = await Note.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .lean();

  // Convert all MongoDB BSON ObjectIds & Dates to 100% plain JSON
  const notes = JSON.parse(JSON.stringify(rawNotes));

  return (
    <DashboardClient
      initialNotes={notes}
      userCredits={user.credits}
    />
  );
}
