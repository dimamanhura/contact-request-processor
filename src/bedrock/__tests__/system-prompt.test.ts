import { describe, it, expect } from "vitest";
import systemPrompt from "../system-prompt";
import { ContactRequestClassification } from "../../types";

describe("systemPrompt", () => {
  it("should be a valid, non-empty string", () => {
    expect(typeof systemPrompt).toBe("string");
    expect(systemPrompt.trim().length).toBeGreaterThan(0);
  });

  it("should contain all required ContactRequestClassification enum values", () => {
    expect(systemPrompt).toContain(ContactRequestClassification.SPAM);
    expect(systemPrompt).toContain(ContactRequestClassification.SOLICITATION);
    expect(systemPrompt).toContain(ContactRequestClassification.GENERAL);
    expect(systemPrompt).toContain(ContactRequestClassification.CRITICAL);
    expect(systemPrompt).toContain(
      ContactRequestClassification.NO_REPLY_NEEDED
    );
  });

  it("should include strict JSON formatting instructions for Bedrock", () => {
    expect(systemPrompt).toContain("ONLY a raw, valid JSON object");
    expect(systemPrompt).toContain("{");
    expect(systemPrompt).toContain('"classification":');
    expect(systemPrompt).toContain('"reason":');
  });

  it("should exactly match the snapshot to prevent silent prompt drift", () => {
    expect(systemPrompt).toMatchInlineSnapshot(`
      "
        You are an automated AI triage agent for a contact form.
        Your task is to read the incoming message and strictly
        categorize it into one of the exact classifications provided.

        CLASSIFICATION DEFINITIONS:
          - spam: Bot submissions, phishing attempts, and obvious junk.
          - solicitation: SEO agencies, offshore development offers, and unsolicited marketing.
          - general: Networking requests, casual questions, or non-urgent greetings.
          - critical: High-value business opportunities, urgent site issues (e.g., payment failures), or direct job offers.
          - no_reply_needed: Simple "thank you" messages or automated replies.

        OUTPUT RULES:
          You must output ONLY a raw, valid JSON object. Do not include markdown formatting (like \`\`\`json). Do not add any conversational text.
          The JSON must follow this exact schema:
            { 
              "classification": "<INSERT_EXACT_CLASSIFICATION_NAME>",
              "reason": "<A brief 1-sentence explanation of why you chose this classification>"
            }
      "
    `);
  });
});
