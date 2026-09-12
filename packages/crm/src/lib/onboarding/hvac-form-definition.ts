import type { IntakeFormField } from "@/db/schema/intake-forms";

export type HvacField = IntakeFormField & { step: number };

export const HVAC_ONBOARDING_FIELDS: HvacField[] = [
  { step: 1, key: "business_name", label: "Business name", type: "text", required: true },
  { step: 1, key: "owner_contact_name", label: "Primary owner/contact name", type: "text", required: true },
  { step: 1, key: "operator_email", label: "Primary operator email", type: "email", required: true },
  { step: 1, key: "business_phone", label: "Business phone", type: "phone", required: true },
  { step: 1, key: "website_url", label: "Website URL", type: "text", required: true },
  { step: 1, key: "business_timezone", label: "Business timezone", type: "text", required: true },
  { step: 1, key: "business_address", label: "Business address", type: "textarea", required: false },
  { step: 1, key: "google_business_profile_url", label: "Google Business Profile URL", type: "text", required: false },
  { step: 2, key: "primary_city_state", label: "Primary city/state", type: "text", required: true },
  { step: 2, key: "service_area", label: "Service area (cities, ZIP codes, counties)", type: "textarea", required: true },
  { step: 2, key: "emergency_service", label: "Do you offer emergency / after-hours service?", type: "select", required: true, options: ["Yes", "No"] },
  { step: 2, key: "emergency_phone", label: "Emergency/after-hours phone number", type: "phone", required: false },
  { step: 3, key: "hvac_services", label: "HVAC services you offer", type: "multi-select", required: true, options: ["AC repair", "AC maintenance / tune-ups", "AC installation / replacement", "Furnace / heating repair", "Furnace / heating maintenance", "Furnace / heating installation", "Heat pumps", "Mini-splits / ductless", "Indoor air quality", "Thermostats", "Ductwork", "Commercial HVAC", "Other"] },
  { step: 3, key: "other_services_notes", label: "Other services / notes", type: "textarea", required: false },
  { step: 3, key: "excluded_ai_services", label: "Are there services you DO NOT want the AI to offer or discuss?", type: "textarea", required: false },
  { step: 4, key: "business_hours", label: "Business hours", type: "textarea", required: true },
  { step: 4, key: "appointment_duration", label: "Preferred appointment duration", type: "select", required: true, options: ["30 min", "60 min", "90 min", "Custom"] },
  { step: 4, key: "booking_notice", label: "How much notice should customers give before booking?", type: "select", required: true, options: ["Same day allowed", "2 hours", "4 hours", "24 hours", "Custom"] },
  { step: 4, key: "booking_types", label: "Booking types you want initially", type: "multi-select", required: true, options: ["Service / diagnostic call", "Repair appointment", "Maintenance / tune-up", "Estimate / replacement consultation", "Other"] },
  { step: 4, key: "google_calendar_email", label: "Google Calendar email", type: "email", required: false },
  { step: 5, key: "diagnostic_fee", label: "Service/diagnostic call fee", type: "text", required: false },
  { step: 5, key: "ai_quote_fee", label: "Can the AI quote this fee publicly?", type: "select", required: true, options: ["Yes", "No"] },
  { step: 5, key: "approved_pricing", label: "Pricing or price ranges the AI is allowed to mention", type: "textarea", required: false },
  { step: 5, key: "financing", label: "Financing available?", type: "select", required: true, options: ["Yes", "No", "Not sure / not applicable"] },
  { step: 5, key: "brands", label: "Brands serviced/installed", type: "textarea", required: false },
  { step: 5, key: "offers_warranties_promotions", label: "Current offers, warranties, guarantees, or promotions", type: "textarea", required: false },
  { step: 5, key: "faq_information", label: "Frequently asked questions or important customer information", type: "textarea", required: false },
  { step: 5, key: "unknown_answer_policy", label: "When Avorlio doesn't know an answer, what should it do?", type: "select", required: true, options: ["Tell the customer the office will confirm", "Ask the customer to call us", "Other"] },
  { step: 6, key: "website_platform", label: "Website platform", type: "select", required: true, options: ["WordPress", "Wix", "Squarespace", "Webflow", "GoHighLevel", "Shopify", "Custom / developer-built", "Not sure", "Other"] },
  { step: 6, key: "installation_method", label: "How should Avorlio be installed?", type: "select", required: true, options: ["I can give Avorlio temporary website access", "My web developer/agency will install the snippet", "Send me installation instructions", "I'm not sure — help me choose"] },
  { step: 6, key: "book_button_behavior", label: "Should the main Book Service / Schedule Service button open the Avorlio booking page?", type: "select", required: true, options: ["Yes", "No", "Not sure"] },
  { step: 6, key: "web_contact_email", label: "Web developer / website contact email", type: "email", required: false },
  { step: 7, key: "notification_email", label: "Notification email", type: "email", required: true },
  { step: 7, key: "portal_email", label: "Primary client-portal email", type: "email", required: true },
  { step: 7, key: "anything_else", label: "Anything else Avorlio should know before setup?", type: "textarea", required: false },
  { step: 7, key: "acknowledgement", label: "I confirm the information above is accurate and Avorlio may use it to configure my AI Front Office.", type: "select", required: true, options: ["I confirm"] },
];

export const HVAC_ONBOARDING_STEP_TITLES = [
  "Business details", "Service area", "HVAC services", "Hours + booking",
  "AI answers / business rules", "Website installation", "Notifications + final confirmation",
] as const;

export function fieldsForStep(step: number): HvacField[] {
  return HVAC_ONBOARDING_FIELDS.filter((field) => field.step === step);
}
