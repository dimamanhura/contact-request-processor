"use server";

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

const sendMessage = async ({ message, email, name }) => {
  const text = [
    "*New contact request*\n",
    `*Name:* ${name}`,
    `*Email:* ${email}\n`,
    `_${message}_`,
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
      }),
    }
  );

  return response;
};

module.exports = { sendMessage };
