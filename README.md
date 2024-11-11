# Athena - AI Accountability Partner

Athena is a powerful AI-driven Telegram bot designed to help users stay on track with their personal goals through motivation and scheduled reminders. Utilizing Google's Gemini API and MongoDB, Athena provides conversational support, motivation, and follow-up reminders directly through Telegram.

## Features

* **Motivational Conversations**: Athena delivers supportive messages to keep users motivated
* **Scheduled Reminders**: Identifies when follow-up reminders may benefit users and schedules them appropriately
* **Persistent Chat History**: Saves each user's chat history for contextually relevant responses
* **Error Logging**: Detailed logging system helps maintain stability and optimize interactions
* **Flexible Cron Job Scheduling**: Sends reminders at scheduled intervals to maintain user engagement

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/athena-ai-bot.git
   cd athena-ai-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory:
   ```
   TELEGRAM_TOKEN=<Your Telegram Bot Token>
   GEMINI_API_KEY=<Your Google Gemini API Key>
   GEMINI_API_URL=<Gemini API Endpoint URL>
   MONGO_URI=<Your MongoDB URI>
   SERVER_URL=<Your Server's URL>
   ADMIN_CHAT_ID=<Your Telegram Chat ID>
   PORT=3000
   ```

4. **Set up MongoDB**
   * Ensure MongoDB is running and accessible via MONGO_URI

5. **Start the server**
   ```bash
   npm start
   ```

6. **Configure Webhook**
   * Athena uses a webhook to receive Telegram messages
   * Ensure your server's URL is correctly set in SERVER_URL
   * Register the webhook with Telegram's API

## Components

* `geminiAPI.ts`: Integrates with Google Gemini API for response generation
* `telegramBot.ts`: Manages Telegram interactions and webhook setup
* `models.ts`: MongoDB schemas for User, ChatMessage, Reminder, and ErrorLog
* `scheduler.ts`: Manages cron jobs for reminder checking and sending
* `utils.ts`: Helper functions for user, chat, reminder, and error management

## Usage

### Interacting with Athena

1. **Chat Interaction**
   * Users can start conversations with Athena on Telegram
   * All interactions are saved to MongoDB for context

2. **Motivational Support**
   * Receive AI-powered motivational responses
   * Get specific next steps and guidance
   * Receive personalized reminders based on goals

3. **Automated Reminders**
   * Athena analyzes conversations to identify follow-up opportunities
   * Schedules goal-related check-ins automatically

### Example Reminder Structure

```json
{
  "userMessage": "Great job on your progress! Let's check in tomorrow to see your results.",
  "reminder": {
    "message": "Review your goals and track your achievements.",
    "time": "2024-11-10T21:15:40.438Z",
    "context": "Daily goal check-in."
  }
}
```

## Development

### Running in Development Mode
```bash
npm run dev
```

### Cron Job Configuration
* Default check frequency: Every minute
* Customize scheduling in `scheduler.ts`

### Error Handling
* Errors are logged to MongoDB's ErrorLog collection
* Admin notifications are sent to ADMIN_CHAT_ID via Telegram
* Enables quick issue identification and resolution

## Contributing

We welcome contributions! Please:
* Create pull requests for improvements
* Report issues you encounter
* Suggest new features or enhancements

## License

This project is licensed under the MIT License.

---

🤖 Built with AI, powered by motivation! ✨
