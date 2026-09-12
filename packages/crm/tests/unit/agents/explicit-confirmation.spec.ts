import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  enforceExplicitConfirmation,
  hasPriorToolConfirmationRequest,
  isExplicitAffirmativeConfirmation,
  latestPendingConfirmationAction,
} from "../../../src/lib/agents/explicit-confirmation";

describe("isExplicitAffirmativeConfirmation", () => {
  for (const phrase of [
    "yes",
    "yeah",
    "yes, that's correct",
    "yes perfect",
    "yes please",
    "yes said already",
    "yep",
    "sure",
    "sure go ahead",
    "that's right",
    "correct",
    "go ahead and confirm it",
  ]) {
    test(`accepts explicit confirmation: ${phrase}`, () => {
      assert.equal(isExplicitAffirmativeConfirmation(phrase), true);
    });
  }

  for (const phrase of [
    "first one",
    "the 2 PM slot",
    "that works",
    "maybe",
    "not yet",
    "don't confirm it",
    "yes but change it to 10",
    "yes, but make it 11",
    "yes, instead use tomorrow",
    "sure but change the time",
    "what time is that?",
  ]) {
    test(`rejects non-confirmation: ${phrase}`, () => {
      assert.equal(isExplicitAffirmativeConfirmation(phrase), false);
    });
  }
});

describe("enforceExplicitConfirmation", () => {
  test("downgrades a premature model-supplied confirmed:true", () => {
    assert.deepEqual(
      enforceExplicitConfirmation(
        "book_appointment",
        { slotIso: "2026-08-26T16:00:00.000Z", confirmed: true },
        "first one",
        { toolName: "book_appointment", input: { slotIso: "2026-08-26T16:00:00.000Z" } },
      ),
      { slotIso: "2026-08-26T16:00:00.000Z", confirmed: false },
    );
  });

  test("promotes an omitted/changed model payload to the exact pending action after explicit yes", () => {
    const input = {
      slotIso: "changed-by-model",
      bookingSlug: "wrong-slug",
      confirmed: false,
    };
    assert.deepEqual(
      enforceExplicitConfirmation(
        "book_appointment",
        input,
        "yes",
        {
          toolName: "book_appointment",
          input: {
            slotIso: "2026-08-26T16:00:00.000Z",
            bookingSlug: "default",
            fullName: "Jane Doe",
            confirmed: false,
          },
        },
      ),
      {
        slotIso: "2026-08-26T16:00:00.000Z",
        bookingSlug: "default",
        fullName: "Jane Doe",
        confirmed: true,
      },
    );
    assert.deepEqual(
      enforceExplicitConfirmation(
        "book_appointment",
        { confirmed: true },
        "yes",
        null,
      ),
      { confirmed: false },
    );
  });

  test("recognizes a structured prior NeedsConfirmation result for the same tool", () => {
    assert.equal(
      hasPriorToolConfirmationRequest(
        [
          {
            role: "assistant",
            toolCalls: [{ id: "call-1", name: "book_appointment" }],
            toolResults: [
              {
                toolCallId: "call-1",
                ok: true,
                output: { needsConfirmation: true, readBack: "Is that correct?" },
              },
            ],
          },
        ],
        "book_appointment",
      ),
      true,
    );
    assert.equal(
      hasPriorToolConfirmationRequest([], "book_appointment"),
      false,
    );
  });

  test("an older confirmation request is not authority after a newer assistant turn", () => {
    assert.equal(
      hasPriorToolConfirmationRequest(
        [
          {
            role: "assistant",
            toolCalls: [{ id: "call-1", name: "book_appointment" }],
            toolResults: [
              { toolCallId: "call-1", ok: true, output: { needsConfirmation: true } },
            ],
          },
          { role: "user", content: "What is your address?" },
          { role: "assistant", content: "We serve the downtown area." },
          { role: "user", content: "yes" },
        ],
        "book_appointment",
      ),
      false,
    );
  });
});


describe("latestPendingConfirmationAction readBack bridge", () => {
  test("bridges an exact server readBack replay to the pending booking action", () => {
    const readBack =
      "So that's Final Golden Test, Wednesday, September 9 at 8:00 AM CDT — is that correct?";

    const pending = latestPendingConfirmationAction(
      [
        {
          role: "assistant",
          toolCalls: [
            {
              id: "booking-confirmation",
              name: "book_appointment",
              input: {
                slotIso: "2026-09-09T13:00:00.000Z",
                bookingSlug: "default",
                fullName: "Final Golden Test",
                confirmed: false,
              },
            },
          ],
          toolResults: [
            {
              toolCallId: "booking-confirmation",
              ok: true,
              output: {
                ok: false,
                needsConfirmation: true,
                readBack,
              },
            },
          ],
        },
        { role: "user", content: "Hey do you checked?" },
        { role: "assistant", content: readBack },
        { role: "user", content: "Yes" },
      ],
      "book_appointment",
    );

    assert.deepEqual(pending, {
      toolName: "book_appointment",
      input: {
        slotIso: "2026-09-09T13:00:00.000Z",
        bookingSlug: "default",
        fullName: "Final Golden Test",
        confirmed: false,
      },
    });
  });

  test("does not bridge unrelated assistant text to an older pending action", () => {
    const pending = latestPendingConfirmationAction(
      [
        {
          role: "assistant",
          toolCalls: [
            {
              id: "booking-confirmation",
              name: "book_appointment",
              input: {
                slotIso: "2026-09-09T13:00:00.000Z",
                confirmed: false,
              },
            },
          ],
          toolResults: [
            {
              toolCallId: "booking-confirmation",
              ok: true,
              output: {
                needsConfirmation: true,
                readBack: "So that's Jane Doe, Wednesday at 8:00 AM — is that correct?",
              },
            },
          ],
        },
        { role: "user", content: "What areas do you serve?" },
        { role: "assistant", content: "We serve the Dallas area." },
        { role: "user", content: "Yes" },
      ],
      "book_appointment",
    );

    assert.equal(pending, null);
  });
});
