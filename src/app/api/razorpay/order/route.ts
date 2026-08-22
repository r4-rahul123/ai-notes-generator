import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongoose";
import User from "@/lib/models/User";
import Razorpay from "razorpay";
import Transaction from "@/lib/models/Transaction";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "dummy",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "dummy",
});

const packages = {
  basic: { credits: 5, price: 20000, name: "Basic - 5 Credits" }, // price in paise
  pro: { credits: 15, price: 50000, name: "Pro - 15 Credits" },
  ultra: { credits: 50, price: 100000, name: "Ultra - 50 Credits" },
};

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { packageId } = await req.json();
    const pkg = packages[packageId as keyof typeof packages];

    if (!pkg) {
      return NextResponse.json({ error: "Invalid package" }, { status: 400 });
    }

    await connectToDatabase();
    let user = await User.findOne({ clerkId });
    if (!user) {
      user = await User.create({ clerkId, email: "unknown@placeholder.com", credits: 3 });
    }

    const options = {
      amount: pkg.price,
      currency: "INR",
      receipt: `rcpt_${user._id.toString().substring(0, 10)}_${Date.now()}`,
      notes: {
        userId: user._id.toString(),
        credits: pkg.credits.toString(),
      },
    };

    const order = await razorpay.orders.create(options);

    // Save pending transaction
    await Transaction.create({
      userId: user._id,
      razorpayOrderId: order.id,
      amount: order.amount,
      creditsAdded: pkg.credits,
    });

    return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (error: any) {
    console.error("Razorpay Order Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
