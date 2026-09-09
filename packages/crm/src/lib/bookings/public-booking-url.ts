import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { intakeForms } from "@/db/schema";
import { sanitizePublicClaimText, type VerifiedBusinessFacts } from "@/lib/landing/factual-grounding";

const DEFAULT_WORKSPACE_BASE_DOMAIN = "app.seldonframe.com";

function configuredAppHost(): string {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configuredAppUrl) return DEFAULT_WORKSPACE_BASE_DOMAIN;

  try {
    return new URL(configuredAppUrl).hostname.toLowerCase();
  } catch {
    return DEFAULT_WORKSPACE_BASE_DOMAIN;
  }
}

export type PublicBookingTemplate = {
  slug: string;
  title: string;
};

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizedBaseDomain(baseDomain?: string | null): string {
  return (baseDomain?.trim() || configuredAppHost())
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^\.+/, "")
    .replace(/\.+$/, "");
}

export function requestOriginFromHeaders(headers: Headers): string | null {
  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || headers.get("host")?.trim();
  if (!host) return null;

  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  if (proto !== "http" && proto !== "https") return null;
  return `${proto}://${host}`;
}

export function buildPublicBookingUrl({
  requestOrigin,
  orgSlug,
  bookingSlug,
  baseDomain,
}: {
  requestOrigin?: string | null;
  orgSlug: string;
  bookingSlug: string;
  baseDomain?: string | null;
}): string {
  const encodedOrgSlug = encodeURIComponent(orgSlug);
  const encodedBookingSlug = encodeURIComponent(bookingSlug);
  const fallbackBase = normalizedBaseDomain(baseDomain);

  if (!requestOrigin) {
    return `https://${fallbackBase}/book/${encodedOrgSlug}/${encodedBookingSlug}`;
  }

  let origin: URL;
  try {
    origin = new URL(requestOrigin);
  } catch {
    return `https://${fallbackBase}/book/${encodedOrgSlug}/${encodedBookingSlug}`;
  }

  if (origin.protocol !== "http:" && origin.protocol !== "https:") {
    return `https://${fallbackBase}/book/${encodedOrgSlug}/${encodedBookingSlug}`;
  }

  const originText = stripTrailingSlash(origin.origin);
  const hostname = origin.hostname.toLowerCase();
  const base = normalizedBaseDomain(baseDomain);
  const tunnelHost =
    hostname.endsWith(".trycloudflare.com") ||
    hostname.endsWith(".ngrok-free.dev") ||
    hostname.endsWith(".ngrok-free.app");

  const localOrAppHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === base ||
    tunnelHost;

  if (localOrAppHost) {
    return `${originText}/book/${encodedOrgSlug}/${encodedBookingSlug}`;
  }

  return `${originText}/book/${encodedBookingSlug}`;
}

export async function getPublicBookingTemplateForOrg(orgId: string): Promise<PublicBookingTemplate | null> {
  const [preferred] = await db
    .select({ slug: bookings.bookingSlug, title: bookings.title })
    .from(bookings)
    .where(and(eq(bookings.orgId, orgId), eq(bookings.bookingSlug, "default"), eq(bookings.status, "template")))
    .limit(1);
  if (preferred?.slug) return preferred;

  const [template] = await db
    .select({ slug: bookings.bookingSlug, title: bookings.title })
    .from(bookings)
    .where(and(eq(bookings.orgId, orgId), eq(bookings.status, "template")))
    .limit(1);
  return template?.slug ? template : null;
}

