import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { sanitizeConfirmationMessage } from "@/lib/blueprint/renderers/calcom-month-v1";

describe("public booking confirmation truthfulness", () => {
  test("default confirmation copy does not promise calendar invite or email delivery", () => {
    const safe = sanitizeConfirmationMessage(undefined);

    assert.equal(safe, "Your booking is confirmed.");
    assert.doesNotMatch(safe, /calendar invite/i);
    assert.doesNotMatch(safe, /reply to .*email/i);
  });

  test("stale blueprint copy that promises delivery is neutralized", () => {
    const safe = sanitizeConfirmationMessage(
      "We'll send a calendar invite shortly. If anything changes, just reply to that email.",
    );

    assert.equal(safe, "Your booking is confirmed.");
  });

  test("neutral custom confirmation remains", () => {
    assert.equal(
      sanitizeConfirmationMessage("Your appointment request has been scheduled."),
      "Your appointment request has been scheduled.",
    );
  });
});

