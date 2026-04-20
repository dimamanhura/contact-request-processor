const { CONTACT_REQUEST_STATUSES } = require("./constants");

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

const sendMessage = async ({ message, email, name, status, reason }) => {
  const isCritical = status === CONTACT_REQUEST_STATUSES.CRITICAL;
  const label = isCritical ? "🚨 CRITICAL INQUIRY" : "📩 NEW CONTACT";

  const text = [
    `${label}\n`,
    `*From:* ${name}`,
    `*Email:* ${email}`,
    `*AI Classification:* \`${status.toUpperCase()}\`\n`,
    `*AI Reasoning:*`,
    `_${reason}_\n`,
    `*Message:*`,
    `\`\`\``,
    message,
    `\`\`\``,
  ].join("\n");

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parse_mode: "Markdown",
        chat_id: chatId,
        text: text.join("\n"),
        disable_notification: !isCritical,
      }),
    }
  );

  return response;
};

module.exports = { sendMessage };
