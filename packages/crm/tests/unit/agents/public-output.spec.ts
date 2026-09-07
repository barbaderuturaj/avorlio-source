import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { enforcePublicAgentOutput } from "../../../src/lib/agents/public-output";
import type { AgentToolCall, AgentToolResult } from "../../../src/db/schema/agents";

const bookingCall: AgentToolCall = {
  id: "book-1",
  name: "book_appointment",
  input: {
    fullName: "QA Truth Test",
    slotIso: "2026-08-26T14:00:00.000Z",
  },
};

const readBackResult: AgentToolResult = {
  toolCallId: "book-1",
  ok: true,
  output: {
    ok: false,
    needsConfirmation: true,
    readBack: "So that's QA Truth Test, 2026-08-26T14:00:00.000Z — is that correct?",
  },
};

describe("public website-agent output boundary", () => {
  test("rebuilds the pending booking readback from the exact slot and business timezone", () => {
    const output = enforcePublicAgentOutput(
      "So that's QA Truth Test, 2026-08-26T14:00:00.000Z — is that correct?",
      [bookingCall],
      [readBackResult],
      "America/Chicago",
    );

    assert.equal(
      output,
      "So that's QA Truth Test, Wednesday, August 26 at 9:00 AM CDT — is that correct?",
    );
    assert.doesNotMatch(output, /2026-08-26T14:00:00\.000Z/);
  });

  test("the SSE boundary preserves an authoritative offered-label readback without route timezone", () => {
    const safe = "Just to confirm: AC repair for QA Truth Test on Wednesday, August 26 at 9:00 AM CDT. Is that correct?";
    const output = enforcePublicAgentOutput(
      safe,
      [bookingCall],
      [readBackResult],
    );

    assert.equal(output, safe);
    assert.doesNotMatch(output, /2026-08-26T14:00:00\.000Z/);
  });

  test("never emits raw ISO when neither route timezone nor a safe tool readback is available", () => {
    const output = enforcePublicAgentOutput(
      "So that's QA Truth Test, 2026-08-26T14:00:00.000Z — is that correct?",
      [bookingCall],
      [readBackResult],
    );
    assert.equal(output, "Please confirm those appointment details.");
    assert.doesNotMatch(output, /2026-08-26T14:00:00\.000Z/);
  });

  test("sanitizes the final SSE payload before it can reach the browser", () => {
    const output = enforcePublicAgentOutput(
      "Done — you're booked for Wednesday, August 26 at 9:00 AM CDT. A confirmation text will arrive shortly.",
      [],
      [],
    );

    assert.equal(output, "Done — you're booked for Wednesday, August 26 at 9:00 AM CDT.");
    assert.doesNotMatch(output, /confirmation text|will arrive|on its way|sent/i);
  });

  test("keeps a successful booking confirmation intact", () => {
    const output = enforcePublicAgentOutput(
      "Done — you're booked for Wednesday, August 26 at 9:00 AM CDT.",
      [
        {
          id: "book-2",
          name: "book_appointment",
          input: { fullName: "QA Truth Test", slotIso: "2026-08-26T14:00:00.000Z", confirmed: true },
        },
      ],
      [{ toolCallId: "book-2", ok: true, output: { ok: true, bookingId: "booking-1" } }],
    );

    assert.match(output, /you're booked/i);
  });

  test("does not claim a pending-payment booking is fully booked", () => {
    const checkoutUrl = "https://checkout.stripe.com/c/pay/qa-test";

    const output = enforcePublicAgentOutput(
      "Done - you're booked for Wednesday, August 26 at 10:00 AM CDT.",
      [
        {
          id: "book-paid",
          name: "book_appointment",
          input: {
            fullName: "Paid QA",
            slotIso: "2026-08-26T15:00:00.000Z",
            confirmed: true,
          },
        },
      ],
      [{
        toolCallId: "book-paid",
        ok: true,
        output: {
          ok: true,
          bookingId: "booking-paid-1",
          paymentRequired: true,
          checkoutUrl,
          displayTime: "Wednesday, August 26 at 10:00 AM CDT",
        },
      }],
      "America/Chicago",
    );

    assert.match(output, /reserved/i);
    assert.match(output, /payment/i);
    assert.match(output, /checkout\.stripe\.com/);
    assert.doesNotMatch(output, /you're booked/i);
  });

  test("constructs the authoritative success response without another model completion", () => {
    const output = enforcePublicAgentOutput(
      "I'm having a hiccup. Can I have someone follow up with you? What's your email?",
      [
        {
          id: "book-3",
          name: "book_appointment",
          input: {
            fullName: "QA SSE Final",
            slotIso: "2026-08-26T15:00:00.000Z",
            confirmed: true,
          },
        },
      ],
      [{
        toolCallId: "book-3",
        ok: true,
        output: { ok: true, bookingId: "89f8cef5-1976-4ae4-a4d1-a9edc20ee3da" },
      }],
      "America/Chicago",
    );

    assert.equal(output, "Done — you're booked for Wednesday, August 26 at 10:00 AM CDT.");
    assert.doesNotMatch(output, /hiccup|follow up|email/i);
  });
});
