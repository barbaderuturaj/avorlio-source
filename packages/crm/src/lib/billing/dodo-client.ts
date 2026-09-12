import DodoPayments from "dodopayments";

export type DodoEnvironment = "test_mode" | "live_mode";

export function getDodoConfig(): {
  apiKey: string;
  webhookKey: string;
  environment: DodoEnvironment;
} | null {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim();
  const environment = process.env.DODO_PAYMENTS_ENVIRONMENT?.trim();
  if (!apiKey || !webhookKey || (environment !== "test_mode" && environment !== "live_mode")) {
    return null;
  }
  return { apiKey, webhookKey, environment };
}

export function getDodoClient(): DodoPayments | null {
  const config = getDodoConfig();
  if (!config) return null;
  return new DodoPayments({
    bearerToken: config.apiKey,
    webhookKey: config.webhookKey,
    environment: config.environment,
  });
}

export type DodoWebhookHeaders = {
  "webhook-id": string;
  "webhook-signature": string;
  "webhook-timestamp": string;
};

export function readDodoWebhookHeaders(headers: Headers): DodoWebhookHeaders | null {
  const id = headers.get("webhook-id")?.trim();
  const signature = headers.get("webhook-signature")?.trim();
  const timestamp = headers.get("webhook-timestamp")?.trim();
  if (!id || !signature || !timestamp) return null;
  return { "webhook-id": id, "webhook-signature": signature, "webhook-timestamp": timestamp };
}

export function unwrapDodoWebhook(
  client: DodoPayments,
  rawBody: string,
  headers: DodoWebhookHeaders,
) {
  return client.webhooks.unwrap(rawBody, { headers });
}
