import { describe, it, expect } from "vitest";
import { parseAndValidateRequest } from "../validator";

describe("parseAndValidateRequest", () => {
  const validPayload = {
    message: "I have a question about my account.",
    email: "user@example.com",
    name: "Jane Doe",
    id: "req-98765",
  };

  it("should successfully parse and return data for a perfectly valid payload", () => {
    const result = parseAndValidateRequest(JSON.stringify(validPayload));

    expect(result).toEqual({
      success: true,
      data: validPayload,
    });
  });

  it("should return an error if the payload is malformed JSON", () => {
    const result = parseAndValidateRequest("{ bad json, missing quotes }");

    expect(result).toEqual({
      success: false,
      errorMessage: "Malformed JSON payload.",
    });
  });

  it("should return an error if the payload is null", () => {
    const result = parseAndValidateRequest("null");

    expect(result).toEqual({
      success: false,
      errorMessage: "Payload must be a JSON object.",
    });
  });

  it("should return an error if the payload is a JSON Array instead of an Object", () => {
    const result = parseAndValidateRequest(JSON.stringify([validPayload]));

    expect(result).toEqual({
      success: false,
      errorMessage: "Payload must be a JSON object.",
    });
  });

  it("should return an error if the payload parses to a primitive type (like a string)", () => {
    const result = parseAndValidateRequest('"just a random string"');

    expect(result).toEqual({
      success: false,
      errorMessage: "Payload must be a JSON object.",
    });
  });

  const requiredFields = ["message", "email", "name", "id"] as const;

  requiredFields.forEach((field) => {
    it(`should return an error if '${field}' is completely missing`, () => {
      const badPayload = { ...validPayload };
      delete badPayload[field as keyof typeof badPayload];

      const result = parseAndValidateRequest(JSON.stringify(badPayload));

      expect(result).toEqual({
        success: false,
        errorMessage: `Missing or invalid '${field}'.`,
      });
    });

    it(`should return an error if '${field}' is not a string (e.g., a number)`, () => {
      const badPayload = { ...validPayload, [field]: 12345 };

      const result = parseAndValidateRequest(JSON.stringify(badPayload));

      expect(result).toEqual({
        success: false,
        errorMessage: `Missing or invalid '${field}'.`,
      });
    });

    it(`should return an error if '${field}' is an empty string or just whitespace`, () => {
      const badPayload = { ...validPayload, [field]: "    \n  " };

      const result = parseAndValidateRequest(JSON.stringify(badPayload));

      expect(result).toEqual({
        success: false,
        errorMessage: `Missing or invalid '${field}'.`,
      });
    });
  });
});
