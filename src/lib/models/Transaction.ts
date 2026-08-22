import mongoose, { Schema, Document, models } from "mongoose";

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number;
  creditsAdded: number;
  createdAt: Date;
}

const TransactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String },
    amount: { type: Number, required: true },
    creditsAdded: { type: Number, required: true },
  },
  { timestamps: true }
);

const Transaction = models.Transaction || mongoose.model<ITransaction>("Transaction", TransactionSchema);
export default Transaction;
