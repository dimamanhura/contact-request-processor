import { ContactRequestBody } from "./contact-request-body";

export type ValidationRequestResult =
  | { success: true; data: ContactRequestBody }
  | { success: false; errorMessage: string };
