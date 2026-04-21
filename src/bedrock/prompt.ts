import { ClassifyRequestParams } from "../types";

const getPrompt = ({ name, email, message }: ClassifyRequestParams): string => {
  return `
    Please classify the following contact request:
      Name: ${name}
      Email: ${email}
      Message: <contact_message>${message}</contact_message>
  `;
};

export default getPrompt;
