import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDodoCheckoutParams,
  DODO_PLATFORM_OFFER,
  DODO_PLATFORM_TIER,
} from "@/lib/billing/dodo-checkout";
import {
  buildDodoSubscriptionUpdateQuery,
  dodoEventCreatesOnboardingLink,
  dodoStatusGrantsEntitlement,
  isDodoPlatformSubscriptionMetadata,
  type DodoSubscriptionStatus,
} from "@/lib/billing/dodo-subscription";
import { getDodoConfig, readDodoWebhookHeaders, unwrapDodoWebhook } from "@/lib/billing/dodo-client";
import { dodoEventIsAlreadyProcessed } from "@/lib/billing/dodo-subscription";
import { PgDialect } from "drizzle-orm/pg-core";

const dialect = new PgDialect();

const ORIGINAL_ENV = {
  apiKey: process.env.DODO_PAYMENTS_API_KEY,
  webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
  environment: process.env.DODO_PAYMENTS_ENVIRONMENT,
};

function restoreEnv() {
  if (ORIGINAL_ENV.apiKey === undefined) delete process.env.DODO_PAYMENTS_API_KEY;
  else process.env.DODO_PAYMENTS_API_KEY = ORIGINAL_ENV.apiKey;
  if (ORIGINAL_ENV.webhookKey === undefined) delete process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  else process.env.DODO_PAYMENTS_WEBHOOK_KEY = ORIGINAL_ENV.webhookKey;
  if (ORIGINAL_ENV.environment === undefined) delete process.env.DODO_PAYMENTS_ENVIRONMENT;
  else process.env.DODO_PAYMENTS_ENVIRONMENT = ORIGINAL_ENV.environment;
}

test("Dodo checkout is fixed to the server-selected HVAC product and metadata", () => {
  const params = buildDodoCheckoutParams({
    orgId: "org-1",
    customerEmail: "owner@example.com",
    customerName: "HVAC Owner",
    productId: "pdt_hvac_299",
  });
  assert.deepEqual(params.product_cart, [{ product_id: "pdt_hvac_299", quantity: 1 }]);
  assert.deepEqual(params.metadata, {
    orgId: "org-1",
    purchaseType: "platform_subscription",
    offer: DODO_PLATFORM_OFFER,
  });
  assert.equal(DODO_PLATFORM_TIER, "workspace");
  assert.match(params.return_url, /\/billing\/dodo\/success$/);
});

test("Dodo configuration fails closed for missing or invalid environment", () => {
  delete process.env.DODO_PAYMENTS_API_KEY;
  delete process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  process.env.DODO_PAYMENTS_ENVIRONMENT = "live";
  assert.equal(getDodoConfig(), null);

  process.env.DODO_PAYMENTS_API_KEY = "api-key";
  process.env.DODO_PAYMENTS_WEBHOOK_KEY = "webhook-key";
  assert.equal(getDodoConfig(), null);

  process.env.DODO_PAYMENTS_ENVIRONMENT = "test_mode";
  assert.deepEqual(getDodoConfig(), {
    apiKey: "api-key",
    webhookKey: "webhook-key",
    environment: "test_mode",
  });
  restoreEnv();
});

test("only active Dodo status grants the existing paid entitlement", () => {
  const statuses: DodoSubscriptionStatus[] = ["pending", "on_hold", "paused", "cancelled", "failed", "expired", "past_due"];
  for (const status of statuses) assert.equal(dodoStatusGrantsEntitlement(status), false, status);
  assert.equal(dodoStatusGrantsEntitlement("active"), true);
});

test("Dodo metadata and product checks fail closed", () => {
  const metadata = { orgId: "org-1", purchaseType: "platform_subscription", offer: "avorlio_hvac" };
  assert.equal(isDodoPlatformSubscriptionMetadata(metadata, "pdt_hvac_299", "pdt_hvac_299"), true);
  assert.equal(isDodoPlatformSubscriptionMetadata({ ...metadata, offer: "other" }, "pdt_hvac_299", "pdt_hvac_299"), false);
  assert.equal(isDodoPlatformSubscriptionMetadata(metadata, "pdt_hvac_299", "pdt_other"), false);
  assert.equal(isDodoPlatformSubscriptionMetadata(undefined, "pdt_hvac_299", "pdt_hvac_299"), false);
});

test("only a newly processed active event may reveal onboarding", () => {
  assert.equal(dodoEventCreatesOnboardingLink("subscription.active", "active"), true);
  for (const eventType of ["subscription.updated", "subscription.renewed", "subscription.on_hold", "subscription.cancelled", "subscription.failed", "subscription.expired"]) {
    assert.equal(dodoEventCreatesOnboardingLink(eventType, "active"), false, eventType);
  }
  assert.equal(dodoEventCreatesOnboardingLink("subscription.active", "pending"), false);
  assert.equal(dodoEventCreatesOnboardingLink("subscription.active", "cancelled"), false);
});

test("missing webhook headers are rejected before verification", () => {
  assert.equal(readDodoWebhookHeaders(new Headers()), null);
  const headers = new Headers({ "webhook-id": "evt-1", "webhook-signature": "sig" });
  assert.equal(readDodoWebhookHeaders(headers), null);
});

test("invalid mocked webhook signature is rejected", () => {
  const client = { webhooks: { unwrap: () => { throw new Error("bad signature"); } } } as never;
  assert.throws(() => unwrapDodoWebhook(client, "{}", {
    "webhook-id": "evt-1", "webhook-signature": "bad", "webhook-timestamp": "1",
  }));
});

test("duplicate webhook IDs are safe no-ops", () => {
  assert.equal(dodoEventIsAlreadyProcessed(["evt-1"], "evt-1"), true);
  assert.equal(dodoEventIsAlreadyProcessed(["evt-1"], "evt-2"), false);
});

test("Dodo subscription SQL explicitly types JSONB-bound string parameters", () => {
  const { sql: sqlText, params } = dialect.sqlToQuery(buildDodoSubscriptionUpdateQuery({
    orgId: "11111111-1111-1111-1111-111111111111",
    eventId: "msg_123",
    payload: {
      subscription_id: "sub_123",
      product_id: "pdt_123",
      status: "active",
      customer: null,
      previous_billing_date: null,
      next_billing_date: "2026-10-13T00:00:00.000Z",
    },
  }));

  assert.match(sqlText, /\$1::text/);
  assert.match(sqlText, /\$2::text/);
  assert.match(sqlText, /\$3::text/);
  assert.match(sqlText, /\$4::text/);
  assert.match(sqlText, /\$5::text/);
  assert.match(sqlText, /\$6::text/);
  assert.match(sqlText, /\$7::text/);
  assert.match(sqlText, /\$8::text/);
  assert.match(sqlText, /jsonb_build_array\(\$9::text\)/);
  assert.match(sqlText, /\? \$12::text/);
  assert.match(sqlText, /\$11::uuid/);
  assert.equal(params[0], null, "nullable customer ID remains SQL NULL");
  assert.equal(params[7], "2026-10-13T00:00:00.000Z");
});
