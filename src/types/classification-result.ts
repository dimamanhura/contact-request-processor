import { ContactRequestStatus } from "./contact-request-status";

export interface ClassificationResult {
  status: ContactRequestStatus;
  reason: string;
}
