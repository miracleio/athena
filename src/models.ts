import mongoose, { Document, Schema } from "mongoose";

// User Schema
interface IUser extends Document {
  telegramId: string;
  name?: string;
}

const UserSchema: Schema = new Schema({
  telegramId: { type: String, required: true, unique: true },
  name: { type: String },
});

export const User = mongoose.model<IUser>("User", UserSchema);

// Chat Schema
interface IChatMessage extends Document {
  userId: mongoose.Types.ObjectId;
  role: "user" | "model";
  text: string;
  createdAt: Date;
}

const ChatMessageSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["user", "model"], required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const ChatMessage = mongoose.model<IChatMessage>(
  "ChatMessage",
  ChatMessageSchema,
);

// Reminder Interface
interface IReminder extends Document {
  userId: mongoose.Types.ObjectId;
  message: string;
  time: string;
  sent: boolean;
  context?: string;
  createdAt: Date;
}

// Reminder Schema
const ReminderSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  time: { type: String, required: true },
  sent: {
    type: Boolean,
    default: false,
  },
  context: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const Reminder = mongoose.model<IReminder>("Reminder", ReminderSchema);

interface IErrorLog extends Document {
  message: string;
  stack?: string;
  timestamp: Date;
  additionalInfo?: string; // Any additional context for the error
}

const ErrorLogSchema: Schema = new Schema({
  message: { type: String, required: true },
  stack: { type: String },
  timestamp: { type: Date, default: Date.now },
  additionalInfo: { type: String },
});

export const ErrorLog = mongoose.model<IErrorLog>("ErrorLog", ErrorLogSchema);
