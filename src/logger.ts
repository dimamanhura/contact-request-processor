import { Logger } from "@aws-lambda-powertools/logger";

export const initLogger = (customLogLevel?: string): Logger => {
  return new Logger({
    serviceName: "ContactRequestProcessor",
    logLevel: (customLogLevel || process.env.LOG_LEVEL || "INFO") as any,
  });
};

export const logger = initLogger();
