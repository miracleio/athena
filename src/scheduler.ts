// ./src/scheduler.ts

import cron from "node-cron";
import { generateReminders, sendReminderMessage } from "./utils.js";

// Start the cron job to send reminders
cron.schedule("* * * * *", sendReminderMessage); // Every minute
cron.schedule("* * * * *", generateReminders); // Every minute
