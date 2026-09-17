import { getDodoClient } from "./dodo-client";

export const DODO_PLATFORM_OFFER = "avorlio_hvac" as const;
// External Avorlio pricing is intentionally independent from entitlements.
// `workspace` is the least-privileged existing tier that has the complete
// single-business HVAC surface, including the operator/client portal.
export const DODO_PLATFORM_TIER = "workspace" as const;

export type DodoCheckoutParams = {
  product_cart: [{ product_id: string; quantity: 1 }];
  customer: { email: string; name: string };
  metadata: { orgId: string; purchaseType: "platform_subscription"; offer: typeof DODO_PLATFORM_OFFER };
  return_url: string;
};

function getAppBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
}

export async function createDodoPlatformCheckout(input: {
  orgId: string;
  customerEmail: string;
  customerName: string;
}) {
  const productId = process.env.DODO_PAYMENTS_HVAC_PRODUCT_ID?.trim();
  const client = getDodoClient();
  if (!client || !productId) throw new Error("Dodo platform billing is not configured");

  const session = await client.checkoutSessions.create(buildDodoCheckoutParams({ ...input, productId }));

  return { checkoutUrl: session.checkout_url };
}

export function buildDodoCheckoutParams(input: {
  orgId: string;
  customerEmail: string;
  customerName: string;
  productId: string;
}): DodoCheckoutParams {
  return {
    product_cart: [{ product_id: input.productId, quantity: 1 }],
    customer: { email: input.customerEmail, name: input.customerName },
    metadata: {
      orgId: input.orgId,
      purchaseType: "platform_subscription",
      offer: DODO_PLATFORM_OFFER,
    },
    return_url: `${getAppBaseUrl()}/billing/dodo/success`,
  };
}
