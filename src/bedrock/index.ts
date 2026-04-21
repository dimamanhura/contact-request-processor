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
    const response = await client.send(command);
    return extractAgentResponse(response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Bedrock Classification Error:", errorMessage);

    return {
      status: ContactRequestStatus.GENERAL,
      reason: "Fallback assigned due to AI parsing error.",
    };
  }
}
