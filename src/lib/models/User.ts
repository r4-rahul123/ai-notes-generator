import mongoose, { Schema, Document, models } from "mongoose";

export interface IUser extends Document {
  clerkId: string;
  email: string;
  credits: number;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema(
  {
    clerkId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    credits: { type: Number, default: 3 }, // Give 3 free credits initially
    stripeCustomerId: { type: String },
  },
  { timestamps: true }
);

const User = models.User || mongoose.model<IUser>("User", UserSchema);
export default User;
