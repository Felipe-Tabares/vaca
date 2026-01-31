import mongoose, { Schema, Document, Types } from "mongoose";

export interface IVaquita extends Document {
  code: string; // Unique join code (6 chars)
  name: string;
  description?: string;
  goalAmount: number; // Goal in USDC
  currentAmount: number; // Current balance
  creatorId: Types.ObjectId;
  members: Types.ObjectId[];
  // Pool wallet (created via Openfort)
  poolPlayerId?: string;
  poolWalletAddress?: string;
  // Status
  status: "active" | "completed" | "cancelled" | "withdrawn";
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const VaquitaSchema = new Schema<IVaquita>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 50,
    },
    description: {
      type: String,
      maxlength: 200,
    },
    goalAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    currentAmount: {
      type: Number,
      default: 0,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    poolPlayerId: String,
    poolWalletAddress: String,
    status: {
      type: String,
      enum: ["active", "completed", "cancelled", "withdrawn"],
      default: "active",
    },
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

export const Vaquita = mongoose.model<IVaquita>("Vaquita", VaquitaSchema);
