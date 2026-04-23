import { ContactRequestClassification } from "./contact-request-classification";

export interface ClassificationResult {
  classification: ContactRequestClassification;
  reason: string;
}
