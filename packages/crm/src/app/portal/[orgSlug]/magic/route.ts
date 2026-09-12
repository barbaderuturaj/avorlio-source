// v1.20.0 — operator portal magic-link verification
//
// Consumes the magic-link token, swaps it for a session cookie,
// redirects to the operator dashboard. Mirrors the customer-portal
// magic verification at /customer/[orgSlug]/magic but produces
// an OPERATOR session (long TTL, full workspace access) instead of
// a customer session (contact-scoped).

import { NextRequest, NextResponse } from "next/server";
import { consumeOperatorMagicLink } from "@/lib/operator-portal/auth";

function resolveOperatorRedirectOrigin(request: NextRequest): string {
  for (const configured of [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.AUTH_URL,
  ]) {
    const value = configured?.trim();
    if (!value) continue;

    try {
      const url = new URL(value);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.origin;
      }
    } catch {
      // Try the next configured origin rather than trusting request headers.
    }
  }

  const requestUrl = new URL(request.url);
  if (["localhost", "127.0.0.1", "[::1]"].includes(requestUrl.hostname)) {
    return requestUrl.origin;
  }

  throw new Error("Operator portal redirect origin is not configured");
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orgSlug: string }> },
) {
  const { orgSlug } = await context.params;
  const token = request.nextUrl.searchParams.get("token")?.trim() || "";
  const redirectTo = request.nextUrl.searchParams.get("redirect")?.trim();

  if (!token) {
    return NextResponse.redirect(
      new URL(`/portal/${orgSlug}/login?error=missing_magic_link`, request.url),
    );
  }

  const result = await consumeOperatorMagicLink({ orgSlug, token });
  if (!result.ok) {
    return NextResponse.redirect(
      new URL(`/portal/${orgSlug}/login?error=invalid_magic_link`, request.url),
    );
  }

  // v1 PWA — land on the mobile shell (Today), not the dense desktop
  // CRM. The installed contractor app's start_url is /portal/<slug>/,
  // so after sign-in the operator continues straight into the app they
  // launched. An explicit ?redirect= (relative) still wins.
  const target =
    redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : `/portal/${orgSlug}`;
  return NextResponse.redirect(
    new URL(target, resolveOperatorRedirectOrigin(request)),
  );
}
