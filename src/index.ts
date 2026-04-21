import { SQSEvent } from "aws-lambda";
import { classifyRequest } from "./bedrock";
import { processTelegramNotification } from "./telegram";
import { updateContactRequestStatus } from "./db";
import { LambdaResponse } from "./types";
import { parseAndValidateRequest } from "./validator";
import { successResponse, errorResponse } from "./response";
import { loadAndValidateConfig } from "./config";

export const handler = async (event: SQSEvent): Promise<LambdaResponse> => {
  try {
    const config = loadAndValidateConfig();

    if (!config.success) {
      console.error(config.errorMessage);
      return errorResponse(500, "Internal Server Configuration Error.");
    }

    const { MONGODB_URI, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = config.data;

    const record = event.Records[0];

    const validation = parseAndValidateRequest(record.body);

    if (!validation.success) {
      return errorResponse(400, validation.errorMessage);
    }

    const { message, email, name, id } = validation.data;

    const { status, reason } = await classifyRequest({ message, email, name });

    await updateContactRequestStatus({ id, status, reason }, MONGODB_URI);

    const telegramResult = await processTelegramNotification(
      {
        message,
        status,
        reason,
        email,
        name,
      },
      { botToken: TELEGRAM_BOT_TOKEN, chatId: TELEGRAM_CHAT_ID }
    );

    if (!telegramResult.success) {
      return errorResponse(
        502,
        telegramResult.errorMessage || "Telegram Error"
      );
    }

    return successResponse();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Internal Lambda Error:", errorMessage);
    return errorResponse(500, "Internal Server Error.");
  }
};
