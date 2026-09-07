import { describe, test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";

import {
  buildGroundedMetadataDescription,
  buildVerifiedBusinessFacts,
  sanitizeChatbotEmbedUrl,
  sanitizePublicClaimText,
  sanitizePublicLandingData,
  sanitizeR1LandingPayload,
  validateLandingClaims,
} from "../../../src/lib/landing/factual-grounding";
import type { R1LandingPayload } from "../../../src/lib/landing/r1-payload-prompt";
import { LeadFormCard } from "../../../src/components/landing-r1/sections/lead-form";
import { Testimonials } from "../../../src/components/landing-r1/sections/testimonials";
import { Navbar } from "../../../src/components/landing-r1/chrome/navbar";
import { Footer } from "../../../src/components/landing-r1/sections/footer";

const facts = buildVerifiedBusinessFacts({
  business_name: "DesertCool HVAC",
  phone: "(214) 555-0147",
  city: "Dallas",
  state: "Texas",
  service_area: ["Dallas", "Plano", "Irving", "Garland", "Richardson"],
  offerings: ["AC repair", "AC installation", "HVAC maintenance", "Emergency HVAC service"],
  weekly_hours: {
    monday: { enabled: true, start: "08:00", end: "18:00" },
    tuesday: { enabled: true, start: "08:00", end: "18:00" },
    wednesday: { enabled: true, start: "08:00", end: "18:00" },
    thursday: { enabled: true, start: "08:00", end: "18:00" },
    friday: { enabled: true, start: "08:00", end: "18:00" },
    saturday: { enabled: false, start: "00:00", end: "00:00" },
    sunday: { enabled: false, start: "00:00", end: "00:00" },
  },
  emergency_service: false,
});

function payload(): R1LandingPayload {
  return {
    hero: {
      archetype: "bold-urgency",
      businessName: "DesertCool HVAC",
      tagline: "AC down? We'll be there in 60 minutes.",
      subhead: "24/7 emergency service — we're on call now. Licensed and insured.",
      primaryCTA: { label: "Get a free estimate", href: "/book" },
      secondaryCTA: { label: "Call (214) 555-0147", href: "tel:+12145550147" },
      trustBadges: [{ label: "5-star reviews" }, { label: "Local HVAC" }],
      emergencyService: true,
      reviewRating: 5,
      reviewCount: 412,
      heroOverlay: { techName: "John D.", techMeta: "15 yrs · Certified HVAC Technician" },
    },
    services: {
      archetype: "bold-urgency",
      heading: "Everything we fix — fast",
      intro: "We'll fix it in minutes today.",
      services: [
        { id: "s1", name: "AC repair", description: "Reliable AC repair." },
        { id: "s2", name: "AC installation", description: "Same-day installation." },
        { id: "s3", name: "HVAC maintenance", description: "Maintenance." },
        { id: "s4", name: "Emergency HVAC service", description: "Emergency service." },
      ],
      cta: {
        label: "Book now",
        href: "/book",
        text: { title: "Act Now!", sub: "Book your emergency repair and avoid a heat wave." },
      },
    },
    testimonials: {
      archetype: "bold-urgency",
      heading: "Trusted by Dallas residents",
      testimonials: [{ id: "t1", quote: "They arrived in 30 minutes.", name: "Diane M." }],
      reviewSummary: { rating: 5, count: 412 },
    },
    faq: {
      archetype: "bold-urgency",
      heading: "Frequently asked questions",
      items: [
        { id: "f1", question: "How fast can you be here for an emergency?", answer: "We can arrive quickly." },
        { id: "f2", question: "Are you licensed and insured?", answer: "Yes." },
        { id: "f3", question: "What are your hours?", answer: "Mon-Fri 9am-5pm." },
        { id: "f4", question: "Which areas do you serve?", answer: "Dallas only." },
      ],
      cta: { title: "We'll call you back within the hour", sub: "Free quote, no hidden fees.", label: "Get a free quote", href: "/intake" },
    },
    footer: {
      archetype: "bold-urgency",
      businessName: "DesertCool HVAC",
      tagline: "Trusted by your neighbors.",
      phone: "(214) 555-0147",
      serviceAreas: ["Dallas"],
      weeklyHours: [{ line: "Mon-Fri 9am-5pm" }, { line: "24/7 emergency · always on call", emergency: true }],
      license: "Licensed & insured",
      trustBadges: [{ label: "Financing available" }],
    },
    emergency: { archetype: "bold-urgency", message: "24/7 emergency service", phone: "(214) 555-0147", show: true },
    sticky: { archetype: "bold-urgency", phone: "(214) 555-0147", smsHref: "sms:+12145550147", bookHref: "/book" },
    leadForm: { enabled: true, heading: "Get a fast callback", subheading: "We'll get back to you within the hour." },
  };
}

test("sanitizes an existing DesertCool payload conservatively", () => {
  const sanitized = sanitizeR1LandingPayload(payload(), facts);
  const text = JSON.stringify(sanitized);

  for (const expected of [
    "DesertCool HVAC", "(214) 555-0147", "Dallas", "Plano", "Irving", "Garland", "Richardson",
    "AC repair", "AC installation", "HVAC maintenance", "Emergency HVAC service", "Monday-Friday, 8 AM-6 PM",
  ]) assert.match(text, new RegExp(expected.replace(/[()]/g, "\\$&")));

  for (const forbidden of [
    "24/7", "always on call", "same-day", "60-minute", "within the hour", "free estimate", "free quote",
    "no hidden fees", "licensed", "insured", "financing", "5-star", "rating", "review", "Diane M.",
    "John D.", "15 yrs", "trusted by", "★★★★★", "Get my callback", "Act Now", "Book your emergency repair",
    "What neighbors say", "Reviews", "30 minutes", "3 AM",
  ]) assert.doesNotMatch(text.toLowerCase(), new RegExp(forbidden.toLowerCase()));

  assert.deepEqual(validateLandingClaims(sanitized, facts), []);
  assert.equal(sanitized.hero.tagline, "HVAC help for Dallas-area homes");
  assert.equal(sanitized.hero.primaryCTA.label, "Request HVAC help");
  assert.equal(
    sanitized.hero.subhead,
    "DesertCool HVAC provides AC repair, AC installation, HVAC maintenance, and Emergency HVAC service across Dallas, Plano, Irving, Garland, and Richardson.",
  );
  assert.equal(
    buildGroundedMetadataDescription(facts),
    "DesertCool HVAC serves Dallas, Plano, Irving, Garland, and Richardson with AC repair, AC installation, HVAC maintenance, and Emergency HVAC service.",
  );
  assert.equal(
    sanitized.services.intro,
    "Choose the service you need and contact DesertCool HVAC for current availability.",
  );
  assert.deepEqual(
    sanitized.services.services.map((service) => service.name),
    ["AC repair", "AC installation", "HVAC maintenance", "Emergency HVAC service"],
  );
  assert.deepEqual(
    sanitized.leadForm?.needOptions,
    ["AC repair", "AC installation", "HVAC maintenance", "Emergency HVAC service"],
  );
  assert.deepEqual(
    sanitized.footer.serviceLinks?.map((link) => link.label),
    ["AC repair", "AC installation", "HVAC maintenance", "Emergency HVAC service"],
  );
  assert.doesNotMatch(JSON.stringify(sanitized), /AC Repair and Maintenance/);
  assert.equal(sanitized.services.cta?.text?.title, "Need HVAC help?");
  assert.equal(
    sanitized.services.cta?.text?.sub,
    "Call DesertCool HVAC or submit a request during Monday-Friday business hours.",
  );
  assert.equal(sanitized.leadForm?.heading, "Tell us what you need");
  assert.equal(
    sanitized.leadForm?.subheading,
    "Share your contact details and choose a service. DesertCool HVAC can follow up during business hours.",
  );
  assert.equal(sanitized.faq.items[0]?.question, "What HVAC services do you provide?");
  assert.equal(
    sanitized.faq.items[0]?.answer,
    "DesertCool HVAC provides AC repair, AC installation, HVAC maintenance, and Emergency HVAC service.",
  );
  assert.ok(sanitized.faq.items.every((item) => !/How fast can you be here for an emergency\?/i.test(item.question)));
  assert.ok(sanitized.faq.items.some((item) => item.answer === "DesertCool HVAC is open Monday-Friday, 8 AM-6 PM."));
  assert.ok(sanitized.faq.items.some((item) => item.answer === "DesertCool HVAC serves Dallas, Plano, Irving, Garland, and Richardson."));
  assert.equal(sanitized.emergency, undefined);
  assert.equal(sanitized.testimonials.testimonials.length, 0);
  assert.equal(sanitized.sticky?.smsHref, undefined);
});

test("blocks Unicode non-breaking-hyphen same-day claims when unverified", () => {
  const candidate = payload();
  candidate.faq.items.push({
    id: "f5",
    question: "Do you offer same\u2011day service?",
    answer: "Yes, we can schedule same\u2011day appointments for urgent repairs.",
  });

  const sanitized = sanitizeR1LandingPayload(candidate, facts);
  const text = JSON.stringify(sanitized);

  assert.doesNotMatch(text, /same\u2011day/i);
  assert.deepEqual(validateLandingClaims(sanitized, facts), []);
});

test("DallasFlow Plumbing general fallback stays vertical-neutral and fact-grounded", () => {
  const plumbingFacts = buildVerifiedBusinessFacts({
    business_name: "DallasFlow Plumbing",
    phone: "(214) 555-0198",
    city: "Dallas",
    state: "Texas",
    service_area: ["Dallas", "Plano", "Irving"],
    offerings: ["Drain cleaning", "Leak repair", "Water heater repair", "Toilet repair", "Emergency plumbing"],
    weekly_hours: {
      monday: { enabled: true, start: "08:00", end: "18:00" },
      tuesday: { enabled: true, start: "08:00", end: "18:00" },
      wednesday: { enabled: true, start: "08:00", end: "18:00" },
      thursday: { enabled: true, start: "08:00", end: "18:00" },
      friday: { enabled: true, start: "08:00", end: "18:00" },
      saturday: { enabled: false, start: "00:00", end: "00:00" },
      sunday: { enabled: false, start: "00:00", end: "00:00" },
    },
    emergency_service: false,
  });

  const unsafePayload = payload();
  unsafePayload.hero.businessName = "DallasFlow Plumbing";
  unsafePayload.footer.businessName = "DallasFlow Plumbing";
  unsafePayload.services.services = [
    { id: "p1", name: "Drain cleaning", description: "Fast same-day drain cleaning." },
    { id: "p2", name: "Leak repair", description: "Licensed and insured leak repair." },
  ];

  const sanitized = sanitizeR1LandingPayload(unsafePayload, plumbingFacts);
  const text = JSON.stringify(sanitized);
  for (const expected of [
    "DallasFlow Plumbing",
    "Drain cleaning",
    "Leak repair",
    "Water heater repair",
    "Toilet repair",
    "Emergency plumbing",
    "Dallas",
    "Plano",
    "Irving",
    "Monday-Friday, 8 AM-6 PM",
  ]) assert.match(text, new RegExp(expected.replace(/[()]/g, "\\$&")));
  for (const forbidden of [
    "HVAC",
    "AC repair",
    "heating",
    "cooling",
    "24/7",
    "same-day",
    "free estimate",
    "licensed",
    "insured",
    "financing",
    "trusted by",
    "5-star",
  ]) assert.doesNotMatch(text.toLowerCase(), new RegExp(forbidden.toLowerCase()));
  assert.equal(sanitized.hero.tagline, "Service help for Dallas-area customers");
  assert.equal(sanitized.hero.primaryCTA.label, "Request help");
  assert.equal(sanitized.services.cta?.text?.title, "Need service help?");
  assert.equal(sanitized.emergency, undefined);
  assert.deepEqual(validateLandingClaims(sanitized, plumbingFacts), []);
});

test("public fallback data scrubber removes unsupported generic defaults but keeps verified facts", () => {
  const plumbingFacts = buildVerifiedBusinessFacts({
    business_name: "DallasFlow Plumbing",
    offerings: ["Drain cleaning"],
    service_area: ["Dallas", "Plano", "Irving"],
    free_estimates: true,
  });
  const sanitized = sanitizePublicLandingData({
    hero: "5-star rated by local customers. Licensed and insured. Same-day service available.",
    cta: "Free estimate",
    description: "Drain cleaning in Dallas.",
    payments: "Financing available",
  }, plumbingFacts);
  const text = JSON.stringify(sanitized);
  assert.match(text, /Free estimate/);
  assert.match(text, /Drain cleaning in Dallas/);
  assert.doesNotMatch(text, /5-star rated|Licensed|insured|Same-day|Financing/i);
  assert.equal(
    sanitizePublicClaimText("No hidden fees for every job.", plumbingFacts, "neutral"),
    "neutral",
  );
});

test("component defaults cannot reintroduce social proof or callback claims", () => {
  const grounded = sanitizeR1LandingPayload(payload(), facts);
  const leadFormHtml = renderToString(React.createElement(LeadFormCard, {
    orgSlug: "desertcool-hvac",
    businessName: "DesertCool HVAC",
    leadForm: { enabled: true },
  }));
  assert.match(leadFormHtml, /Submit request/);
  assert.match(leadFormHtml, /choose a service/);
  assert.doesNotMatch(leadFormHtml, /Get my callback|Trusted by your neighbors|★★★★★/);

  const testimonialsHtml = renderToString(React.createElement(Testimonials, {
    archetype: "bold-urgency",
    heading: "What neighbors say",
    testimonials: [],
  }));
  assert.equal(testimonialsHtml, "");

  const navHtml = renderToString(React.createElement(Navbar, {
    archetype: "bold-urgency",
    businessName: "DesertCool HVAC",
    phone: "(214) 555-0147",
    showReviews: false,
  }));
  assert.doesNotMatch(navHtml, />Reviews</);

  const footerHtml = renderToString(React.createElement(Footer, grounded.footer));
  for (const service of ["AC repair", "AC installation", "HVAC maintenance", "Emergency HVAC service"]) {
    assert.match(footerHtml, new RegExp(service));
  }
  assert.doesNotMatch(footerHtml, /AC Repair and Maintenance/);
});

test("embed URL follows the current local QA origin and rejects unsafe production HTTP", () => {
  const path = "/api/v1/public/agent/desertcool--hvac/embed.js";
  assert.equal(
    sanitizeChatbotEmbedUrl(`http://localhost:3000${path}`, "http://localhost:3002"),
    `http://localhost:3002${path}`,
  );
  assert.equal(
    sanitizeChatbotEmbedUrl(`http://localhost:3000${path}`, "https://desertcool.app.seldonframe.com"),
    `https://desertcool.app.seldonframe.com${path}`,
  );
  assert.equal(
    sanitizeChatbotEmbedUrl(`https://app.seldonframe.com${path}`, "https://desertcool.app.seldonframe.com"),
    `https://app.seldonframe.com${path}`,
  );
  assert.equal(
    sanitizeChatbotEmbedUrl(
      `https://app.seldonframe.com${path}`,
      "https://joined-rat-workshop-shot.trycloudflare.com",
      true,
    ),
    `https://joined-rat-workshop-shot.trycloudflare.com${path}`,
  );
  assert.equal(sanitizeChatbotEmbedUrl("http://evil.example/embed.js", "https://example.com"), null);
});
