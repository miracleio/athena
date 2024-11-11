import express, { Request, Response } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
// Cron job to check for reminders every minute (adjust as needed)
import cron from "node-cron";
import { initializeBot, handleTelegramMessage } from "./telegramBot.js";
import { scheduleReminders } from "./scheduler.js";

dotenv.config();
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID; // Your personal chat ID in Telegram

const mongoURI = process.env.MONGO_URI as string;
mongoose
  .connect(mongoURI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Initialize Telegram Bot
initializeBot(app);

// Endpoint for Telegram Webhook
app.post("/webhook", (req: Request, res: Response) => {
  handleTelegramMessage(req.body);
  res.sendStatus(200);
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  scheduleReminders(); // Start scheduled reminders
});
