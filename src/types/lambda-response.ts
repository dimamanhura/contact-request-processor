export interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}
