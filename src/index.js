const { sendMessage } = require("./telegram.js");

exports.handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : event;
    const { message, email, name } = body;

    if (!message || !email || !name) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Missing required fields: message, email or name.",
        }),
      };
    }

    const telegramResponse = await sendMessage({ message, email, name });

    if (!telegramResponse.ok) {
      const errorData = await telegramResponse.text();
      console.error("Telegram API Error:", errorData);
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Failed to forward message to Telegram.",
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        message: "Request processed successfully.",
      }),
    };
  } catch (error) {
    console.error("Internal Lambda Error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal Server Error." }),
    };
  }
};
