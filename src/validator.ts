import { ValidationRequestResult } from "./types";

export const parseAndValidateRequest = (
  bodyString: string
): ValidationRequestResult => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(bodyString);
  } catch {
    return { success: false, errorMessage: "Malformed JSON payload." };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { success: false, errorMessage: "Payload must be a JSON object." };
  }

  const body = parsed as Record<string, unknown>;

  if (typeof body.message !== "string" || !body.message.trim()) {
    return { success: false, errorMessage: "Missing or invalid 'message'." };
  }
  if (typeof body.email !== "string" || !body.email.trim()) {
    return { success: false, errorMessage: "Missing or invalid 'email'." };
  }
  if (typeof body.name !== "string" || !body.name.trim()) {
    return { success: false, errorMessage: "Missing or invalid 'name'." };
  }
  if (typeof body.id !== "string" || !body.id.trim()) {
    return { success: false, errorMessage: "Missing or invalid 'id'." };
  }

  return {
    success: true,
    data: {
      message: body.message,
      email: body.email,
      name: body.name,
      id: body.id,
    },
  };
};
