import mongoose, { Schema, Document, Types } from "mongoose";

export interface IContribution extends Document {
  vaquitaId: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number; // Amount in USDC
  txHash?: string; // Transaction hash on-chain
  status: "pending" | "confirmed" | "failed";
  createdAt: Date;
}

const ContributionSchema = new Schema<IContribution>(
  {
    vaquitaId: {
      type: Schema.Types.ObjectId,
      ref: "Vaquita",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    txHash: String,
    status: {
      type: String,
      enum: ["pending", "confirmed", "failed"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

export const Contribution = mongoose.model<IContribution>(
  "Contribution",
  ContributionSchema
);
