import {
  ContactRequestClassification,
  ClassificationConfig,
  SendMessageParams,
  TelegramConfig,
} from "./types";
import { logger } from "./logger";

const CLASSIFICATION_MAP: Partial<
  Record<ContactRequestClassification, ClassificationConfig>
> = {
  [ContactRequestClassification.CRITICAL]: {
    label: "🚨 CRITICAL INQUIRY",
    silent: false,
  },
  [ContactRequestClassification.GENERAL]: {
    label: "📩 NEW CONTACT",
    silent: true,
  },
  [ContactRequestClassification.SOLICITATION]: {
    label: "📁 SOLICITATION / PITCH",
    silent: true,
  },
};

const NOTIFIABLE_CLASSIFICATIONS = new Set([
  ContactRequestClassification.CRITICAL,
  ContactRequestClassification.GENERAL,
  ContactRequestClassification.SOLICITATION,
]);

const getClassificationConfig = (
  classification: ContactRequestClassification
): ClassificationConfig => {
  return (
    CLASSIFICATION_MAP[classification] ?? {
      label: "🔍 UNKNOWN CATEGORY",
      silent: true,
    }
  );
};

const buildMarkdownText = (
  params: SendMessageParams,
  label: string
): string => {
  return [
    `${label}\n`,
    `*From:* ${params.name}`,
    `*Email:* ${params.email}`,
    `*AI Classification:* \`${params.classification.toUpperCase()}\`\n`,
    `*AI Reasoning:*`,
    `_${params.reason}_\n`,
    `*Message:*`,
    `\`\`\``,
    params.message,
    `\`\`\``,
  ].join("\n");
};

export const processTelegramNotification = async (
  params: SendMessageParams,
  config: TelegramConfig
): Promise<{ success: boolean; errorMessage?: string }> => {
  if (!NOTIFIABLE_CLASSIFICATIONS.has(params.classification)) {
    logger.info("Skipping Telegram notification", {
      ignoredClassification: params.classification,
    });
    return { success: true };
  }

  const { label, silent } = getClassificationConfig(params.classification);
  const text = buildMarkdownText(params, label);

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${config.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parse_mode: "Markdown",
          chat_id: config.chatId,
          text,
          disable_notification: silent,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      logger.error("Telegram API Error", {
        httpStatus: response.status,
        telegramResponse: errorData,
        chatId: config.chatId,
      });
      return {
        success: false,
        errorMessage: "Failed to forward message to Telegram.",
      };
    }

    logger.debug("Telegram message sent successfully");
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Telegram Network Error", {
      error: error instanceof Error ? error : new Error(errorMessage),
    });
    return {
      success: false,
      errorMessage: "Internal error while contacting Telegram.",
    };
  }
};
