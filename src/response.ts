import { LambdaResponse } from "./types";

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

export const buildResponse = (
  statusCode: number,
  bodyData: Record<string, unknown>
): LambdaResponse => {
  return {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(bodyData),
  };
};

export const successResponse = (
  message: string = "Request processed successfully."
): LambdaResponse => {
  return buildResponse(200, { success: true, message });
};

export const errorResponse = (
  statusCode: number,
  errorMessage: string
): LambdaResponse => {
  return buildResponse(statusCode, { error: errorMessage });
};
