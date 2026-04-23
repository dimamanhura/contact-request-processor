import { describe, it, expect } from "vitest";
import { buildResponse, successResponse, errorResponse } from "../response";

describe("Response Builders", () => {
  const DEFAULT_HEADERS = {
    "Content-Type": "application/json",
  };

  describe("buildResponse", () => {
    it("should construct a valid Lambda response with a stringified body", () => {
      const statusCode = 201;
      const bodyData = { id: "123", status: "created" };

      const result = buildResponse(statusCode, bodyData);

      expect(result).toEqual({
        statusCode: 201,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify(bodyData),
      });
    });
  });

  describe("successResponse", () => {
    it("should use the default message when no argument is provided", () => {
      const result = successResponse();

      expect(result.statusCode).toBe(200);
      expect(result.headers).toEqual(DEFAULT_HEADERS);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        message: "Request processed successfully.",
      });
    });

    it("should use a custom message when provided", () => {
      const result = successResponse("Custom success message!");

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        message: "Custom success message!",
      });
    });
  });

  describe("errorResponse", () => {
    it("should construct a 400 Bad Request error correctly", () => {
      const result = errorResponse(400, "Invalid input data.");

      expect(result.statusCode).toBe(400);
      expect(result.headers).toEqual(DEFAULT_HEADERS);
      expect(JSON.parse(result.body)).toEqual({
        error: "Invalid input data.",
      });
    });

    it("should construct a 500 Internal Server Error correctly", () => {
      const result = errorResponse(500, "Database connection failed.");

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        error: "Database connection failed.",
      });
    });
  });
});
