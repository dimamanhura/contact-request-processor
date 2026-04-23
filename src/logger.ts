import { Logger } from "@aws-lambda-powertools/logger";
import { LogLevel } from "@aws-lambda-powertools/logger/types";

export const initLogger = (customLogLevel?: string): Logger => {
  return new Logger({
    serviceName: "ContactRequestProcessor",
    logLevel: (customLogLevel || process.env.LOG_LEVEL || "INFO") as LogLevel,
  });
};

export const logger = initLogger();
