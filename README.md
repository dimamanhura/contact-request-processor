# Contact Request Processor

An event-driven microservice designed to decouple contact form processing from the Next.js frontend. It leverages **AWS SQS** for queueing, **Amazon Bedrock (Claude 3 Haiku)** for intelligent classification, and **Telegram** for prioritized alerting.

## 🏗 Architecture Overview

1.  **Ingestion:** Next.js pushes contact payloads to **SQS** and returns `200 OK` immediately.
2.  **Processing:** SQS triggers this Lambda function.
3.  **Intelligence:** Lambda sends the message to **Amazon Bedrock** to classify the intent (Spam, Critical, etc.).
4.  **Storage:** The message and its AI-generated category are saved to **MongoDB**.
5.  **Notification:** If the intent is `general` or `critical`, a notification is routed via the **Telegram Bot API**.

## 🛠 Tech Stack

- **Runtime:** Node.js 20.x (CommonJS)
- **Queue:** AWS SQS
- **AI/ML:** Amazon Bedrock (anthropic.claude-3-haiku)
- **Database:** MongoDB
- **Notifications:** Telegram Bot API
- **Deployment:** GitHub Actions

## 📂 Project Structure

```text
contact-request-processor/
├── src/
│   ├── index.js      # Lambda entry point & handler logic
│   ├── telegram.js   # Telegram API integration
│   ├── bedrock.js    # Claude 3 Haiku prompt & invocation logic
│   └── db.js         # MongoDB connection & schema management
├── .github/
│   └── workflows/
│       └── deploy.yml # Automated AWS Lambda deployment
├── package.json
└── README.md
```

## 🧠 Classification Logic (AI Classifications)

| Classification      | Description                      | Action                                 |
| :------------------ | :------------------------------- | :------------------------------------- |
| **critical**        | Urgent business or site issues   | Save to DB + **Urgent Telegram Alert** |
| **general**         | Networking or standard inquiries | Save to DB + Standard Telegram Alert   |
| **solicitation**    | Marketing/SEO offers             | Save to DB only                        |
| **spam**            | Phishing or bot junk             | Save to DB only                        |
| **no_reply_needed** | Thank yous / automated replies   | Save to DB only                        |

## 🚀 Environment Variables

Ensure the following variables are configured in the AWS Lambda Console:

- `MONGODB_URI`: Connection string for the database.
- `TELEGRAM_BOT_TOKEN`: Authorized bot token from BotFather.
- `TELEGRAM_CHAT_ID`: Destination chat ID for notifications.
- `AWS_REGION`: e.g., `eu-north-1`.

## 🤖 AI System Prompt

The Bedrock integration uses a strict system prompt to ensure the output is always a valid JSON object:

```json
{
  "classification": "critical | general | solicitation | spam | no_reply_needed",
  "reason": "short explanation"
}
```
