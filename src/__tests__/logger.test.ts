import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Logger } from "@aws-lambda-powertools/logger";
import { initLogger, logger } from "../logger";

describe("Logger configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should export a pre-initialized singleton logger instance", () => {
    expect(logger).toBeInstanceOf(Logger);
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("should default to INFO level if no environment variable is set", () => {
    delete process.env.LOG_LEVEL;

    const testLogger = initLogger();

    expect(testLogger.getLevelName()).toBe("INFO");
  });

  it("should use the LOG_LEVEL environment variable if present", () => {
    process.env.LOG_LEVEL = "DEBUG";

    const testLogger = initLogger();

    expect(testLogger.getLevelName()).toBe("DEBUG");
  });

  it("should prioritize a custom override argument over the environment variable", () => {
    process.env.LOG_LEVEL = "DEBUG";

    const testLogger = initLogger("WARN");

    expect(testLogger.getLevelName()).toBe("WARN");
  });
});
