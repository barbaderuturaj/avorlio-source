/**
 * Narrow deterministic fast-path for public website-chat availability.
 *
 * Only force the tool when the visitor explicitly asks to VIEW availability
 * and does NOT provide date-specific language. Date-specific requests remain
 * with the model/temporal-reasoning path.
 */

const EXPLICIT_AVAILABILITY_PATTERN =
  /\b(available\s+(?:times?|appointments?|slots?)|availability|next\s+openings?|appointment\s+slots?|what\s+times?\s+(?:do\s+you\s+have|are\s+available)|show\s+(?:me\s+)?(?:available\s+)?times?|check\s+availability)\b/i;

const DATE_SPECIFIC_PATTERN =
  /\b(today|tomorrow|tonight|this\s+(?:morning|afternoon|evening|week|weekend|month)|next\s+(?:week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|in\s+\d+\s+(?:day|days|week|weeks)|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/i;

/** Any explicit request to perform a new availability lookup. */
export function isPublicAvailabilityRequest(userMessage: string): boolean {
  return EXPLICIT_AVAILABILITY_PATTERN.test(userMessage);
}

export function shouldForceGenericAvailabilityLookup(
  userMessage: string,
): boolean {
  return (
    isPublicAvailabilityRequest(userMessage) &&
    !DATE_SPECIFIC_PATTERN.test(userMessage)
  );
}

export function localDateYmd(
  now: Date,
  timezone: string,
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}
