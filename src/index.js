const { classifyRequest } = require("./bedrock.js");
const { sendMessage } = require("./telegram.js");
const { connectToDatabase } = require("./db.js");

exports.handler = async (event) => {
  try {
    const record = event.Records[0];
    const body = JSON.parse(record.body);

    const { message, email, name, id } = body;

    if (!message || !email || !name || !id) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Missing required fields: message, email, name or id.",
        }),
      };
    }

    const { status, reason } = await classifyRequest({ message, email, name });

    console.log(`Categorized as: ${status} - ${reason}`);

    const db = await connectToDatabase();

    const collection = db.collection("ContactRequest");

    const updateResult = await collection.updateOne(
      { id },
      { $set: { status, reason } }
    );

    if (updateResult.matchedCount === 0) {
      console.warn(
        "Could not find matching record in DB to update. Was it saved by Next.js?"
      );
    } else {
      console.log("Successfully updated existing record with AI status.");
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
