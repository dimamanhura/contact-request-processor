import { AppConfig } from "./app-config";

export type ConfigResult =
  | { success: true; data: AppConfig }
  | { success: false; errorMessage: string };
