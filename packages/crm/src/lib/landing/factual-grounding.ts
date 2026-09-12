import type { R1LandingPayload } from "./r1-payload-prompt";
import { serviceSlug } from "./r1-site-tree";

export type VerifiedBusinessFacts = {
  businessName: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  serviceAreas: string[];
  services: string[];
  hours: string[];
  emergencyService: boolean;
  emergency24x7: boolean;
  onCall: boolean;
  sameDay: boolean;
  responseTime: string | null;
  freeEstimates: boolean;
  noHiddenFees: boolean;
  licensing: string[];
  financing: string[];
  reviewsVerified: boolean;
  testimonialsVerified: boolean;
  staffVerified: boolean;
  callbackPromise: string | null;
};

type LooseRecord = Record<string, unknown>;

const CLAIM_PATTERNS: Array<{ pattern: RegExp; supported: (facts: VerifiedBusinessFacts) => boolean }> = [
  { pattern: /\b24\s*\/\s*7\b|\b24-hour\b|always\s+on\s+call|on[- ]call\s+now/i, supported: (facts) => facts.emergency24x7 || facts.onCall },
  { pattern: /\bsame[- ]day\b/i, supported: (facts) => facts.sameDay },
  { pattern: /\b(?:30|60)[- ]minute(?:s)?\b|within\s+(?:the\s+)?hour|within\s+hours?\s*,?\s*not\s+days|fix(?:es|ing)?\s+(?:it\s+)?in\s+minutes?/i, supported: (facts) => Boolean(facts.responseTime) },
  { pattern: /free\s+(?:estimate|quote)|no[- ]obligation\s+(?:estimate|quote)/i, supported: (facts) => facts.freeEstimates },
  { pattern: /no\s+(?:surprise|hidden)\s+(?:charges?|fees?)|guarantee(?:d|s)?\s+pricing/i, supported: (facts) => facts.noHiddenFees },
  { pattern: /\b(?:licensed|licen[cs]ed|insured|bonded|certified|certification)\b/i, supported: (facts) => facts.licensing.length > 0 },
  { pattern: /\bfinancing\b/i, supported: (facts) => facts.financing.length > 0 },
  { pattern: /\b(?:5[- ]star|ratings?|reviews?|testimonials?)\b|trusted\s+by\s+(?:your\s+)?[^.!?]{0,40}\b(?:neighbors?|residents?|customers?)\b/i, supported: (facts) => facts.reviewsVerified || facts.testimonialsVerified },
  { pattern: /\b(?:\d+\s*(?:yrs?|years?)|technician\s+names?)\b/i, supported: (facts) => facts.staffVerified },
  { pattern: /\b(?:get|request|fast)\s+(?:my|a)?\s*callback\b|callback.{0,30}(?:hour|minute|today|soon|shortly)/i, supported: (facts) => Boolean(facts.callbackPromise) },
  { pattern: /\b3\s*AM\b|\b30\s+minutes?\b/i, supported: (facts) => Boolean(facts.responseTime) },
];

const UNSUPPORTED_CLAIM = new RegExp(CLAIM_PATTERNS.map((entry) => entry.pattern.source).join("|"), "i");

const HTML_TAGS = /<[^>]*>/g;

function record(value: unknown): LooseRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as LooseRecord : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
      .map((item) => typeof item === "string" ? item : stringValue(record(item).name ?? record(item).title))
      .filter((v): v is string => Boolean(v))
    : [];
}

function bool(value: unknown): boolean {
  return value === true;
}

function hoursFromSoul(soul: LooseRecord): string[] {
  const explicit = stringArray(soul.hours);
  if (explicit.length) return explicit;
  const raw = record(soul.weekly_hours ?? soul.business_hours);
  const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const enabled = weekdays.every((day) => record(raw[day]).enabled === true);
  const first = record(raw.monday);
  if (enabled && first.start === "08:00" && first.end === "18:00") {
    return ["Monday-Friday, 8 AM-6 PM."];
  }
  const lines = weekdays
    .map((day) => {
      const entry = record(raw[day]);
      if (entry.enabled !== true) return null;
      const start = stringValue(entry.start);
      const end = stringValue(entry.end);
      return start && end ? `${day}, ${start}-${end}.` : null;
    })
    .filter((v): v is string => Boolean(v));
  return lines;
}

