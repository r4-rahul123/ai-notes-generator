import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongoose";
import User from "@/lib/models/User";
import Transaction from "@/lib/models/Transaction";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { creditsToAdd } = await req.json();

    await connectToDatabase();
    
    let user = await User.findOne({ clerkId });
    if (!user) {
      user = await User.create({ clerkId, email: "unknown@placeholder.com", credits: 3 });
    }

    // Create a fake transaction for record keeping
    await Transaction.create({
      userId: user._id,
      razorpayOrderId: `mock_order_${Date.now()}`,
      razorpayPaymentId: `mock_payment_${Date.now()}`,
      amount: 0,
      creditsAdded: creditsToAdd,
    });

    // Add credits to user
    await User.findByIdAndUpdate(user._id, {
      $inc: { credits: creditsToAdd },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Mock Payment Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
