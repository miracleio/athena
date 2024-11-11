// ./src/utils.ts

import mongoose from "mongoose";
import { ChatMessage, User, Reminder, ErrorLog } from "./models.js";
import { generateContent, model } from "./geminiAPI.js";
import { bot, sendTelegramMessage } from "./telegramBot.js";

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
  text: string,
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
  context?: string,
): Promise<void> => {
  try {
    const newReminder = new Reminder({
      userId,
      message,
      time,
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
  console.log("Checking for reminders at", new Date().toLocaleTimeString());
  // Find all reminders that need to be sent at this time
  const reminders = await Reminder.find({ time: { $lte: now }, sent: false });

  console.log("Reminders ==>", reminders);

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
        message,
      );

      // Send the reminder message to the user via Telegram
      await sendTelegramMessage(user.telegramId, message);
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
  adminChatId: string,
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

export {
  findOrCreateUser,
  saveChatMessage,
  getChatHistory,
  createReminder,
  sendReminderMessage,
  escapeCharacters,
  logError,
  parseTextResponse,
};