export function buildVerifiedBusinessFacts(
  soulInput: unknown,
  settingsInput?: unknown,
): VerifiedBusinessFacts {
  const soul = record(soulInput);
  const settings = record(settingsInput);
  const services = stringArray(soul.offerings ?? soul.services);
  const serviceAreas = stringArray(soul.service_area ?? soul.serviceAreas);
  const certifications = stringArray(soul.certifications);
  const financing = stringArray(soul.financing ?? soul.payment_methods);
  const reviewsVerified = Number(soul.review_count) > 0 && Number(soul.review_rating) > 0;

  return {
    businessName: stringValue(soul.business_name ?? soul.businessName) ?? "Your Business",
    phone: stringValue(soul.phone),
    city: stringValue(soul.city),
    state: stringValue(soul.state),
    serviceAreas,
    services,
    hours: hoursFromSoul(soul),
    emergencyService: bool(soul.emergency_service),
    emergency24x7: bool(soul.emergency_24x7 ?? settings.emergency24x7),
    onCall: bool(soul.on_call ?? settings.onCall),
    sameDay: bool(soul.same_day),
    responseTime: stringValue(soul.response_time ?? settings.responseTime),
    freeEstimates: bool(soul.free_estimates),
    noHiddenFees: bool(soul.no_hidden_fees),
    licensing: certifications,
    financing,
    reviewsVerified,
    testimonialsVerified: bool(soul.verified_testimonials ?? settings.verifiedTestimonials),
    staffVerified: bool(soul.verified_staff ?? settings.verifiedStaff),
    callbackPromise: stringValue(soul.callback_promise ?? settings.callbackPromise),
  };
}

function neutralText(facts: VerifiedBusinessFacts, field: string): string {
  if (field === "business") return facts.businessName;
  if (field === "phone" && facts.phone) return `Call ${facts.phone}.`;
  if (field === "serviceAreas" && facts.serviceAreas.length) {
    return `Serving ${facts.serviceAreas.join(", ").replace(/, ([^,]*)$/, ", and $1")}.`;
  }
  if (field === "services" && facts.services.length) return `${facts.services.join(", ")}.`;
  if (field === "hours" && facts.hours.length) return facts.hours.join(" ");
  return "Contact us to discuss your needs.";
}

function serviceSentence(facts: VerifiedBusinessFacts): string {
  return facts.services.length
    ? `${facts.businessName} provides ${facts.services.join(", ").replace(/, ([^,]*)$/, ", and $1")}.`
    : neutralText(facts, "text");
}

function serviceAreaSentence(facts: VerifiedBusinessFacts): string {
  return facts.serviceAreas.length
    ? `${facts.businessName} serves ${facts.serviceAreas.join(", ").replace(/, ([^,]*)$/, ", and $1")}.`
    : neutralText(facts, "text");
}

function hoursSentence(facts: VerifiedBusinessFacts): string {
  return facts.hours.length
    ? `${facts.businessName} is open ${facts.hours.join(" ").replace(/\.$/, "")}.`
    : neutralText(facts, "text");
}

function hasUnsupportedClaim(text: string, facts: VerifiedBusinessFacts): boolean {
  return CLAIM_PATTERNS.some((entry) => entry.pattern.test(text) && !entry.supported(facts));
}

const HVAC_LANGUAGE = /\bhvac\b|\bac\b|air\s*condition(?:ing)?|heating\s*(?:and|&)\s*cooling/i;

function factsSupportHvacLanguage(facts: VerifiedBusinessFacts): boolean {
  return HVAC_LANGUAGE.test([facts.businessName, ...facts.services].join(" "));
}

