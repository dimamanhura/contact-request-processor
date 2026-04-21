import { ContactRequestStatus } from "./contact-request-status";

export interface SendMessageParams {
  message: string;
  email: string;
  name: string;
  status: ContactRequestStatus;
  reason: string;
}
