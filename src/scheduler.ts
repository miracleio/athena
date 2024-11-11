// ./src/scheduler.ts

import cron from "node-cron";
import { generateReminders, sendReminderMessage } from "./utils.js";

// Start the cron job to send reminders
cron.schedule("* * * * *", sendReminderMessage); // Every minute
// Every 3 hours
cron.schedule("0 */3 * * *", generateReminders);
