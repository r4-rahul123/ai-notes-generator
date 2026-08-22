import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import connectToDatabase from "@/lib/mongoose";
import Transaction from "@/lib/models/Transaction";
import User from "@/lib/models/User";

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    const secret = process.env.RAZORPAY_KEY_SECRET || "dummy";
    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    await connectToDatabase();

    // Verify transaction exists and wasn't already processed
    const transaction = await Transaction.findOne({ razorpayOrderId: razorpay_order_id });
    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (transaction.razorpayPaymentId) {
      return NextResponse.json({ error: "Transaction already processed" }, { status: 400 });
    }

    // Mark transaction as paid
    transaction.razorpayPaymentId = razorpay_payment_id;
    await transaction.save();

    // Add credits to user
    await User.findByIdAndUpdate(transaction.userId, {
      $inc: { credits: transaction.creditsAdded },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Razorpay Verification Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
