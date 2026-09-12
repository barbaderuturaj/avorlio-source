import { sql } from "drizzle-orm";
import { db } from "@/db";
import { organizations, type OrganizationSubscription } from "@/db/schema";
import { createOrGetPendingOnboardingLink } from "@/lib/onboarding/links";
import { seedOnboardingForm } from "@/lib/onboarding/onboarding-form-definition";
import { DODO_PLATFORM_TIER } from "./dodo-checkout";

export type DodoSubscriptionStatus = NonNullable<OrganizationSubscription["dodoStatus"]>;

export function dodoStatusGrantsEntitlement(status: DodoSubscriptionStatus): boolean {
  return status === "active";
}

export function dodoEventIsAlreadyProcessed(processedEventIds: string[], eventId: string): boolean {
  return processedEventIds.includes(eventId);
}

export function isDodoPlatformSubscriptionMetadata(
  metadata: Record<string, string> | null | undefined,
  productId: string,
  payloadProductId: string,
): boolean {
  return metadata?.purchaseType === "platform_subscription"
    && metadata.offer === "avorlio_hvac"
    && Boolean(metadata.orgId)
    && Boolean(productId)
    && payloadProductId === productId;
}

export function dodoEventCreatesOnboardingLink(eventType: string, status: DodoSubscriptionStatus): boolean {
  return eventType === "subscription.active" && status === "active";
}

export type DodoSubscriptionPayload = {
  subscription_id: string;
  product_id: string;
  status: DodoSubscriptionStatus;
  customer?: { customer_id?: string } | null;
  metadata?: Record<string, string> | null;
  previous_billing_date?: string | null;
  next_billing_date?: string | null;
};

type DodoSubscriptionUpdateInput = {
  orgId: string;
  eventId: string;
  payload: DodoSubscriptionPayload;
};

export function buildDodoSubscriptionUpdateQuery({
  orgId,
  eventId,
  payload,
}: DodoSubscriptionUpdateInput) {
  const active = dodoStatusGrantsEntitlement(payload.status);
  const customerId = payload.customer?.customer_id ?? null;

  return sql`
    UPDATE ${organizations}
    SET subscription = COALESCE(${organizations.subscription}, '{}'::jsonb)
      || jsonb_build_object(
        'provider', 'dodo',
        'dodoCustomerId', ${customerId}::text,
        'dodoSubscriptionId', ${payload.subscription_id}::text,
        'dodoProductId', ${payload.product_id}::text,
        'dodoStatus', ${payload.status}::text,
        'tier', ${active ? DODO_PLATFORM_TIER : "inactive"}::text,
        'status', ${active ? "active" : "canceled"}::text,
        'currentPeriodStart', ${payload.previous_billing_date ?? null}::text,
        'currentPeriodEnd', ${payload.next_billing_date ?? null}::text,
        'dodoProcessedEventIds', COALESCE(${organizations.subscription}->'dodoProcessedEventIds', '[]'::jsonb) || jsonb_build_array(${eventId}::text)
      ),
      plan = ${active ? DODO_PLATFORM_TIER : "inactive"},
      updated_at = NOW()
    WHERE ${organizations.id} = ${orgId}::uuid
      AND COALESCE(${organizations.subscription}->>'provider', 'dodo') = 'dodo'
      AND (${organizations.subscription}->>'provider') IS DISTINCT FROM 'stripe'
      AND ${organizations.subscription}->>'stripeSubscriptionId' IS NULL
      AND NOT (COALESCE(${organizations.subscription}->'dodoProcessedEventIds', '[]'::jsonb) ? ${eventId}::text)
    RETURNING id
  `;
}

export async function applyDodoSubscriptionState(input: {
  orgId: string;
  eventId: string;
  payload: DodoSubscriptionPayload;
  createOnboardingLink: boolean;
}): Promise<{ applied: boolean; onboardingToken: string | null }> {
  const { orgId, eventId, payload } = input;
  const active = dodoStatusGrantsEntitlement(payload.status);
  const result = await db.execute(buildDodoSubscriptionUpdateQuery({ orgId, eventId, payload }));

  if (result.rows.length === 0) return { applied: false, onboardingToken: null };
  if (!active || !input.createOnboardingLink) return { applied: true, onboardingToken: null };

  await seedOnboardingForm(orgId);
  const link = await createOrGetPendingOnboardingLink(orgId);
  return { applied: true, onboardingToken: link.token };
}
