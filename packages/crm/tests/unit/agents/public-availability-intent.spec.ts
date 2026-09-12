import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  isPublicAvailabilityRequest,
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
    assert.equal(
      shouldForceGenericAvailabilityLookup("What times are available August 30?"),
      false,
    );
    assert.equal(
      shouldForceGenericAvailabilityLookup("What openings do you have next month?"),
      false,
    );
  });

  test("date-specific lookup still starts a new booking attempt", () => {
    assert.equal(
      isPublicAvailabilityRequest("What times are available August 30?"),
      true,
    );
    assert.equal(
      isPublicAvailabilityRequest("Do you have appointment slots this week?"),
      true,
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
