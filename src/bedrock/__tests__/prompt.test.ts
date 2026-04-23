import { describe, it, expect } from "vitest";
import getPrompt from "../prompt";

describe("getPrompt", () => {
  it("should generate the correct prompt string with standard inputs", () => {
    const params = {
      name: "John Doe",
      email: "john.doe@example.com",
      message: "I need help setting up my account.",
    };

    const result = getPrompt(params);

    expect(result).toContain("Name: John Doe");
    expect(result).toContain("Email: john.doe@example.com");
    expect(result).toContain(
      "Message: <contact_message>I need help setting up my account.</contact_message>"
    );
    expect(result).toContain("Please classify the following contact request:");
  });

  it("should handle empty strings gracefully", () => {
    const params = {
      name: "",
      email: "",
      message: "",
    };

    const result = getPrompt(params);

    expect(result).toContain("Name: ");
    expect(result).toContain("Email: ");
    expect(result).toContain("Message: <contact_message></contact_message>");
  });

  it("should exactly match a snapshot to prevent accidental layout changes", () => {
    const params = {
      name: "Jane Smith",
      email: "jane@test.com",
      message: "Hello world",
    };

    const result = getPrompt(params);

    expect(result).toMatchInlineSnapshot(`
      "
          Please classify the following contact request:
            Name: Jane Smith
            Email: jane@test.com
            Message: <contact_message>Hello world</contact_message>
        "
    `);
  });
});
