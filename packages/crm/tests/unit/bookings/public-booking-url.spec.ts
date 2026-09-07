import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  buildPublicBookingUrl,
  requestOriginFromHeaders,
  sanitizePublicBookingDescription,
  sanitizePublicBookingIntakeFields,
  sanitizePublicBookingTitle,
  sanitizePublicBookingTestimonials,
  shouldExposePublicBookingTestimonials,
} from "@/lib/bookings/public-booking-url";
import { buildVerifiedBusinessFacts } from "@/lib/landing/factual-grounding";

const desertCoolFacts = buildVerifiedBusinessFacts({
  business_name: "DesertCool HVAC",
  offerings: ["AC repair", "AC installation", "HVAC maintenance", "Emergency HVAC service"],
  service_area: ["Dallas", "Plano", "Irving", "Garland", "Richardson"],
  emergency_service: false,
});

describe("buildPublicBookingUrl", () => {
  test("preserves localhost origin and emits canonical path booking URL", () => {
    assert.equal(
      buildPublicBookingUrl({
        requestOrigin: "http://localhost:3002",
        orgSlug: "desertcool-hvac",
        bookingSlug: "default",
      }),
      "http://localhost:3002/book/desertcool-hvac/default",
    );
  });

  test("preserves different local/self-host ports dynamically", () => {
    assert.equal(
      buildPublicBookingUrl({
        requestOrigin: "http://127.0.0.1:5173",
        orgSlug: "desertcool-hvac",
        bookingSlug: "default",
      }),
      "http://127.0.0.1:5173/book/desertcool-hvac/default",
    );
  });

  test("uses canonical app-host path when no request origin is available", () => {
    assert.equal(
      buildPublicBookingUrl({
        requestOrigin: null,
        orgSlug: "desertcool-hvac",
        bookingSlug: "default",
      }),
      "https://app.seldonframe.com/book/desertcool-hvac/default",
    );
  });

  test("preserves production tenant-domain shortcut with actual template slug", () => {
    assert.equal(
      buildPublicBookingUrl({
        requestOrigin: "https://desertcool-hvac.app.seldonframe.com",
        orgSlug: "desertcool-hvac",
        bookingSlug: "default",
      }),
      "https://desertcool-hvac.app.seldonframe.com/book/default",
    );
  });
});

describe("requestOriginFromHeaders", () => {
  test("prefers forwarded host and protocol", () => {
    const headers = new Headers({
      host: "localhost:3000",
      "x-forwarded-host": "localhost:3002",
      "x-forwarded-proto": "http",
    });
    assert.equal(requestOriginFromHeaders(headers), "http://localhost:3002");
  });
});

describe("sanitizePublicBookingTitle", () => {
  test("removes unsupported free-estimate claim while preserving neutral title portion", () => {
    assert.equal(
      sanitizePublicBookingTitle("Service Call / Free Estimate", desertCoolFacts),
      "Service Call",
    );
  });

  test("keeps verified offer claims when backed by authoritative facts", () => {
    const facts = buildVerifiedBusinessFacts({
      business_name: "Verified HVAC",
      offerings: ["AC repair"],
      free_estimates: true,
    });
    assert.equal(
      sanitizePublicBookingTitle("Service Call / Free Estimate", facts),
      "Service Call / Free Estimate",
    );
  });
});

describe("sanitizePublicBookingDescription", () => {
  test("removes unsupported public booking offer and timing claims", () => {
    assert.equal(
      sanitizePublicBookingDescription(
        "Free estimate with no obligation. Same-day service and financing available.",
        desertCoolFacts,
      ),
      "Choose a time that works for you.",
    );
  });

  test("preserves neutral factual public booking descriptions", () => {
    assert.equal(
      sanitizePublicBookingDescription(
        "On-site service visit to discuss your request.",
        buildVerifiedBusinessFacts({
          business_name: "DallasFlow Plumbing",
          offerings: ["Drain cleaning"],
        }),
      ),
      "On-site service visit to discuss your request.",
    );
  });
});

describe("public booking factual grounding", () => {
  test("does not expose unverified testimonials or reviews", () => {
    assert.equal(shouldExposePublicBookingTestimonials(desertCoolFacts), false);
    const testimonials = sanitizePublicBookingTestimonials(
      [
        { name: "Diane M.", quote: "No hidden fees.", rating: 5 },
        { name: "Marcus V.", quote: "Fast service.", rating: 5 },
        { name: "Linda B.", quote: "Emergency call at 3 AM, they arrived in 30 minutes.", rating: 5 },
      ],
      desertCoolFacts,
    );
    assert.deepEqual(testimonials, []);
  });

  test("exposes testimonials when explicitly verified", () => {
    const facts = buildVerifiedBusinessFacts(
      { business_name: "Verified HVAC", offerings: ["AC repair"] },
      { verifiedTestimonials: true },
    );
    assert.equal(shouldExposePublicBookingTestimonials(facts), true);
  });

  test("sanitizes demo intake placeholders and unsupported response promises", () => {
    const fields = sanitizePublicBookingIntakeFields(
      [
        {
          id: "address",
          label: "Service address",
          type: "text",
          required: true,
          placeholder: "123 Main St, Round Rock, TX 78664",
          helpText: "Where should we dispatch the technician?",
        },
        {
          id: "phone",
          label: "Best phone number",
          type: "tel",
          required: true,
          placeholder: "(555) 123-4567",
          helpText: "We'll call you back within minutes for emergency requests.",
        },
        {
          id: "urgency",
          label: "How urgent is this?",
          type: "radio",
          required: true,
          options: ["Today / emergency", "This week"],
        },
      ],
      desertCoolFacts,
    );

    const serialized = JSON.stringify(fields);
    assert.match(serialized, /Enter service address/);
    assert.match(serialized, /Enter the best number to reach you/);
    assert.match(serialized, /Urgent service request/);
    assert.doesNotMatch(serialized, /123 Main St, Round Rock, TX 78664/);
    assert.doesNotMatch(serialized, /within minutes/);
    assert.doesNotMatch(serialized, /Today \/ emergency/);
    assert.doesNotMatch(serialized, /dispatch the technician/);
  });
});
