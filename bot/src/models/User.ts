import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  telegramId: number;
  username?: string;
  firstName?: string;
  // Openfort data (set after webapp auth)
  openfortPlayerId?: string;
  openfortUserId?: number; // The ID used to create Openfort account (may differ from telegramId for legacy users)
  walletAddress?: string;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    username: String,
    firstName: String,
    openfortPlayerId: String,
    openfortUserId: Number,
    walletAddress: String,
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>("User", UserSchema);