function hasUnsupportedVerticalLanguage(
  text: string,
  facts: VerifiedBusinessFacts,
): boolean {
  return HVAC_LANGUAGE.test(text) && !factsSupportHvacLanguage(facts);
}

function hasUnsupportedPublicText(
  text: string,
  facts: VerifiedBusinessFacts,
): boolean {
  return hasUnsupportedClaim(text, facts) || hasUnsupportedVerticalLanguage(text, facts);
}

function collectPublicStringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectPublicStringValues(item));
  }

  if (value && typeof value === "object") {
    return Object.values(value as LooseRecord).flatMap((item) =>
      collectPublicStringValues(item),
    );
  }

  return [];
}

export function sanitizePublicClaimText(
  value: unknown,
  facts: VerifiedBusinessFacts,
  fallback = "Contact us to discuss your service needs.",
): string {
  const text = stringValue(value) ?? "";
  return text && !hasUnsupportedPublicText(text, facts) ? text : fallback;
}

function sanitizeUnknownValue(value: unknown, facts: VerifiedBusinessFacts): unknown {
  if (typeof value === "string") return sanitizePublicClaimText(value, facts, "");
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeUnknownValue(item, facts))
      .filter((item) => {
        if (item === "") return false;
        if (item && typeof item === "object" && !Array.isArray(item)) return Object.keys(item).length > 0;
        return true;
      });
  }
  if (value && typeof value === "object") {
    const out: LooseRecord = {};
    for (const [key, nested] of Object.entries(value as LooseRecord)) {
      if ((key === "testimonials" || key === "reviews") && !facts.testimonialsVerified && !facts.reviewsVerified) {
        out[key] = [];
        continue;
      }
      const sanitized = sanitizeUnknownValue(nested, facts);
      if (sanitized !== "" && sanitized !== undefined) out[key] = sanitized;
    }
    return out;
  }
  return value;
}

export function sanitizePublicLandingData<T>(value: T, facts: VerifiedBusinessFacts): T {
  return sanitizeUnknownValue(value, facts) as T;
}

export function sanitizePublicHtml(html: string, facts: VerifiedBusinessFacts): string {
  if (!html || !hasUnsupportedClaim(stripHtmlForClaimValidation(html), facts)) return html;
  return html
    .replace(/<section\b[^>]*(?:trust|testimonial|review)[\s\S]*?<\/section>/gi, "")
    .replace(/<[^>]+>[^<>]*(?:5[- ]star|ratings?|reviews?|testimonials?|licensed|insured|financing|same[- ]day|free\s+(?:estimate|quote)|24\s*\/\s*7)[^<>]*<\/[^>]+>/gi, "")
    .replace(/\b(?:5[- ]star rated by local customers|licensed and insured|same[- ]day service available|free estimates?|free quotes?|financing available)\b/gi, "")
    .replace(/\s{2,}/g, " ");
}

export function buildGroundedMetadataDescription(facts: VerifiedBusinessFacts): string {
  const services = facts.services.length
    ? facts.services.join(", ").replace(/, ([^,]*)$/, ", and $1")
    : "services";
  const areas = facts.serviceAreas.length
    ? facts.serviceAreas.join(", ").replace(/, ([^,]*)$/, ", and $1")
    : facts.city ?? "your area";
  return `${facts.businessName} serves ${areas} with ${services}.`;
}

function isEmergencySpeedQuestion(text: string): boolean {
  return /how\s+fast|how\s+soon|how\s+quick|arrival|arrive|response|dispatch|urgent|emergency.{0,30}(?:here|arrival|response|fast|soon)|(?:here|arrival|response|fast|soon).{0,30}emergency/i.test(text);
}

function isHoursQuestion(text: string): boolean {
  return /hours|open|closed|available/i.test(text);
}

function isServiceAreaQuestion(text: string): boolean {
  return /where|area|serve|serving|cities|locations/i.test(text);
}

