import { describe, it, expect, vi, beforeEach } from "vitest";
import { handler } from "../index";
import { logger } from "../logger";
import { classifyRequest } from "../bedrock";
import { processTelegramNotification } from "../telegram";
import { updateContactRequestClassification } from "../db";
import { parseAndValidateRequest } from "../validator";
import { loadAndValidateConfig } from "../config";
import { SQSEvent, Context, SQSRecordAttributes } from "aws-lambda";
import { ClassificationResult, ConfigResult } from "../types";

vi.mock("../logger", () => ({
  logger: {
    addContext: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../bedrock");
vi.mock("../telegram");
vi.mock("../db");
vi.mock("../validator");
vi.mock("../config");

vi.mock("./response", () => ({
  successResponse: vi.fn(() => ({ statusCode: 200, body: "success" })),
  errorResponse: vi.fn((code: number, msg: string) => ({
    statusCode: code,
    body: msg,
  })),
}));

const mockContext = {
  awsRequestId: "req-12345",
  functionName: "ContactRequestProcessor",
} as Context;

const createMockSqsEvent = (
  bodyPayload: Record<string, unknown>
): SQSEvent => ({
  Records: [
    {
      messageId: "msg-9876",
      receiptHandle: "receipt-handle",
      body: JSON.stringify(bodyPayload),
      attributes: {} as SQSRecordAttributes,
      messageAttributes: {},
      md5OfBody: "md5",
      eventSource: "aws:sqs",
      eventSourceARN: "arn:aws:sqs:region:account:queue",
      awsRegion: "us-east-1",
    },
  ],
});

const VALID_CONFIG = {
  success: true,
  data: {
    MONGODB_URI: "mongodb://cluster.local",
    TELEGRAM_BOT_TOKEN: "secure-bot-token",
    TELEGRAM_CHAT_ID: "-100123456789",
  },
};

const VALID_PAYLOAD = {
  id: "doc-555",
  name: "Jane Doe",
  email: "jane@example.com",
  message: "I need help configuring my pipeline.",
};

describe("Contact Request Processor Lambda", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(loadAndValidateConfig).mockReturnValue(
      VALID_CONFIG as ConfigResult
    );
    vi.mocked(parseAndValidateRequest).mockReturnValue({
      success: true,
      data: VALID_PAYLOAD,
    });
    vi.mocked(classifyRequest).mockResolvedValue({
      classification: "general",
      reason: "Mentions pipeline configuration",
    } as ClassificationResult);
    vi.mocked(updateContactRequestClassification).mockResolvedValue({
      success: true,
    });
    vi.mocked(processTelegramNotification).mockResolvedValue({
      success: true,
    });
  });

  describe("Initialization & Configuration", () => {
    it("should inject context into the logger", async () => {
      await handler(createMockSqsEvent(VALID_PAYLOAD), mockContext);
      expect(logger.addContext).toHaveBeenCalledWith(mockContext);
      expect(logger.addContext).toHaveBeenCalledTimes(1);
    });

    it("should halt and return 500 if configuration is invalid", async () => {
      vi.mocked(loadAndValidateConfig).mockReturnValue({
        success: false,
        errorMessage: "Missing TELEGRAM_BOT_TOKEN",
      });

      const result = await handler(
        createMockSqsEvent(VALID_PAYLOAD),
        mockContext
      );

      expect(result.statusCode).toBe(500);
      expect(logger.error).toHaveBeenCalledWith("Configuration Error", {
        missingVars: "Missing TELEGRAM_BOT_TOKEN",
      });
      expect(parseAndValidateRequest).not.toHaveBeenCalled();
    });
  });

  describe("Payload Validation", () => {
    it("should halt and return 400 if SQS payload is invalid", async () => {
      vi.mocked(parseAndValidateRequest).mockReturnValue({
        success: false,
        errorMessage: "Invalid email format",
      });

      const event = createMockSqsEvent({ bad: "data" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      expect(logger.warn).toHaveBeenCalledWith("Validation Error", {
        error: "Invalid email format",
        payload: event.Records[0].body,
      });
      expect(classifyRequest).not.toHaveBeenCalled();
    });
  });

  describe("Core Workflow (Bedrock -> DB -> Telegram)", () => {
    it("should process a valid request end-to-end successfully", async () => {
      const result = await handler(
        createMockSqsEvent(VALID_PAYLOAD),
        mockContext
      );

      expect(classifyRequest).toHaveBeenCalledWith({
        message: VALID_PAYLOAD.message,
        email: VALID_PAYLOAD.email,
        name: VALID_PAYLOAD.name,
      });

      expect(updateContactRequestClassification).toHaveBeenCalledWith(
        {
          id: VALID_PAYLOAD.id,
          classification: "general",
          reason: "Mentions pipeline configuration",
        },
        VALID_CONFIG.data.MONGODB_URI
      );

      expect(processTelegramNotification).toHaveBeenCalledWith(
        {
          message: VALID_PAYLOAD.message,
          classification: "general",
          reason: "Mentions pipeline configuration",
          email: VALID_PAYLOAD.email,
          name: VALID_PAYLOAD.name,
        },
        {
          botToken: VALID_CONFIG.data.TELEGRAM_BOT_TOKEN,
          chatId: VALID_CONFIG.data.TELEGRAM_CHAT_ID,
        }
      );

      expect(result.statusCode).toBe(200);
    });

    it("should tolerate database update failures without failing the lambda", async () => {
      vi.mocked(updateContactRequestClassification).mockResolvedValue({
        success: false,
        errorMessage: "MongoNetworkError: connection timed out",
      });

      const result = await handler(
        createMockSqsEvent(VALID_PAYLOAD),
        mockContext
      );

      expect(logger.error).toHaveBeenCalledWith("Database Update Failed", {
        error: "MongoNetworkError: connection timed out",
      });
      expect(processTelegramNotification).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
    });

    it("should tolerate Telegram notification failures without failing the lambda", async () => {
      vi.mocked(processTelegramNotification).mockResolvedValue({
        success: false,
        errorMessage: "Telegram API 429: Too Many Requests",
      });

      const result = await handler(
        createMockSqsEvent(VALID_PAYLOAD),
        mockContext
      );

      expect(logger.error).toHaveBeenCalledWith("Telegram Notification Error", {
        error: "Telegram API 429: Too Many Requests",
      });
      expect(result.statusCode).toBe(200);
    });
  });

  describe("Error Handling", () => {
    it("should catch unhandled exceptions, log them, and return 500", async () => {
      const unexpectedError = new Error("Bedrock instance unavailable");
      vi.mocked(classifyRequest).mockRejectedValue(unexpectedError);

      const result = await handler(
        createMockSqsEvent(VALID_PAYLOAD),
        mockContext
      );

      expect(result.statusCode).toBe(500);
      expect(logger.error).toHaveBeenCalledWith(
        "Internal Lambda Error (Unhandled Exception)",
        {
          error: unexpectedError,
        }
      );
    });

    it("should handle non-Error string throws correctly", async () => {
      vi.mocked(classifyRequest).mockRejectedValue("Some weird string error");

      const result = await handler(
        createMockSqsEvent(VALID_PAYLOAD),
        mockContext
      );

      expect(result.statusCode).toBe(500);

      const errorCalls = vi.mocked(logger.error).mock.calls;

      expect(errorCalls.length).toBeGreaterThan(0);

      const [message, payload] = errorCalls[0];

      expect(message).toBe("Internal Lambda Error (Unhandled Exception)");

      const errorPayload = payload as { error: Error };
      expect(errorPayload.error).toBeInstanceOf(Error);
      expect(errorPayload.error.message).toBe("Some weird string error");
    });
  });
});
