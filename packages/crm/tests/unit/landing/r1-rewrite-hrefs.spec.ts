import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { rewriteR1Hrefs } from "@/lib/landing/r1-rewrite-hrefs";
import { buildPublicBookingUrl } from "@/lib/bookings/public-booking-url";
import type { R1LandingPayload } from "@/lib/landing/r1-payload-prompt";

function payload(): R1LandingPayload {
  return {
    hero: {
      archetype: "bold-urgency",
      businessName: "DesertCool HVAC",
      tagline: "HVAC help",
      subhead: "Grounded HVAC copy.",
      primaryCTA: { label: "Request HVAC help", href: "/book" },
      secondaryCTA: { label: "Call (214) 555-0147", href: "tel:+12145550147" },
      trustBadges: [],
      emergencyService: false,
    },
    services: {
      archetype: "bold-urgency",
      heading: "Services",
      intro: "Choose a service.",
      services: [{ id: "s1", name: "AC repair", description: "AC repair." }],
      cta: { label: "Request HVAC help", href: "/book", text: { title: "Need HVAC help?", sub: "Contact us." } },
    },
    testimonials: { archetype: "bold-urgency", heading: "", testimonials: [] },
    faq: {
      archetype: "bold-urgency",
      heading: "FAQ",
      items: [],
      cta: { title: "Need help?", sub: "Contact us.", label: "Request HVAC help", href: "/book" },
    },
    footer: {
      archetype: "bold-urgency",
      businessName: "DesertCool HVAC",
      phone: "(214) 555-0147",
      serviceAreas: ["Dallas"],
      weeklyHours: [],
      serviceLinks: [{ label: "AC repair", href: "/book" }],
    },
    sticky: { archetype: "bold-urgency", phone: "(214) 555-0147", bookHref: "/book" },
    leadForm: { enabled: true, heading: "Tell us what you need", subheading: "Share details." },
    nav: { cta: { label: "Book now", href: "/book" } },
  };
}

describe("rewriteR1Hrefs booking links", () => {
  test("rewrites navbar, hero, services, FAQ, footer, and sticky booking links to canonical local URL", () => {
    const book = buildPublicBookingUrl({
      requestOrigin: "http://localhost:3002",
      orgSlug: "desertcool-hvac",
      bookingSlug: "default",
    });
    const rewritten = rewriteR1Hrefs(payload(), {
      book,
      intake: "http://localhost:3002/forms/desertcool-hvac/intake",
      home: "http://localhost:3002/w/desertcool-hvac",
    });
    const text = JSON.stringify(rewritten);

    assert.equal(book, "http://localhost:3002/book/desertcool-hvac/default");
    assert.equal(rewritten.hero.primaryCTA.href, "http://localhost:3002/forms/desertcool-hvac/intake");
    assert.equal(rewritten.services.cta?.href, "http://localhost:3002/forms/desertcool-hvac/intake");
    assert.equal(rewritten.faq.cta?.href, "http://localhost:3002/forms/desertcool-hvac/intake");
    assert.equal(rewritten.footer.serviceLinks?.[0]?.href, book);
    assert.equal(rewritten.sticky?.bookHref, book);
    assert.equal(rewritten.nav?.cta?.href, book);
    assert.doesNotMatch(text, /desertcool-hvac\.app\.seldonframe\.com\/book/);
  });

  test("suppresses booking CTA when no public booking template exists", () => {
    const rewritten = rewriteR1Hrefs(payload(), {
      book: null,
      intake: "http://localhost:3002/forms/desertcool-hvac/intake",
      home: "http://localhost:3002/w/desertcool-hvac",
    });

    assert.equal(rewritten.nav?.cta, undefined);
    assert.equal(rewritten.sticky?.bookHref, undefined);
    assert.equal(rewritten.hero.primaryCTA.href, "#contact");
    assert.equal(rewritten.services.cta?.href, "#contact");
    assert.equal(rewritten.faq.cta?.href, "#contact");
  });

  test("falls back request CTAs to booking when intake is unavailable", () => {
    const book = buildPublicBookingUrl({
      requestOrigin: "http://localhost:3002",
      orgSlug: "desertcool-hvac",
      bookingSlug: "default",
    });

    const rewritten = rewriteR1Hrefs(payload(), {
      book,
      intake: null,
      home: "http://localhost:3002/w/desertcool-hvac",
    });

    assert.equal(rewritten.hero.primaryCTA.href, book);
    assert.equal(rewritten.services.cta?.href, book);
    assert.equal(rewritten.faq.cta?.href, book);
    assert.equal(rewritten.nav?.cta?.href, book);
    assert.equal(rewritten.sticky?.bookHref, book);
  });
});
