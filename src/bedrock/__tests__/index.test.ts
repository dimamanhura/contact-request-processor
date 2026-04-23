import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandOutput,
} from "@aws-sdk/client-bedrock-runtime";
import { classifyRequest } from "../index";
import { ContactRequestStatus } from "../../types";
import config from "../config";
import { logger } from "../../logger";
import * as utils from "../utils";

const bedrockMock = mockClient(BedrockRuntimeClient);

vi.mock("../utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils")>();
  return {
    ...actual,
    extractAgentResponse: vi.fn(),
  };
});

describe("classifyRequest", () => {
  beforeEach(() => {
    bedrockMock.reset();
    vi.clearAllMocks();

    vi.spyOn(logger, "debug").mockImplementation(() => {});
    vi.spyOn(logger, "info").mockImplementation(() => {});
    vi.spyOn(logger, "warn").mockImplementation(() => {});
    vi.spyOn(logger, "error").mockImplementation(() => {});
  });

  const mockParams = {
    name: "Danik",
    email: "danik@example.com",
    message: "Security issue at the resort.",
  };

  it("should successfully call Bedrock, log debug events, and return the classification", async () => {
    const expectedAgentResponse = {
      status: ContactRequestStatus.CRITICAL,
      reason: "Mention of security issues.",
    };

    bedrockMock.on(InvokeModelCommand).resolves({
      $metadata: { httpStatusCode: 200 },
      body: new Uint8Array() as unknown as InvokeModelCommandOutput["body"],
    });

    vi.mocked(utils.extractAgentResponse).mockReturnValue(
      expectedAgentResponse
    );

    const result = await classifyRequest(mockParams);

    expect(result).toEqual(expectedAgentResponse);
    expect(bedrockMock.calls()).toHaveLength(1);

    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(logger.debug).toHaveBeenNthCalledWith(
      1,
      "Sending request to Bedrock",
      { modelId: config.MODEL_ID }
    );
    expect(logger.debug).toHaveBeenNthCalledWith(
      2,
      "Bedrock classification successful"
    );
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("should handle a standard Error, log it, and return a GENERAL fallback", async () => {
    const mockError = new Error("AWS Bedrock ThrottlingException");
    bedrockMock.on(InvokeModelCommand).rejects(mockError);

    const result = await classifyRequest(mockParams);

    expect(result).toEqual({
      status: ContactRequestStatus.GENERAL,
      reason: "Fallback assigned due to AI parsing error.",
    });

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith("Bedrock Classification Error", {
      error: mockError,
      modelId: config.MODEL_ID,
    });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      "Using fallback classification due to Bedrock error",
      { fallbackStatus: ContactRequestStatus.GENERAL }
    );
  });

  it("should handle a non-Error string throw, wrap it in an Error, and log it", async () => {
    const bizarreStringError = "Something went terribly wrong";
    bedrockMock.on(InvokeModelCommand).rejects(bizarreStringError);

    const result = await classifyRequest(mockParams);

    expect(result.status).toBe(ContactRequestStatus.GENERAL);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith("Bedrock Classification Error", {
      error: new Error(bizarreStringError),
      modelId: config.MODEL_ID,
    });
  });
});
