// ./src/telegramBot.ts

import { Application } from "express";
import TelegramBot, { Update } from "node-telegram-bot-api";
import dotenv from "dotenv";
import { model } from "./geminiAPI.js";
import {
  createReminder,
  escapeCharacters,
  findOrCreateUser,
  getChatHistory,
  logError,
  parseTextResponse,
  saveChatMessage,
} from "./utils.js";
import mongoose from "mongoose";

dotenv.config();
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID; // Your personal chat ID in Telegram

const botToken = process.env.TELEGRAM_TOKEN || "";
export const bot = new TelegramBot(botToken, { polling: false }); // Disable polling for Webhook usage

// Function to split long content into chunks that fit within Telegram's limit
const splitMessage = (message: string, maxLength: number = 4096) => {
  const parts = [];
  while (message.length > maxLength) {
    parts.push(message.substring(0, maxLength));
    message = message.substring(maxLength);
  }
  if (message.length > 0) {
    parts.push(message); // Add the final part
  }
  return parts;
};

// Initialize bot and set Webhook
export const initializeBot = (app: Application) => {
  bot.setWebHook(`${process.env.SERVER_URL}/webhook`);
  console.log("Telegram bot initialized and Webhook set");
};

export const sendTelegramMessage = async (
  chatId: number,
  message: string,
  name?: string,
) => {
  try {
    const telegramId = chatId.toString();
    const messageParts = await getDynamicResponse(telegramId, message, name);

    // Send each part separately to the user
    for (const part of messageParts) {
      console.log("part =====>", part);
      const escapedPart = escapeCharacters(part, [
        "!",
        ".",
        "-",
        "(",
        ")",
        "{",
        "}",
      ]);
      console.log("escapedPart =====>", escapedPart);

      await bot.sendMessage(chatId, escapedPart, {
        parse_mode: "MarkdownV2",
      });
    }
  } catch (err) {
    console.log("sendTelegramMessage error ==>", err);
    await bot.sendMessage(
      chatId,
      "Uh oh. Something went wrong. Hang on though, you can message me in a few minutes",
    );
    logError(
      new Error((err as { message: string }).message),
      "in sendTelegramMessage",
      ADMIN_CHAT_ID as string,
    );
  }
};

// Handle incoming Telegram messages
export const handleTelegramMessage = async (body: Update) => {
  console.log(JSON.stringify(body, null, 2));
  const message = body.message;
  if (message?.text) {
    const chatId = message.chat.id;
    sendTelegramMessage(chatId, message.text, message.chat.first_name);
  }
};

// Get a dynamic response from Gemini API
const getDynamicResponse = async (
  telegramId: string,
  userInput: string,
  name?: string,
): Promise<string[]> => {
  try {
    // Find or create the user by Telegram ID
    const user = await findOrCreateUser(telegramId, name);

    // Retrieve chat history from MongoDB
    const chatHistory = await getChatHistory(
      user._id as mongoose.Types.ObjectId,
    );

    // Initialize Gemini chat with history
    const chat = model.startChat({ history: chatHistory });

    // Send the current user message
    const currentTime = new Date();
    const result = await chat.sendMessage(
      userInput + `currentTime: ${currentTime.toISOString()}`,
    );
    const text = result.response.text();

    // Save the user message and model response to MongoDB
    await saveChatMessage(
      user._id as mongoose.Types.ObjectId,
      "user",
      userInput,
    );
    await saveChatMessage(user._id as mongoose.Types.ObjectId, "model", text);
    try {
      // Usage
      const parsedResult = parseTextResponse(text);

      console.log("Code Blocks:", parsedResult.codeBlocks);
      console.log("Non-JSON Text:", parsedResult.nonJsonText);
      console.log("Parsed JSON:", parsedResult.jsonContent);

      const reminders = parsedResult.jsonContent.reminders;
      console.log(reminders, !reminders);

      if (reminders && (reminders != null || reminders.length > 0)) {
        reminders.forEach(
          async (reminder: {
            message: string;
            time: string;
            context: string;
          }) => {
            const createdReminder = await createReminder(
              user._id as mongoose.Types.ObjectId,
              reminder.message,
              reminder.time,
              reminder.context,
            );
            console.log("Reminder ==>", createdReminder);
          },
        );
      }
      // Return the response, splitting if necessary
      return splitMessage(`${parsedResult.jsonContent.userMessage}
        ${parsedResult.codeBlocks.map((x) => x)}
        `);
    } catch (err) {
      console.log("getDynamicResponse Error ==>", err);
      logError(
        new Error((err as { message: string }).message),
        "in getDynamicResponse",
        ADMIN_CHAT_ID as string,
      );

      try {
        const data = JSON.parse(text);
        return splitMessage(data.userMessage);
      } catch (err) {
        console.log("getDynamicResponse Error ==>", err);
        logError(
          new Error((err as { message: string }).message),
          "in getDynamicResponse",
          ADMIN_CHAT_ID as string,
        );
      }
      // Return the response, splitting if necessary
      return splitMessage(text);
    }
  } catch (error) {
    console.error("Error with Gemini API:", error);
    return ["I’m having trouble processing that. Please try again later."];
  }
};
