export type BookingTemplateResolution =
  | { ok: true; bookingSlug: string }
  | { ok: false; code: "invalid_booking_slug" | "no_booking_template"; validBookingSlugs: string[] };

/**
 * Resolve the model-facing booking slug against the organization's public
 * template rows. A single-template workspace is deterministic: service names
 * such as "ac-repair" cannot become appointment-type identifiers.
 */
export function resolveBookingTemplateSlug(
  requestedSlug: string | undefined,
  availableSlugs: readonly string[] | undefined,
): BookingTemplateResolution {
  const requested = requestedSlug?.trim();
  const valid = [...new Set((availableSlugs ?? []).map((slug) => slug.trim()).filter(Boolean))];

  // Non-public/unit tool seams preserve their historical default behavior.
  if (availableSlugs === undefined) {
    return { ok: true, bookingSlug: requested || "default" };
  }

  if (valid.length === 0) {
    return { ok: false, code: "no_booking_template", validBookingSlugs: [] };
  }

  if (requested && valid.includes(requested)) {
    return { ok: true, bookingSlug: requested };
  }

  // A single public template is the only unambiguous appointment type. This
  // deliberately maps a service-derived slug such as "ac-repair" to "default".
  if (valid.length === 1) {
    return { ok: true, bookingSlug: valid[0]! };
  }

  return { ok: false, code: "invalid_booking_slug", validBookingSlugs: valid };
}
