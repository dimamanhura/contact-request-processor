import { ConfigResult } from "./types";

export const loadAndValidateConfig = (): ConfigResult => {
  const { MONGODB_URI, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

  const missingVars: string[] = [];

  if (!MONGODB_URI) missingVars.push("MONGODB_URI");
  if (!TELEGRAM_BOT_TOKEN) missingVars.push("TELEGRAM_BOT_TOKEN");
  if (!TELEGRAM_CHAT_ID) missingVars.push("TELEGRAM_CHAT_ID");

  if (missingVars.length > 0) {
    return {
      success: false,
      errorMessage: `Missing critical environment variables: ${missingVars.join(
        ", "
      )}`,
    };
  }

  return {
    success: true,
    data: {
      MONGODB_URI: MONGODB_URI as string,
      TELEGRAM_BOT_TOKEN: TELEGRAM_BOT_TOKEN as string,
      TELEGRAM_CHAT_ID: TELEGRAM_CHAT_ID as string,
    },
  };
};
