import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getClassificationConfig,
  processTelegramNotification,
} from "../telegram";
import { ContactRequestClassification } from "../types";
import { logger } from "../logger";

vi.mock("../logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("getClassificationConfig", () => {
  it("should return the fallback configuration for an unknown or unmapped classification", () => {
    const result = getClassificationConfig(
      "SOME_WEIRD_UNMAPPED_TYPE" as ContactRequestClassification
    );

    expect(result).toEqual({
      label: "🔍 UNKNOWN CATEGORY",
      silent: true,
    });
  });
});

describe("processTelegramNotification", () => {
  const mockConfig = {
    botToken: "mock-bot-token",
    chatId: "-100987654321",
  };

  const baseParams = {
    name: "John Doe",
    email: "john@example.com",
    message: "I need help with my account.",
    reason: "Standard inquiry.",
    classification: ContactRequestClassification.GENERAL,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should skip the notification and return success if the classification is ignored (e.g., SPAM)", async () => {
    const spamParams = {
      ...baseParams,
      classification: ContactRequestClassification.SPAM,
    };

    const result = await processTelegramNotification(spamParams, mockConfig);

    expect(result.success).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("Skipping Telegram notification", {
      ignoredClassification: ContactRequestClassification.SPAM,
    });
  });

  it("should send a CRITICAL request as a loud notification", async () => {
    fetchMock.mockResolvedValue({ ok: true });

    const criticalParams = {
      ...baseParams,
      classification: ContactRequestClassification.CRITICAL,
    };

    const result = await processTelegramNotification(
      criticalParams,
      mockConfig
    );

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `https://api.telegram.org/bot${mockConfig.botToken}/sendMessage`
    );

    const body = JSON.parse(options.body as string) as {
      chat_id: string;
      disable_notification: boolean;
      text: string;
    };
    expect(body.chat_id).toBe(mockConfig.chatId);
    expect(body.disable_notification).toBe(false);
    expect(body.text).toContain("🚨 CRITICAL INQUIRY");
    expect(body.text).toContain(criticalParams.name);

    expect(logger.debug).toHaveBeenCalledWith(
      "Telegram message sent successfully"
    );
  });

  it("should send a GENERAL request as a silent notification", async () => {
    fetchMock.mockResolvedValue({ ok: true });

    const result = await processTelegramNotification(baseParams, mockConfig);

    expect(result.success).toBe(true);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as {
      chat_id: string;
      disable_notification: boolean;
      text: string;
    };

    expect(body.disable_notification).toBe(true);
    expect(body.text).toContain("📩 NEW CONTACT");
  });

  it("should handle Telegram API errors gracefully (!response.ok)", async () => {
    const mockErrorText = "Bad Request: chat not found";

    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: vi.fn().mockResolvedValue(mockErrorText),
    });

    const result = await processTelegramNotification(baseParams, mockConfig);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe("Failed to forward message to Telegram.");
    expect(logger.error).toHaveBeenCalledWith("Telegram API Error", {
      httpStatus: 400,
      telegramResponse: mockErrorText,
      chatId: mockConfig.chatId,
    });
  });

  it("should handle network connection errors natively thrown by fetch", async () => {
    const networkError = new Error("ECONNREFUSED");
    fetchMock.mockRejectedValue(networkError);

    const result = await processTelegramNotification(baseParams, mockConfig);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe(
      "Internal error while contacting Telegram."
    );
    expect(logger.error).toHaveBeenCalledWith("Telegram Network Error", {
      error: networkError,
    });
  });

  it("should handle non-Error string throws during the fetch process", async () => {
    const bizarreStringError = "DNS Resolution Failed";
    fetchMock.mockRejectedValue(bizarreStringError);

    const result = await processTelegramNotification(baseParams, mockConfig);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe(
      "Internal error while contacting Telegram."
    );

    expect(logger.error).toHaveBeenCalledWith("Telegram Network Error", {
      error: new Error(bizarreStringError),
    });
  });
});
