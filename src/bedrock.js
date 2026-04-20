const {
  BedrockRuntimeClient,
  InvokeModelCommand,
} = require("@aws-sdk/client-bedrock-runtime");
const { CONTACT_REQUEST_STATUSES } = require("./constants");

const client = new BedrockRuntimeClient({ region: "us-east-1" });

async function classifyRequest({ name, email, message }) {
  const systemPrompt = `
    You are an automated AI triage agent for a contact form.
    Your task is to read the incoming message and strictly
    categorize it into one of the exact statuses provided.

    STATUS DEFINITIONS:
      - ${CONTACT_REQUEST_STATUSES.SPAM}: Bot submissions, phishing attempts, and obvious junk.
      - ${CONTACT_REQUEST_STATUSES.SOLICITATION}: SEO agencies, offshore development offers, and unsolicited marketing.
      - ${CONTACT_REQUEST_STATUSES.GENERAL}: Networking requests, casual questions, or non-urgent greetings.
      - ${CONTACT_REQUEST_STATUSES.CRITICAL}: High-value business opportunities, urgent site issues (e.g., payment failures), or direct job offers.
      - ${CONTACT_REQUEST_STATUSES.NO_REPLY_NEEDED}: Simple "thank you" messages or automated replies.

    OUTPUT RULES:
      You must output ONLY a raw, valid JSON object. Do not include markdown formatting (like \`\`\`json). Do not add any conversational text.
      The JSON must follow this exact schema:
        { 
          "status": "<INSERT_EXACT_STATUS_NAME>",
          "reason": "<A brief 1-sentence explanation of why you chose this status>"
        }
    `;

  const userMessage = `
    Please classify the following contact request:
    Name: ${name}
    Email: ${email}
    Message: <contact_message>${message}</contact_message>
  `;

  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 200,
    temperature: 0.1,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: userMessage }],
      },
    ],
  };

  const command = new InvokeModelCommand({
    modelId: "anthropic.claude-3-haiku-20240307-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });

  try {
    const response = await client.send(command);

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const aiResponseText = responseBody.content[0].text;

    const cleanJsonString = aiResponseText
      .replace(/```json\n?|\n?```/g, "")
      .trim();

    return JSON.parse(cleanJsonString);
  } catch (error) {
    console.error("Bedrock Classification Error:", error);
    return {
      status: "general",
      reason: "Fallback assigned due to AI parsing error.",
    };
  }
}

module.exports = { classifyRequest };
