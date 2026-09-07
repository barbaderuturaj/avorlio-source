from pathlib import Path

helper = Path(r"packages/crm/src/lib/agents/public-availability-intent.ts")
helper.write_text(r'''/**
 * Narrow deterministic fast-path for public website-chat availability.
 *
 * Only force the tool when the visitor explicitly asks to VIEW availability
 * and does NOT provide date-specific language. Date-specific requests remain
 * with the model/temporal-reasoning path.
 */

const EXPLICIT_AVAILABILITY_PATTERN =
  /\b(available\s+(?:times?|appointments?|slots?)|availability|next\s+openings?|appointment\s+slots?|what\s+times?\s+(?:do\s+you\s+have|are\s+available)|show\s+(?:me\s+)?(?:available\s+)?times?|check\s+availability)\b/i;

const DATE_SPECIFIC_PATTERN =
  /\b(today|tomorrow|tonight|this\s+(?:morning|afternoon|evening|week|weekend)|next\s+(?:week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/i;

export function shouldForceGenericAvailabilityLookup(
  userMessage: string,
): boolean {
  return (
    EXPLICIT_AVAILABILITY_PATTERN.test(userMessage) &&
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
''', encoding="utf-8")

test = Path(r"packages/crm/tests/unit/agents/public-availability-intent.spec.ts")
test.write_text(r'''import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  localDateYmd,
  shouldForceGenericAvailabilityLookup,
} from "../../../src/lib/agents/public-availability-intent";

describe("public availability intent", () => {
  test("forces generic explicit availability questions", () => {
    assert.equal(
      shouldForceGenericAvailabilityLookup(
        "What times do you have available for AC repair?",
      ),
      true,
    );
    assert.equal(
      shouldForceGenericAvailabilityLookup("Can I see your available times?"),
      true,
    );
    assert.equal(
      shouldForceGenericAvailabilityLookup("Check availability please"),
      true,
    );
    assert.equal(
      shouldForceGenericAvailabilityLookup("What are your next openings?"),
      true,
    );
  });

  test("does not hijack date-specific availability requests", () => {
    assert.equal(
      shouldForceGenericAvailabilityLookup(
        "What times do you have available tomorrow?",
      ),
      false,
    );
    assert.equal(
      shouldForceGenericAvailabilityLookup("Any openings next Friday?"),
      false,
    );
    assert.equal(
      shouldForceGenericAvailabilityLookup("What is available today?"),
      false,
    );
  });

  test("does not treat general service questions as availability intent", () => {
    assert.equal(
      shouldForceGenericAvailabilityLookup("Can you repair my AC?"),
      false,
    );
    assert.equal(
      shouldForceGenericAvailabilityLookup("How much is AC repair?"),
      false,
    );
  });

  test("builds YYYY-MM-DD in the business timezone", () => {
    const instant = new Date("2026-08-28T02:00:00.000Z");

    assert.equal(localDateYmd(instant, "America/Chicago"), "2026-08-27");
    assert.equal(localDateYmd(instant, "Asia/Kolkata"), "2026-08-28");
  });
});
''', encoding="utf-8")

print("PASS: availability intent helper + tests created")
