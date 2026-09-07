// packages/crm/src/lib/landing/r1-rewrite-hrefs.ts
//
// Pure server-side step that runs AFTER loadLandingPayload() and BEFORE
// passing the payload to R-framework components.
//
// The LLM emits generic relative hrefs ("/book", "/intake") that are
// correct for the payload-generation step but 404 when served from
// /w/[slug] or /s/[orgSlug]/[...slug]. This module deep-clones the
// payload and rewrites those generic hrefs to workspace-scoped URLs
// from buildWorkspaceUrls().
//
// Safe pass-throughs — these are NEVER rewritten:
//   • tel: / sms: / mailto: links
//   • #anchor links (e.g. #services, #faq, #reviews)
//   • Absolute URLs (http:// / https://)
//   • Any href that doesn't appear in the REWRITE_MAP

import type { R1LandingPayload } from "./r1-payload-prompt";

/** Which generic hrefs should be rewritten, and to which URL key. */
const REWRITE_MAP: Record<string, "book" | "intake"> = {
  "/book": "book",
  "/intake": "intake",
};

type WorkspaceUrls = {
  book?: string | null;
  intake?: string | null;
  home: string;
};

/**
 * Returns true when the href should pass through unchanged.
 * This covers: tel:, sms:, mailto:, http(s):, and #anchors.
 */
function isPassThrough(href: string): boolean {
  if (!href) return true;
  return (
    href.startsWith("tel:") ||
    href.startsWith("sms:") ||
    href.startsWith("mailto:") ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("#")
  );
}

/** Rewrite a single href. Returns the original when no rewrite applies. */
function rewriteHref(href: string, urls: WorkspaceUrls): string {
  if (isPassThrough(href)) return href;
  const key = REWRITE_MAP[href];
  if (!key) return href;
  if (key === "book" && !urls.book) return "#contact";
  if (key === "intake" && !urls.intake) return "#contact";
  return urls[key] ?? href;
}

function isHvacPayload(payload: R1LandingPayload): boolean {
  const text = [
    payload.hero.businessName,
    payload.hero.tagline,
    payload.hero.subhead,
    ...payload.services.services.map((service) => service.name),
  ].join(" ");

  return /\bhvac\b|\bac\b|air\s*condition|furnace|heating|cooling/i.test(text);
}

function shouldRouteRequestCtaToIntake(
  cta: { label: string; href: string },
  hvac: boolean,
  urls: WorkspaceUrls,
): boolean {
  if (!hvac || !urls.intake || !urls.book || cta.href !== "/book") return false;

  // Explicit booking/scheduling language remains direct-to-calendar.
  if (/\bbook\b|\bappointment\b|\bschedule\b/i.test(cta.label)) return false;

  return /\brequest\b|\bhelp\b|\bquote\b/i.test(cta.label);
}

/**
 * Deep-clone the R1 payload and rewrite generic CTA hrefs to
 * workspace-scoped URLs.
 *
 * Spots rewritten (per r1-payload-prompt.ts type definitions):
 *   hero.primaryCTA.href
 *   hero.secondaryCTA?.href
 *   services.cta?.href
 *   faq.cta?.href
 *   footer.serviceLinks[]?.href  (skipped when already starts with #)
 *   sticky?.bookHref             (skipped when undefined)
 *   sticky?.smsHref              (sms: pass-through — never rewritten)
 */
export function rewriteR1Hrefs(
  payload: R1LandingPayload,
  urls: WorkspaceUrls,
): R1LandingPayload {
  // Structural clone — avoids mutating the cached/loaded payload.
  const p: R1LandingPayload = JSON.parse(JSON.stringify(payload)) as R1LandingPayload;
  const bookingUnavailable = !urls.book;
  const hvac = isHvacPayload(p);

  // hero CTAs
  if (shouldRouteRequestCtaToIntake(p.hero.primaryCTA, hvac, urls)) {
    p.hero.primaryCTA.href = urls.intake!;
  } else if (bookingUnavailable && p.hero.primaryCTA.href === "/book") {
    p.hero.primaryCTA = { ...p.hero.primaryCTA, label: "Contact us", href: "#contact" };
  } else {
    p.hero.primaryCTA.href = rewriteHref(p.hero.primaryCTA.href, urls);
  }
  if (p.hero.secondaryCTA) {
    if (bookingUnavailable && p.hero.secondaryCTA.href === "/book") {
      p.hero.secondaryCTA = { ...p.hero.secondaryCTA, label: "Contact us", href: "#contact" };
    } else {
      p.hero.secondaryCTA.href = rewriteHref(p.hero.secondaryCTA.href, urls);
    }
  }

  // services CTA
  if (p.services.cta) {
    if (shouldRouteRequestCtaToIntake(p.services.cta, hvac, urls)) {
      p.services.cta.href = urls.intake!;
    } else if (bookingUnavailable && p.services.cta.href === "/book") {
      p.services.cta = { ...p.services.cta, label: "Contact us", href: "#contact" };
    } else {
      p.services.cta.href = rewriteHref(p.services.cta.href, urls);
    }
  }

  // faq CTA
  if (p.faq.cta) {
    if (shouldRouteRequestCtaToIntake(p.faq.cta, hvac, urls)) {
      p.faq.cta.href = urls.intake!;
    } else if (bookingUnavailable && p.faq.cta.href === "/book") {
      p.faq.cta = { ...p.faq.cta, label: "Contact us", href: "#contact" };
    } else {
      p.faq.cta.href = rewriteHref(p.faq.cta.href, urls);
    }
  }

  // footer service links — only rewrite non-anchor hrefs
  if (p.footer.serviceLinks) {
    p.footer.serviceLinks = p.footer.serviceLinks.map((link) => ({
      ...link,
      href: rewriteHref(link.href, urls),
    }));
  }

  // sticky bar — bookHref only; smsHref is always sms: (pass-through)
  if (p.sticky) {
    if (p.sticky.bookHref) {
      p.sticky.bookHref = bookingUnavailable && p.sticky.bookHref === "/book"
        ? undefined
        : rewriteHref(p.sticky.bookHref, urls);
    }
    // smsHref: always a sms: href → isPassThrough returns true → no change needed
    // but run it through rewriteHref defensively so future mis-typed values are caught
    if (p.sticky.smsHref) {
      p.sticky.smsHref = rewriteHref(p.sticky.smsHref, urls);
    }
  }

  // nav CTA — added in P4: the "/book" href is rewritten to the workspace
  // booking URL, exactly like the hero primary CTA.
  if (p.nav?.cta) {
    if (bookingUnavailable && p.nav.cta.href === "/book") {
      p.nav.cta = undefined;
    } else {
      p.nav.cta.href = rewriteHref(p.nav.cta.href, urls);
    }
  }

  return p;
}
