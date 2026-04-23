import { InvokeModelCommandOutput } from "@aws-sdk/client-bedrock-runtime";
import { describe, it, expect } from "vitest";
import { extractAgentResponse } from "../utils";

describe("extractAgentResponse", () => {
  const encodeBody = (payload: unknown) => {
    return new TextEncoder().encode(JSON.stringify(payload));
  };

  it("should successfully parse a clean JSON response", () => {
    const expectedResult = {
      classification: "GENERAL",
      reason: "Standard inquiry without urgency.",
    };

    const mockBedrockResponse = {
      content: [{ text: JSON.stringify(expectedResult) }],
    };

    const response = {
      body: encodeBody(mockBedrockResponse),
    } as InvokeModelCommandOutput;

    const result = extractAgentResponse(response);

    expect(result).toEqual(expectedResult);
  });

  it("should successfully strip markdown formatting and parse the JSON", () => {
    const expectedResult = {
      classification: "SPAM",
      reason: "Contains suspicious links.",
    };

    const aiTextWithMarkdown = `\`\`\`json\n${JSON.stringify(
      expectedResult
    )}\n\`\`\``;

    const mockBedrockResponse = {
      content: [{ text: aiTextWithMarkdown }],
    };

    const response = {
      body: encodeBody(mockBedrockResponse),
    } as InvokeModelCommandOutput;

    const result = extractAgentResponse(response);

    expect(result).toEqual(expectedResult);
  });

  it("should throw an Error if the response body is entirely missing", () => {
    const response = {} as InvokeModelCommandOutput;

    expect(() => extractAgentResponse(response)).toThrow(
      "Received empty response body from Bedrock"
    );
  });

  it("should throw a SyntaxError if the AI content array is empty", () => {
    const mockBedrockResponse = {
      content: [],
    };

    const response = {
      body: encodeBody(mockBedrockResponse),
    } as InvokeModelCommandOutput;

    expect(() => extractAgentResponse(response)).toThrow(SyntaxError);
  });

  it("should throw a SyntaxError if the AI returns conversational plain text instead of JSON", () => {
    const mockBedrockResponse = {
      content: [
        { text: "I believe this contact request is a general inquiry." },
      ],
    };

    const response = {
      body: encodeBody(mockBedrockResponse),
    } as InvokeModelCommandOutput;

    expect(() => extractAgentResponse(response)).toThrow(SyntaxError);
  });
});