function isPricingQuestion(text: string): boolean {
  return /price|cost|pricing|quote|estimate|fee|charge/i.test(text);
}

function scrubText(value: unknown, facts: VerifiedBusinessFacts, field = "text"): string {
  const text = stringValue(value) ?? "";
  if (!text) return "";
  if (!hasUnsupportedPublicText(text, facts)) return text;
  if (field === "hours") return neutralText(facts, "hours");
  if (field === "serviceAreas") return neutralText(facts, "serviceAreas");
  if (field === "services") return neutralText(facts, "services");
  if (field === "phone") return neutralText(facts, "phone");
  return neutralText(facts, "text");
}

function scrubCTA<T extends { label: string; href: string } | undefined>(cta: T, facts: VerifiedBusinessFacts): T | undefined {
  if (!cta) return undefined;
  const isPrimaryHelpCTA = /contact\s+us|discuss\s+your\s+needs|request\s+(?:a\s+)?(?:free\s+)?quote|get\s+(?:a\s+)?free\s+(?:estimate|quote)/i.test(cta.label);
  return {
    ...cta,
    // Help/quote CTAs are the existing intake surface. Preserve the action
    // semantics when grounding rewrites a generated booking-flavored label.
    href: isPrimaryHelpCTA ? "/intake" : cta.href,
    label: isPrimaryHelpCTA
      ? (facts.services.some((service) => /\bhvac\b|\bac\b|air\s*condition/i.test(service)) ? "Request HVAC help" : "Request help")
      : scrubText(cta.label, facts) || "Contact us",
  } as T;
}