function compactTitle(value: string): string {
  return value
    .replace(/\s*(?:\/|\||-|--|–|—|\+)\s*(?:\/|\||-|--|–|—|\+)\s*/g, " / ")
    .replace(/(?:^\s*(?:\/|\||-|--|–|—|\+)\s*)|(?:\s*(?:\/|\||-|--|–|—|\+)\s*$)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function sanitizePublicBookingTitle(title: string, facts: VerifiedBusinessFacts): string {
  let safe = title.trim();
  if (!facts.freeEstimates) {
    safe = safe.replace(/\bfree\s+(?:estimate|quote)s?\b/gi, "");
    safe = safe.replace(/\bno[- ]obligation\s+(?:estimate|quote)s?\b/gi, "");
  }
  if (!facts.noHiddenFees) {
    safe = safe.replace(/\bno\s+(?:surprise|hidden)\s+(?:charges?|fees?)\b/gi, "");
    safe = safe.replace(/\bguaranteed\s+pricing\b/gi, "");
  }
  if (!facts.sameDay) {
    safe = safe.replace(/\bsame[- ]day\b/gi, "");
  }
  if (!facts.responseTime) {
    safe = safe.replace(/\b(?:30|60)[- ]minute(?:s)?\s+(?:arrival|response|service)?\b/gi, "");
    safe = safe.replace(/\bwithin\s+(?:the\s+)?hour\b/gi, "");
  }
  if (!facts.emergency24x7 && !facts.onCall) {
    safe = safe.replace(/\b24\s*\/\s*7\b/gi, "");
    safe = safe.replace(/\balways\s+on\s+call\b/gi, "");
    safe = safe.replace(/\bon[- ]call\s+now\b/gi, "");
  }

  safe = compactTitle(safe);
  return safe || facts.services[0] || "Service Call";
}

/** Build the canonical public URL for a published workspace intake form. */
export function buildPublicIntakeUrl({
  requestOrigin,
  orgSlug,
  formSlug,
  baseDomain,
}: {
  requestOrigin?: string | null;
  orgSlug: string;
  formSlug: string;
  baseDomain?: string | null;
}): string {
  const encodedOrgSlug = encodeURIComponent(orgSlug);
  const encodedFormSlug = encodeURIComponent(formSlug);
  const fallbackBase = normalizedBaseDomain(baseDomain);

  if (!requestOrigin) {
    return `https://${fallbackBase}/forms/${encodedOrgSlug}/${encodedFormSlug}`;
  }

  let origin: URL;
  try {
    origin = new URL(requestOrigin);
  } catch {
    return `https://${fallbackBase}/forms/${encodedOrgSlug}/${encodedFormSlug}`;
  }

  if (origin.protocol !== "http:" && origin.protocol !== "https:") {
    return `https://${fallbackBase}/forms/${encodedOrgSlug}/${encodedFormSlug}`;
  }

  const hostname = origin.hostname.toLowerCase();
  const base = normalizedBaseDomain(baseDomain);
  const workspaceHost = hostname.endsWith(`.${base}`) && hostname !== base;
  const path = workspaceHost
    ? `/forms/${encodedFormSlug}`
    : `/forms/${encodedOrgSlug}/${encodedFormSlug}`;
  return `${stripTrailingSlash(origin.origin)}${path}`;
}

export async function getPublicIntakeFormForOrg(orgId: string): Promise<{ slug: string; name: string } | null> {
  const [form] = await db
    .select({ slug: intakeForms.slug, name: intakeForms.name })
    .from(intakeForms)
    .where(and(eq(intakeForms.orgId, orgId), eq(intakeForms.isActive, true)))
    .limit(1);
  return form?.slug ? form : null;
}

export function sanitizePublicBookingDescription(description: string | null | undefined, facts: VerifiedBusinessFacts): string {
  const fallback = "Choose a time that works for you.";
  return sanitizePublicClaimText(description, facts, fallback) || fallback;
}

type PublicBookingIntakeFieldLike = {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
};

export function sanitizePublicBookingIntakeFields<T extends PublicBookingIntakeFieldLike>(
  fields: T[],
  facts: VerifiedBusinessFacts,
): T[] {
  return fields.map((field) => {
    const next = { ...field };

    if (next.id === "address") {
      next.placeholder = "Enter service address";
      if (/dispatch/i.test(next.helpText ?? "")) {
        next.helpText = undefined;
      }
    }

    if (next.id === "phone") {
      next.helpText = "Enter the best number to reach you.";
    }

    if (next.options?.length) {
      next.options = next.options.map((option) => {
        let safe = option;
        if (!facts.emergency24x7 && !facts.onCall && !facts.sameDay && /^today\s*\/\s*emergency$/i.test(safe)) {
          safe = "Urgent service request";
        }
        return safe;
      });
    }

    return next;
  });
}

export function shouldExposePublicBookingTestimonials(facts: VerifiedBusinessFacts): boolean {
  return facts.testimonialsVerified || facts.reviewsVerified;
}

export function sanitizePublicBookingTestimonials<T>(
  testimonials: T[],
  facts: VerifiedBusinessFacts,
): T[] {
  return shouldExposePublicBookingTestimonials(facts) ? testimonials : [];
}
