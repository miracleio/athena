import cron from "node-cron";
import { bot } from "./telegramBot.js";
import { sendReminderMessage } from "./utils.js";

// Start the cron job to send reminders
cron.schedule("* * * * *", sendReminderMessage); // Every minute

export const scheduleReminders = () => {
  const chatId = process.env.TELEGRAM_CHAT_ID as string; // Target chat ID for reminders

  // Morning check-in
  cron.schedule("0 9 * * *", () => {
    bot.sendMessage(
      chatId,
      "Good morning! Let’s set goals for today to build your online brand. What will you focus on today?",
    );
  });

  // Midday motivation
  cron.schedule("0 12 * * *", () => {
    bot.sendMessage(
      chatId,
      "How’s it going? Remember to stay active and engage with your audience!",
    );
  });

  // End-of-day reflection
  cron.schedule("0 20 * * *", () => {
    bot.sendMessage(
      chatId,
      "Great job today! How did you do with your goals? Anything you’d like to improve tomorrow?",
    );
  });
};
