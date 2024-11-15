// ./src/utils.ts

import mongoose from "mongoose";
import { ChatMessage, User, Reminder, ErrorLog } from "./models.js";
import { generateContent, model, reminderModel } from "./geminiAPI.js";
import { bot, sendTelegramMessage } from "./telegramBot.js";
import dotenv from "dotenv";

dotenv.config();

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID; // Your personal chat ID in Telegram

const findOrCreateUser = async (telegramId: string, name?: string) => {
  let user = await User.findOne({ telegramId });
  if (!user) {
    user = new User({ telegramId, name });
    await user.save();
  }
  return user;
};

// Save a chat message linked to the user
const saveChatMessage = async (
  userId: mongoose.Types.ObjectId,
  role: "user" | "model",
  text: string
) => {
  const message = new ChatMessage({ userId, role, text });
  await message.save();
};

// Retrieve chat history for a specific user
const getChatHistory = async (userId: mongoose.Types.ObjectId) => {
  const history = await ChatMessage.find({ userId }).sort({ createdAt: 1 });
  return history.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));
};

const createReminder = async (
  userId: mongoose.Types.ObjectId,
  message: string,
  time: string,
  context?: string
): Promise<void> => {
  try {
    const newReminder = new Reminder({
      userId,
      message,
      time: new Date(time),
      context,
    });

    await newReminder.save();
    console.log("New reminder created:", newReminder);
  } catch (error) {
    console.error("Failed to create reminder:", error);
  }
};

// Reminder message sending logic
const sendReminderMessage = async () => {
  const now = new Date();
  // Find all reminders that need to be sent at this time
  const reminders = await Reminder.find({ time: { $lte: now }, sent: false });

  console.log("Reminders ==>", reminders);
  console.log("Checking for reminders at", new Date().toISOString());

  // Iterate over each reminder and send the message
  for (const reminder of reminders) {
    const user = await mongoose.model("User").findById(reminder.userId);
    if (user) {
      const message = reminder.message;

      // Generate message using Gemini API with the context of the user (optional)
      // const genAI = new GoogleGenerativeAI(
      //   process.env.GEMINI_API_KEY as string,
      // );
      // const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      // const chat = model.startChat({
      //   history: await getChatHistory(user._id as mongoose.Types.ObjectId),
      // });
      //

      // const generatedMessage = await generateContent(
      //   `Create a reminder message that will be sent to the user based on this information: ${message}`,
      // );

      // // Send the reminder message with Gemini context
      // const result = await chat.sendMessage(message);

      // mark reminder as sent
      reminder.sent = true;

      await reminder.save();

      // Save the model's response to chat history (optional)
      await saveChatMessage(
        user._id as mongoose.Types.ObjectId,
        "model",
        message
      );

      // Send the reminder message to the user via Telegram
      await bot.sendMessage(user.telegramId, message);
    }
  }
};

function escapeCharacters(input: string, charsToEscape: string[]): string {
  // Create a Set for quick lookup of characters to escape
  const escapeSet = new Set(charsToEscape);

  // Iterate through the string and add a backslash before each character that needs to be escaped
  let escapedString = "";
  for (const char of input) {
    if (escapeSet.has(char)) {
      escapedString += `\\${char}`; // Add a backslash before the character
    } else {
      escapedString += char; // Otherwise, just add the character as is
    }
  }

  return escapedString;
}

// Function to log the error and notify admin
const logError = async (
  error: Error,
  additionalInfo: string = "",
  adminChatId: string
): Promise<void> => {
  try {
    // Save error to database
    const errorLog = new ErrorLog({
      message: error.message,
      stack: error.stack,
      additionalInfo,
    });
    await errorLog.save();

    // Send error notification to admin on Telegram
    if (adminChatId) {
      const message = `
🚨 *Error Alert* 🚨
*Message:* ${error.message}
*Timestamp:* ${new Date().toLocaleString()}
*Additional Info:* ${additionalInfo || "N/A"}
      `;

      // If the error stack is long, truncate for brevity
      const truncatedStack =
        error.stack && error.stack.length > 1000
          ? error.stack.slice(0, 1000) + "..."
          : error.stack;

      const stackMessage = truncatedStack ? `\n*Stack:* ${truncatedStack}` : "";

      await bot.sendMessage(adminChatId, message + stackMessage, {
        parse_mode: "Markdown",
      });
    }
  } catch (logError) {
    console.error("Failed to log error and notify admin:", logError);
  }
};

function parseTextResponse(inputString: string) {
  // Separate code blocks using regex pattern
  const codeBlockPattern = /```.*?```/gs;
  const codeBlocks = inputString.match(codeBlockPattern) || [];
  const remainingText = inputString.replace(codeBlockPattern, "").trim();

  // Extract JSON object within the remaining text
  const jsonPattern = /{[\s\S]*}$/;
  const jsonMatch = remainingText.match(jsonPattern);

  let parsedJSON = null;
  if (jsonMatch) {
    try {
      parsedJSON = JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("Error parsing JSON:", error);
    }
  }

  return {
    codeBlocks,
    jsonContent: parsedJSON,
    nonJsonText: remainingText.replace(jsonPattern, "").trim(),
  };
}

export const processTextResponse = (text: string) => {
  const parsedResult = parseTextResponse(text);
  return {
    codeBlocks: parsedResult.codeBlocks,
    nonJsonText: parsedResult.nonJsonText,
    jsonContent: parsedResult.jsonContent,
  };
};

// 5. Reminder Handling

// Creates reminders based on parsed response
export const handleReminders = async (
  userId: mongoose.Types.ObjectId,
  reminders: any[]
) => {
  if (reminders && reminders.length > 0) {
    for (const reminder of reminders) {
      const createdReminder = await createReminder(
        userId,
        reminder.message,
        reminder.time,
        reminder.context
      );
      console.log("Created Reminder:", createdReminder);
    }
  }
};

// 6. Error Handling and Fallbacks

// Logs error details to the system
export const logErrorMessage = (error: Error, context: string) => {
  logError(error, context, ADMIN_CHAT_ID as string);
};

const generateReminders = async () => {
  console.log("Generating reminders...");

  const users = await User.find();
  for (const user of users) {
    try {
      const chatHistory = await getChatHistory(user.id);
      const pendingReminder = await Reminder.find({
        userId: user.id,
        time: { $lte: new Date() },
        sent: false,
      });

      if (pendingReminder.length > 0) {
        console.log("Pending Reminders:", pendingReminder);
        return;
      }

      // Initialize Gemini chat with history
      const chat = reminderModel.startChat({ history: chatHistory });

      const currentTime = new Date();
      const result = await chat.sendMessage(
        "Generate reminders if the time since the last reminder has passed" +
          `currentTime: ${currentTime.toISOString()}`
      );
      const text = result.response.text();
      console.log("reminders:", text);

      try {
        const parsedResult = processTextResponse(text);
        await handleReminders(
          user._id as mongoose.Types.ObjectId,
          parsedResult.jsonContent.reminders
        );
      } catch (err) {
        logErrorMessage(err as Error, "in getDynamicResponse");
      }
    } catch (error) {
      logErrorMessage(error as Error, "Error with Gemini API");
    }
  }
};

export {
  findOrCreateUser,
  saveChatMessage,
  getChatHistory,
  createReminder,
  sendReminderMessage,
  escapeCharacters,
  logError,
  parseTextResponse,
  generateReminders,
};
