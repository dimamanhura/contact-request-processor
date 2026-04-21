import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import {
  ClassifyRequestParams,
  ContactRequestStatus,
  ClassificationResult,
} from "../types";
import systemPrompt from "./system-prompt";
import { extractAgentResponse } from "./utils";
import config from "./config";
import getPrompt from "./prompt";
import { logger } from "../logger";

const client = new BedrockRuntimeClient({ region: config.REGION });

export async function classifyRequest({
  name,
  email,
  message,
}: ClassifyRequestParams): Promise<ClassificationResult> {
  const payload = {
    anthropic_version: config.ANTHROPIC_VERSION,
    max_tokens: config.MAX_TOKENS,
    temperature: config.TEMPERATURE,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: getPrompt({ name, email, message }) }],
      },
    ],
  };

  const command = new InvokeModelCommand({
    modelId: config.MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });

  try {
    logger.debug("Sending request to Bedrock", { modelId: config.MODEL_ID });

    const response = await client.send(command);

    logger.debug("Bedrock classification successful");
    return extractAgentResponse(response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("Bedrock Classification Error", {
      error: error instanceof Error ? error : new Error(errorMessage),
      modelId: config.MODEL_ID,
    });

    logger.warn("Using fallback classification due to Bedrock error", {
      fallbackStatus: ContactRequestStatus.GENERAL,
    });

    return {
      status: ContactRequestStatus.GENERAL,
      reason: "Fallback assigned due to AI parsing error.",
    };
  }
}
