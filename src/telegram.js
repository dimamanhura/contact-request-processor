const { CONTACT_REQUEST_STATUSES } = require("./constants");

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

const STATUS_MAP = {
  [CONTACT_REQUEST_STATUSES.CRITICAL]: {
    label: "🚨 CRITICAL INQUIRY",
    silent: false,
  },
  [CONTACT_REQUEST_STATUSES.GENERAL]: {
    label: "📩 NEW CONTACT",
    silent: true,
  },
  [CONTACT_REQUEST_STATUSES.SOLICITATION]: {
    label: "📁 SOLICITATION / PITCH",
    silent: true,
  },
};

export const getStatusConfig = (status) => {
  return STATUS_MAP[status] || { label: "🔍 UNKNOWN CATEGORY", silent: true };
};

const sendMessage = async ({ message, email, name, status, reason }) => {
  const { label, silent } = getStatusConfig(status);

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
  ];

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
        disable_notification: silent,
      }),
    }
  );

  return response;
};

module.exports = { sendMessage };
