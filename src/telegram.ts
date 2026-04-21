import {
  ContactRequestStatus,
  SendMessageParams,
  TelegramConfig,
  StatusConfig,
} from "./types";
import { logger } from "./logger";

const STATUS_MAP: Partial<Record<ContactRequestStatus, StatusConfig>> = {
  [ContactRequestStatus.CRITICAL]: {
    label: "🚨 CRITICAL INQUIRY",
    silent: false,
  },
  [ContactRequestStatus.GENERAL]: { label: "📩 NEW CONTACT", silent: true },
  [ContactRequestStatus.SOLICITATION]: {
    label: "📁 SOLICITATION / PITCH",
    silent: true,
  },
};

const NOTIFIABLE_STATUSES = new Set([
  ContactRequestStatus.CRITICAL,
  ContactRequestStatus.GENERAL,
  ContactRequestStatus.SOLICITATION,
]);

const getStatusConfig = (status: ContactRequestStatus): StatusConfig => {
  return STATUS_MAP[status] ?? { label: "🔍 UNKNOWN CATEGORY", silent: true };
};

const buildMarkdownText = (
  params: SendMessageParams,
  label: string
): string => {
  return [
    `${label}\n`,
    `*From:* ${params.name}`,
    `*Email:* ${params.email}`,
    `*AI Classification:* \`${params.status.toUpperCase()}\`\n`,
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
  if (!NOTIFIABLE_STATUSES.has(params.status)) {
    logger.info("Skipping Telegram notification", {
      ignoredStatus: params.status,
    });
    return { success: true };
  }

  const { label, silent } = getStatusConfig(params.status);
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
