# Dodo launch billing

Dodo Payments is the current Avorlio HVAC launch billing path. The offer is
`avorlio_hvac`; the entitlement tier is `workspace`. Older Stripe and
marketplace billing code remains in the source but is historical/inherited
context unless an explicit task says otherwise.

## Checkout

An authenticated workspace manager can create checkout through
`src/app/api/billing/dodo/checkout/route.ts` or the dashboard ready surface.
`src/lib/billing/dodo-checkout.ts` builds a hosted Dodo checkout session using
the configured HVAC product and attaches metadata: organization ID, purchase
type, and offer. The return page is `/billing/dodo/success`; it does not itself
grant entitlement.

## Webhook and lifecycle

`src/app/api/webhooks/dodo/route.ts` reads Dodo webhook headers, reads the raw
body, and calls the Dodo SDK unwrap/verification path in `dodo-client.ts`.
Only recognized subscription events with matching product and metadata can
change state. The update in `dodo-subscription.ts`:

- writes Dodo customer/subscription/product/status fields to
  `organizations.subscription`;
- grants access only when status is `active`;
- marks non-active states as the inactive plan/status;
- records processed webhook IDs in the same atomic JSONB update, so repeated
  deliveries do not reapply;
- creates/seeds a pending onboarding link only for an active
  `subscription.active` event.

This is the cancellation/revocation behavior: later non-active subscription
events remove the Dodo entitlement. Do not change status semantics, signature
verification, product matching, or idempotency casually.

## Dependencies and tests

Required variable names are `DODO_PAYMENTS_API_KEY`,
`DODO_PAYMENTS_WEBHOOK_KEY`, `DODO_PAYMENTS_ENVIRONMENT`, and
`DODO_PAYMENTS_HVAC_PRODUCT_ID`; never document their values. Schema typing is
in `src/db/schema/organizations.ts`; entitlement resolution is in
`src/lib/billing/tier-resolver.ts`. Review adjacent billing and onboarding
tests under `packages/crm/tests/unit/` for any change. Recovery validation
reported Dodo parity verified; it is evidence for the reconstructed baseline,
not a license to modify live billing.

