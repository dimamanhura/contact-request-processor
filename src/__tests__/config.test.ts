import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadAndValidateConfig } from "../config";

describe("loadAndValidateConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return success and the config data when all variables are present", () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/testdb";
    process.env.TELEGRAM_BOT_TOKEN = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz";
    process.env.TELEGRAM_CHAT_ID = "-100123456789";

    const result = loadAndValidateConfig();

    expect(result).toEqual({
      success: true,
      data: {
        MONGODB_URI: "mongodb://localhost:27017/testdb",
        TELEGRAM_BOT_TOKEN: "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
        TELEGRAM_CHAT_ID: "-100123456789",
      },
    });
  });

  it("should return a failure result listing a single missing variable", () => {
    delete process.env.MONGODB_URI;
    process.env.TELEGRAM_BOT_TOKEN = "valid-token";
    process.env.TELEGRAM_CHAT_ID = "valid-chat-id";

    const result = loadAndValidateConfig();

    expect(result).toEqual({
      success: false,
      errorMessage: "Missing critical environment variables: MONGODB_URI",
    });
  });

  it("should return a failure result listing multiple missing variables", () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/testdb";
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;

    const result = loadAndValidateConfig();

    expect(result).toEqual({
      success: false,
      errorMessage:
        "Missing critical environment variables: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID",
    });
  });

  it("should return a failure result listing all variables if none are set", () => {
    delete process.env.MONGODB_URI;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;

    const result = loadAndValidateConfig();

    expect(result).toEqual({
      success: false,
      errorMessage:
        "Missing critical environment variables: MONGODB_URI, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID",
    });
  });
});
