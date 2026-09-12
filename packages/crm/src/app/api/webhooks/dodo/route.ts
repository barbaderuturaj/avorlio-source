import { NextResponse } from "next/server";
import { getDodoClient, readDodoWebhookHeaders, unwrapDodoWebhook } from "@/lib/billing/dodo-client";
import {
  applyDodoSubscriptionState,
  dodoEventCreatesOnboardingLink,
  isDodoPlatformSubscriptionMetadata,
  type DodoSubscriptionPayload,
} from "@/lib/billing/dodo-subscription";

const SUBSCRIPTION_EVENTS = new Set([
  "subscription.active", "subscription.updated", "subscription.renewed",
  "subscription.on_hold", "subscription.cancelled", "subscription.failed", "subscription.expired",
]);

export async function POST(request: Request) {
  const client = getDodoClient();
  const headers = readDodoWebhookHeaders(request.headers);
  if (!client || !headers) {
    return NextResponse.json({ error: "Webhook not configured or headers missing" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event;
  try {
    event = unwrapDodoWebhook(client, rawBody, headers);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  if (!SUBSCRIPTION_EVENTS.has(event.type)) return NextResponse.json({ ok: true, ignored: true });
  const payload = event.data as DodoSubscriptionPayload;
  const metadata = payload.metadata ?? {};
  const productId = process.env.DODO_PAYMENTS_HVAC_PRODUCT_ID?.trim();
  if (!isDodoPlatformSubscriptionMetadata(metadata, productId ?? "", payload.product_id)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const result = await applyDodoSubscriptionState({
    orgId: metadata.orgId,
    eventId: headers["webhook-id"],
    payload,
    createOnboardingLink: dodoEventCreatesOnboardingLink(event.type, payload.status),
  });
  return NextResponse.json({ ok: true, applied: result.applied });
}