export function sanitizeR1LandingPayload(
  payload: R1LandingPayload,
  facts: VerifiedBusinessFacts,
): R1LandingPayload {
  const p = JSON.parse(JSON.stringify(payload)) as R1LandingPayload;
  if (facts.businessName !== "Your Business") p.hero.businessName = facts.businessName;
  p.hero.tagline = scrubText(p.hero.tagline, facts);
  p.hero.subhead = scrubText(p.hero.subhead, facts);
  if (facts.city && facts.services.length && facts.serviceAreas.length) {
    p.hero.tagline = facts.services.some((service) => /\bhvac\b|\bac\b|air\s*condition/i.test(service))
      ? `HVAC help for ${facts.city}-area homes`
      : `Service help for ${facts.city}-area customers`;
    p.hero.subhead = `${facts.businessName} provides ${facts.services.join(", ").replace(/, ([^,]*)$/, ", and $1")} across ${facts.serviceAreas.join(", ").replace(/, ([^,]*)$/, ", and $1")}.`;
  }
  p.hero.trustBadges = p.hero.trustBadges
    .filter((b) => !hasUnsupportedPublicText(b.label, facts))
    .map((b) => ({ ...b, label: scrubText(b.label, facts) }));
  p.hero.primaryCTA = scrubCTA(p.hero.primaryCTA, facts)!;
  p.hero.secondaryCTA = scrubCTA(p.hero.secondaryCTA, facts);
  if (p.hero.heroOverlay && UNSUPPORTED_CLAIM.test(JSON.stringify(p.hero.heroOverlay))) p.hero.heroOverlay = undefined;
  if (facts.phone && p.hero.secondaryCTA?.href.startsWith("tel:")) p.hero.secondaryCTA = { ...p.hero.secondaryCTA, label: `Call ${facts.phone}` };
  p.hero.reviewRating = undefined;
  p.hero.reviewCount = undefined;
  p.hero.emergencyService = facts.emergencyService;

  p.services.heading = scrubText(p.services.heading, facts);
  p.services.intro = scrubText(p.services.intro, facts);
  if (facts.services.length) {
    const existing = p.services.services;
    p.services.services = facts.services.map((name, index) => {
      const match = existing.find((service) => service.name.toLowerCase() === name.toLowerCase());
      return match
        ? { ...match, name, description: scrubText(match.description, facts, "services") }
        : { id: `grounded-service-${index + 1}`, name, description: `${facts.businessName} provides ${name}.` };
    });
  } else {
    p.services.services = p.services.services.map((service) => ({ ...service, description: scrubText(service.description, facts, "services") }));
  }
  if (facts.services.length) {
    p.leadForm = p.leadForm
      ? { ...p.leadForm, needOptions: facts.services }
      : undefined;
  }
  if (facts.businessName !== "Your Business" && facts.services.length && facts.serviceAreas.length) {
    p.services.intro = `Choose the service you need and contact ${facts.businessName} for current availability.`;
  }
  p.services.cta = p.services.cta ? {
    ...p.services.cta,
    label: scrubText(p.services.cta.label, facts),
    text: {
      title: facts.services.some((service) => /\bhvac\b|\bac\b|air\s*condition/i.test(service)) ? "Need HVAC help?" : "Need service help?",
      sub: facts.businessName !== "Your Business"
        ? `Call ${facts.businessName} or submit a request during ${facts.hours.length ? "Monday-Friday business hours" : "business hours"}.`
        : "Contact us to discuss your needs.",
    },
  } : undefined;

  p.testimonials.testimonials = facts.testimonialsVerified ? p.testimonials.testimonials : [];
  p.testimonials.reviewSummary = undefined;
  p.testimonials.heading = p.testimonials.testimonials.length ? scrubText(p.testimonials.heading, facts) : "";

  p.faq.items = p.faq.items
    .map((item) => {
      if (isEmergencySpeedQuestion(item.question) && !facts.responseTime && !facts.onCall) {
        return {
          ...item,
          question: facts.services.some((service) => /\bhvac\b|\bac\b|air\s*condition/i.test(service)) ? "What HVAC services do you provide?" : "What services do you provide?",
          answer: serviceSentence(facts),
        };
      }
      if (isHoursQuestion(item.question) && facts.hours.length) {
        return { ...item, question: "What are your business hours?", answer: hoursSentence(facts) };
      }
      if (isServiceAreaQuestion(item.question) && facts.serviceAreas.length) {
        return { ...item, question: "Which areas do you serve?", answer: serviceAreaSentence(facts) };
      }
      if (isPricingQuestion(item.question) && !facts.freeEstimates && !facts.noHiddenFees) {
        return { ...item, answer: `Contact ${facts.businessName} to discuss your service needs and current availability.` };
      }
      return { ...item, question: scrubText(item.question, facts), answer: scrubText(item.answer, facts) };
    })
    .filter((item) => item.question && item.answer);
  if (p.faq.cta) p.faq.cta = { ...p.faq.cta, title: scrubText(p.faq.cta.title, facts), sub: scrubText(p.faq.cta.sub, facts), label: scrubText(p.faq.cta.label, facts) };

  if (facts.businessName !== "Your Business") p.footer.businessName = facts.businessName;
  if (facts.phone) p.footer.phone = facts.phone;
  p.footer.serviceAreas = facts.serviceAreas;
  p.footer.weeklyHours = facts.hours.map((line) => ({ line }));
  p.footer.license = undefined;
  p.footer.trustBadges = (p.footer.trustBadges ?? [])
    .filter((b) => !hasUnsupportedPublicText(b.label, facts))
    .map((b) => ({ ...b, label: scrubText(b.label, facts) }));
  if (facts.services.length) {
    const existingLinks = p.footer.serviceLinks ?? [];
    p.footer.serviceLinks = facts.services.map((service) => ({
      label: service,
      href: existingLinks.find((link) => link.label.toLowerCase() === service.toLowerCase())?.href ?? "#services",
    }));
  } else if (p.footer.serviceLinks) {
    p.footer.serviceLinks = p.footer.serviceLinks.map((link) => ({ ...link, label: scrubText(link.label, facts) }));
  }
  p.footer.tagline = p.footer.tagline ? scrubText(p.footer.tagline, facts) : undefined;

  p.emergency = facts.emergencyService && (facts.emergency24x7 || facts.onCall) ? p.emergency : undefined;
  if (p.leadForm) {
    p.leadForm.heading = scrubText(p.leadForm.heading, facts);
    p.leadForm.subheading = scrubText(p.leadForm.subheading, facts);
    p.leadForm.consentText = scrubText(p.leadForm.consentText, facts);
    if (facts.businessName !== "Your Business" && facts.hours.length) {
      p.leadForm.heading = "Tell us what you need";
      p.leadForm.subheading = `Share your contact details and choose a service. ${facts.businessName} can follow up during business hours.`;
    }
  }
  if (p.sticky) {
    p.sticky.phone = facts.phone ?? p.sticky.phone;
    if (!facts.callbackPromise) p.sticky.smsHref = undefined;
  }
  if (p.servicePages || facts.services.length) {
    const existingPages = p.servicePages ?? [];
    p.servicePages = facts.services.length
      ? p.services.services.map((service) => {
        const page = existingPages.find((candidate) => candidate.name.toLowerCase() === service.name.toLowerCase());
        return page
          ? {
            ...page,
            name: service.name,
            slug: serviceSlug(service.name),
            summary: scrubText(page.summary, facts),
            body: page.body.map((block) => ({ ...block, text: scrubText(block.text, facts) })),
            ctaLabel: scrubText(page.ctaLabel, facts),
            testimonials: facts.testimonialsVerified ? page.testimonials : undefined,
          }
          : {
            slug: serviceSlug(service.name),
            name: service.name,
            summary: service.description,
            body: [{ kind: "paragraph" as const, text: service.description }],
            ctaLabel: facts.freeEstimates ? "Get a free estimate" : "Book service",
          };
      })
      : existingPages.map((page) => ({
        ...page,
        summary: scrubText(page.summary, facts),
        body: page.body.map((block) => ({ ...block, text: scrubText(block.text, facts) })),
        ctaLabel: scrubText(page.ctaLabel, facts),
        testimonials: facts.testimonialsVerified ? page.testimonials : undefined,
      }));
  }
  if (p.nav) {
    p.nav.items = p.nav.items?.map((item) => ({ ...item, label: scrubText(item.label, facts) }));
    if (p.nav.cta) p.nav.cta = { ...p.nav.cta, label: scrubText(p.nav.cta.label, facts) };
  }
  return p;
}

