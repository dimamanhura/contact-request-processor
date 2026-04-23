import { describe, it, expect } from "vitest";
import systemPrompt from "../system-prompt";
import { ContactRequestStatus } from "../../types";

describe("systemPrompt", () => {
  it("should be a valid, non-empty string", () => {
    expect(typeof systemPrompt).toBe("string");
    expect(systemPrompt.trim().length).toBeGreaterThan(0);
  });

  it("should contain all required ContactRequestStatus enum values", () => {
    expect(systemPrompt).toContain(ContactRequestStatus.SPAM);
    expect(systemPrompt).toContain(ContactRequestStatus.SOLICITATION);
    expect(systemPrompt).toContain(ContactRequestStatus.GENERAL);
    expect(systemPrompt).toContain(ContactRequestStatus.CRITICAL);
    expect(systemPrompt).toContain(ContactRequestStatus.NO_REPLY_NEEDED);
  });

  it("should include strict JSON formatting instructions for Bedrock", () => {
    expect(systemPrompt).toContain("ONLY a raw, valid JSON object");
    expect(systemPrompt).toContain("{");
    expect(systemPrompt).toContain('"status":');
    expect(systemPrompt).toContain('"reason":');
  });

  it("should exactly match the snapshot to prevent silent prompt drift", () => {
    expect(systemPrompt).toMatchInlineSnapshot(`
      "
        You are an automated AI triage agent for a contact form.
        Your task is to read the incoming message and strictly
        categorize it into one of the exact statuses provided.

        STATUS DEFINITIONS:
          - spam: Bot submissions, phishing attempts, and obvious junk.
          - solicitation: SEO agencies, offshore development offers, and unsolicited marketing.
          - general: Networking requests, casual questions, or non-urgent greetings.
          - critical: High-value business opportunities, urgent site issues (e.g., payment failures), or direct job offers.
          - no_reply_needed: Simple "thank you" messages or automated replies.

        OUTPUT RULES:
          You must output ONLY a raw, valid JSON object. Do not include markdown formatting (like \`\`\`json). Do not add any conversational text.
          The JSON must follow this exact schema:
            { 
              "status": "<INSERT_EXACT_STATUS_NAME>",
              "reason": "<A brief 1-sentence explanation of why you chose this status>"
            }
      "
    `);
  });
});
