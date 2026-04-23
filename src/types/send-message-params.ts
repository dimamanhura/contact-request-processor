import { ContactRequestClassification } from "./contact-request-classification";

export interface SendMessageParams {
  classification: ContactRequestClassification;
  message: string;
  email: string;
  name: string;
  reason: string;
}