export function validateLandingClaims(payloadOrText: R1LandingPayload | string, facts: VerifiedBusinessFacts): string[] {
  const text = typeof payloadOrText === "string"
    ? payloadOrText
    : collectPublicStringValues(payloadOrText).join(" ");
  const errors: string[] = [];
  if (hasUnsupportedPublicText(text, facts)) errors.push("unsupported factual claim detected");
  if (typeof payloadOrText !== "string" && payloadOrText.testimonials.testimonials.length > 0 && !facts.testimonialsVerified) errors.push("unverified testimonials detected");
  return errors;
}

export function sanitizeChatbotEmbedUrl(
  embedUrl: string,
  requestOrigin: string,
): string | null {
  try {
    const stored = new URL(embedUrl);
    const request = new URL(requestOrigin);
    if (!/^https?:$/.test(request.protocol)) return null;
    const localRequest = request.hostname === "localhost" || request.hostname === "127.0.0.1";
    const localStored = stored.hostname === "localhost" || stored.hostname === "127.0.0.1";
    if (localRequest || localStored) {
      if (localRequest && localStored && stored.host === request.host) return stored.toString();
      stored.protocol = request.protocol;
      stored.hostname = request.hostname;
      stored.port = request.port;
      return stored.toString();
    }
    return stored.protocol === "https:" ? stored.toString() : null;
  } catch {
    return null;
  }
}

export function stripHtmlForClaimValidation(html: string): string {
  return html.replace(HTML_TAGS, " ");
}
