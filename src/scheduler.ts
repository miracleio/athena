// ./src/scheduler.ts

import cron from "node-cron";
import { sendReminderMessage } from "./utils.js";

// Start the cron job to send reminders
cron.schedule("* * * * *", sendReminderMessage); // Every minute
