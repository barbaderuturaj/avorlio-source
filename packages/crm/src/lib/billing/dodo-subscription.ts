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

export async function applyDodoSubscriptionState(input: {
  orgId: string;
  eventId: string;
  payload: DodoSubscriptionPayload;
  createOnboardingLink: boolean;
}): Promise<{ applied: boolean; onboardingToken: string | null }> {
  const { orgId, eventId, payload } = input;
  const active = dodoStatusGrantsEntitlement(payload.status);
  const customerId = payload.customer?.customer_id ?? null;
  const result = await db.execute(sql`
    UPDATE ${organizations}
    SET subscription = COALESCE(${organizations.subscription}, '{}'::jsonb)
      || jsonb_build_object(
        'provider', 'dodo',
        'dodoCustomerId', ${customerId},
        'dodoSubscriptionId', ${payload.subscription_id},
        'dodoProductId', ${payload.product_id},
        'dodoStatus', ${payload.status},
        'tier', ${active ? DODO_PLATFORM_TIER : "inactive"},
        'status', ${active ? "active" : "canceled"},
        'currentPeriodStart', ${payload.previous_billing_date ?? null},
        'currentPeriodEnd', ${payload.next_billing_date ?? null},
        'dodoProcessedEventIds', COALESCE(${organizations.subscription}->'dodoProcessedEventIds', '[]'::jsonb) || jsonb_build_array(${eventId})
      ),
      plan = ${active ? DODO_PLATFORM_TIER : "inactive"},
      updated_at = NOW()
    WHERE ${organizations.id} = ${orgId}::uuid
      AND COALESCE(${organizations.subscription}->>'provider', 'dodo') = 'dodo'
      AND NOT (
        ${organizations.subscription}->>'provider' = 'stripe'
        OR ${organizations.subscription}->>'stripeSubscriptionId' IS NOT NULL
      )
      AND NOT (COALESCE(${organizations.subscription}->'dodoProcessedEventIds', '[]'::jsonb) ? ${eventId})
    RETURNING id
  `);

  if (result.rows.length === 0) return { applied: false, onboardingToken: null };
  if (!active || !input.createOnboardingLink) return { applied: true, onboardingToken: null };

  await seedOnboardingForm(orgId);
  const link = await createOrGetPendingOnboardingLink(orgId);
  return { applied: true, onboardingToken: link.token };
}
