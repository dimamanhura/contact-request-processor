import { SQSEvent, Context } from "aws-lambda";
import { logger } from "./logger";
import { classifyRequest } from "./bedrock";
import { processTelegramNotification } from "./telegram";
import { updateContactRequestClassification } from "./db";
import { LambdaResponse } from "./types";
import { parseAndValidateRequest } from "./validator";
import { successResponse, errorResponse } from "./response";
import { loadAndValidateConfig } from "./config";

export const handler = async (
  event: SQSEvent,
  context: Context
): Promise<LambdaResponse> => {
  logger.addContext(context);

  try {
    logger.info("Step 1: Checking configuration");
    const config = loadAndValidateConfig();

    if (!config.success) {
      logger.error("Configuration Error", { missingVars: config.errorMessage });
      return errorResponse(500, "Internal Server Configuration Error.");
    }

    const { MONGODB_URI, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = config.data;

    const record = event.Records[0];

    logger.info("Step 2: Parsing request data", {
      messageId: record.messageId,
    });
    const validation = parseAndValidateRequest(record.body);

    if (!validation.success) {
      logger.warn("Validation Error", {
        error: validation.errorMessage,
        payload: record.body,
      });
      return errorResponse(400, validation.errorMessage);
    }

    const { message, email, name, id } = validation.data;

    logger.info("Request validated successfully", { id, email });

    logger.info("Step 3: Starting Bedrock classification request");
    const { classification, reason } = await classifyRequest({
      message,
      email,
      name,
    });
    logger.info("Classification successful", { classification, reason });

    logger.info("Step 4: Starting database update", { documentId: id });
    const dbResult = await updateContactRequestClassification(
      { id, classification, reason },
      MONGODB_URI
    );

    if (!dbResult.success) {
      logger.error("Database Update Failed", { error: dbResult.errorMessage });
    } else {
      logger.info("Database update completed");
    }

    logger.info("Step 5: Starting Telegram notification");
    const telegramResult = await processTelegramNotification(
      { message, classification, reason, email, name },
      { botToken: TELEGRAM_BOT_TOKEN, chatId: TELEGRAM_CHAT_ID }
    );

    if (!telegramResult.success) {
      logger.error("Telegram Notification Error", {
        error: telegramResult.errorMessage,
      });
    } else {
      logger.info("Telegram notification completed");
    }

    return successResponse();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Internal Lambda Error (Unhandled Exception)", {
      error: error instanceof Error ? error : new Error(errorMessage),
    });
    return errorResponse(500, "Internal Server Error.");
  }
};
