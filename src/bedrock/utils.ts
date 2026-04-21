import { InvokeModelCommandOutput } from "@aws-sdk/client-bedrock-runtime";
import { BedrockResponseBody, ClassificationResult } from "../types";

export const extractAgentResponse = (response: InvokeModelCommandOutput) => {
  if (!response.body) {
    throw new Error("Received empty response body from Bedrock");
  }

  const responseBody = JSON.parse(
    new TextDecoder().decode(response.body)
  ) as BedrockResponseBody;

  const aiResponseText = responseBody.content?.[0]?.text || "";

  const cleanJsonString = aiResponseText
    .replace(/```json\n?|\n?```/g, "")
    .trim();

  return JSON.parse(cleanJsonString) as ClassificationResult;
};
