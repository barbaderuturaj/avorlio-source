import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  buildPublicBookingToolInput,
  buildPublicBookingFieldQuestion,
  buildPublicSlotConfirmationReadBack,
  getRecoveredBookingFieldValue,
  latestHistoricalPublicSlotSelection,
  latestPublicBookingAttemptTurns,
  latestSuccessfulAvailabilitySlots,
  missingPublicBookingFields,
  recoverPublicBookingFields,
  recoverPublicBookingFieldsFromTurns,
  resolvePublicSlotSelection,
} from "../../../src/lib/agents/public-slot-selection";

const slots = [
  {
    iso: "2026-08-26T16:00:00.000Z",
    label: "Wednesday, August 26 at 11:00 AM CDT",
  },
  {
    iso: "2026-08-26T17:00:00.000Z",
    label: "Wednesday, August 26 at 12:00 PM CDT",
  },
  {
    iso: "2026-08-26T18:00:00.000Z",
    label: "Wednesday, August 26 at 1:00 PM CDT",
  },
];

describe("public offered-slot selection", () => {
  const matchedIso = (text: string): string => {
    const result = resolvePublicSlotSelection(slots, text);
    assert.equal(result.kind, "matched");
    if (result.kind !== "matched") throw new Error("expected a matched slot");
    return result.slot.iso;
  };

  test("matches an exact label and returns the stored ISO unchanged", () => {
    const result = resolvePublicSlotSelection(slots, slots[0]!.label);
    assert.deepEqual(result, { kind: "matched", slot: slots[0], index: 0 });
  });

  test("supports ordinal choices", () => {
    assert.equal(matchedIso("first one"), slots[0]!.iso);
    assert.equal(matchedIso("option 1"), slots[0]!.iso);
    assert.equal(matchedIso("second"), slots[1]!.iso);
    assert.equal(matchedIso("third one"), slots[2]!.iso);
  });

  test("supports a unique spoken time", () => {
    const result = resolvePublicSlotSelection(slots, "11 AM");
    assert.equal(result.kind, "matched");
    if (result.kind !== "matched") throw new Error("expected a matched slot");
    assert.equal(result.slot.iso, "2026-08-26T16:00:00.000Z");
    const natural = resolvePublicSlotSelection(slots, "the 11 o'clock one");
    assert.equal(natural.kind, "matched");
    if (natural.kind !== "matched") throw new Error("expected a matched slot");
    assert.equal(natural.slot.iso, result.slot.iso);
  });

  test("matches a natural month/day and hour without reconstructing the ISO", () => {
    const result = resolvePublicSlotSelection(slots, "August 26 at 11");
    assert.equal(result.kind, "matched");
    if (result.kind !== "matched") throw new Error("expected a matched slot");
    assert.equal(result.slot, slots[0]);
    assert.equal(result.slot.iso, "2026-08-26T16:00:00.000Z");
  });

  test("returns ambiguity instead of selecting among multiple matching slots", () => {
    const sameHour = [
      slots[0]!,
      { iso: "2026-08-27T16:00:00.000Z", label: "Thursday, August 27 at 11:00 AM CDT" },
    ];
    const result = resolvePublicSlotSelection(sameHour, "11 AM");
    assert.equal(result.kind, "ambiguous");
    assert.equal(result.slots.length, 2);
  });

  test("does not select an unoffered time", () => {
    assert.deepEqual(resolvePublicSlotSelection(slots, "2 PM"), { kind: "no_match" });
  });

  test("uses only the latest successful availability result", () => {
    const turns = [
      {
        role: "assistant",
        toolCalls: [{ id: "old", name: "look_up_availability", input: {} }],
        toolResults: [{ toolCallId: "old", ok: true, output: { slots: [slots[2]] } }],
      },
      {
        role: "assistant",
        toolCalls: [{ id: "latest", name: "look_up_availability", input: {} }],
        toolResults: [{ toolCallId: "latest", ok: true, output: { slots: [slots[0], slots[1]] } }],
      },
    ];
    assert.deepEqual(latestSuccessfulAvailabilitySlots(turns), [slots[0], slots[1]]);
    assert.deepEqual(resolvePublicSlotSelection(latestSuccessfulAvailabilitySlots(turns), "1 PM"), {
      kind: "no_match",
    });
  });

  test("ignores failed availability results", () => {
    const turns = [{
      role: "assistant",
      toolCalls: [{ id: "failed", name: "look_up_availability", input: {} }],
      toolResults: [{ toolCallId: "failed", ok: false, error: "unavailable" }],
    }];
    assert.deepEqual(latestSuccessfulAvailabilitySlots(turns), []);
  });

  test("does not reuse older slots after a newer successful empty result", () => {
    const turns = [
      {
        role: "assistant",
        toolCalls: [{ id: "old", name: "look_up_availability", input: {} }],
        toolResults: [{ toolCallId: "old", ok: true, output: { slots: [slots[0]] } }],
      },
      {
        role: "assistant",
        toolCalls: [{ id: "latest-empty", name: "look_up_availability", input: {} }],
        toolResults: [{ toolCallId: "latest-empty", ok: true, output: { slots: [] } }],
      },
    ];
    assert.deepEqual(latestSuccessfulAvailabilitySlots(turns), []);
  });

  test("remembers a slot choice while later turns collect booking details", () => {
    const turns = [
      {
        role: "assistant",
        toolCalls: [{ id: "availability", name: "look_up_availability", input: {} }],
        toolResults: [{ toolCallId: "availability", ok: true, output: { slots } }],
      },
      { role: "user", content: "first one" },
      { role: "assistant", content: "What name should I use?" },
      { role: "user", content: "Rutu" },
      { role: "assistant", content: "What's your phone and address?" },
      { role: "user", content: "5555555555 plano street usa" },
    ];

    assert.deepEqual(latestHistoricalPublicSlotSelection(turns), {
      kind: "matched",
      slot: slots[0],
      index: 0,
    });
  });

  test("the newest explicit slot selection wins", () => {
    const turns = [
      {
        role: "assistant",
        toolCalls: [{ id: "availability", name: "look_up_availability", input: {} }],
        toolResults: [{ toolCallId: "availability", ok: true, output: { slots } }],
      },
      { role: "user", content: "first one" },
      { role: "assistant", content: "Anything else?" },
      { role: "user", content: "second one" },
      { role: "assistant", content: "What name should I use?" },
      { role: "user", content: "Rutu" },
    ];

    assert.deepEqual(latestHistoricalPublicSlotSelection(turns), {
      kind: "matched",
      slot: slots[1],
      index: 1,
    });
  });

  test("a newer successful empty availability result invalidates old selection", () => {
    const turns = [
      {
        role: "assistant",
        toolCalls: [{ id: "old", name: "look_up_availability", input: {} }],
        toolResults: [{ toolCallId: "old", ok: true, output: { slots } }],
      },
      { role: "user", content: "first one" },
      {
        role: "assistant",
        toolCalls: [{ id: "empty", name: "look_up_availability", input: {} }],
        toolResults: [{ toolCallId: "empty", ok: true, output: { slots: [] } }],
      },
      { role: "user", content: "Rutu" },
    ];

    assert.deepEqual(latestHistoricalPublicSlotSelection(turns), {
      kind: "no_match",
    });
  });

  test("a successful confirmed booking retires the offered-slot state", () => {
    const turns = [
      {
        role: "assistant",
        toolCalls: [{ id: "availability", name: "look_up_availability", input: {} }],
        toolResults: [{ toolCallId: "availability", ok: true, output: { slots } }],
      },
      { role: "user", content: "first one" },
      {
        role: "assistant",
        toolCalls: [{
          id: "book",
          name: "book_appointment",
          input: { slotIso: slots[0]!.iso, confirmed: true },
        }],
        toolResults: [{ toolCallId: "book", ok: true, output: { ok: true, bookingId: "booking-1" } }],
      },
      { role: "user", content: "What was that time?" },
    ];

    assert.deepEqual(latestHistoricalPublicSlotSelection(turns), { kind: "no_match" });
    assert.deepEqual(latestPublicBookingAttemptTurns(turns), []);
  });

  test("scopes recovered intake to the latest availability attempt", () => {
    const oldOffer = { role: "assistant", toolCalls: [{ id: "old", name: "look_up_availability", input: {} }], toolResults: [{ toolCallId: "old", ok: true, output: { slots } }] };
    const newOffer = { role: "assistant", toolCalls: [{ id: "new", name: "look_up_availability", input: {} }], toolResults: [{ toolCallId: "new", ok: true, output: { slots } }] };
    const turns = [
      { role: "user", content: "What times are open for AC repair?" },
      oldOffer,
      { role: "user", content: "first one" },
      { role: "assistant", content: "What name should I use for the appointment?" },
      { role: "user", content: "Old Customer" },
      { role: "user", content: "What times are open for AC repair?" },
      newOffer,
      { role: "user", content: "second one" },
    ];

    const attempt = latestPublicBookingAttemptTurns(turns);
    const attemptContents = attempt.map((turn) =>
      "content" in turn ? turn.content : undefined,
    );
    assert.equal(attemptContents[0], "What times are open for AC repair?");
    assert.equal(attemptContents.includes("Old Customer"), false);
    assert.equal(recoverPublicBookingFieldsFromTurns(attempt).fullName, undefined);
    assert.equal(recoverPublicBookingFieldsFromTurns(attempt).service, "AC repair");
  });

  test("recovers explicit customer fields from prior user turns", () => {
    const fields = recoverPublicBookingFields([
      "I want an AC repair appointment.\nName: QA Loop Final\nPhone: 214-555-0101\nEmail: qa@example.com\nAddress: 1500 Main St, Dallas, TX 75201\nIssue: AC not cooling.",
      "Wednesday, August 26 at 11:00 AM CDT",
    ]);
    assert.deepEqual(fields, {
      fullName: "QA Loop Final",
      phone: "214-555-0101",
      email: "qa@example.com",
      address: "1500 Main St, Dallas, TX 75201",
      issue: "AC not cooling.",
      service: "AC repair",
    });
  });

  test("recovers natural public-chat name, phone, address, and service", () => {
    const fields = recoverPublicBookingFieldsFromTurns([
      {
        role: "user",
        content: "What times do you have available for AC repair?",
      },
      {
        role: "assistant",
        content: "I found these available times. Which works best for you?",
      },
      { role: "user", content: "first one" },
      {
        role: "assistant",
        content: "What name should I use for the appointment?",
      },
      { role: "user", content: "Rutu" },
      {
        role: "assistant",
        content:
          "What's your best phone number and full street address in our service area?",
      },
      {
        role: "user",
        content: "5555555555 plano street usa",
      },
    ]);

    assert.equal(fields.fullName, "Rutu");
    assert.equal(fields.phone, "5555555555");
    assert.equal(fields.address, "plano street usa");
    assert.equal(fields.service, "AC repair");
  });

  test("labeled booking fields remain authoritative", () => {
    const fields = recoverPublicBookingFieldsFromTurns([
      {
        role: "user",
        content:
          "Name: Jane Doe\nPhone: 214-555-0101\nAddress: 1500 Main St\nService: AC repair",
      },
      {
        role: "assistant",
        content: "What name should I use for the appointment?",
      },
      { role: "user", content: "Different Name" },
    ]);

    assert.equal(fields.fullName, "Jane Doe");
    assert.equal(fields.phone, "214-555-0101");
    assert.equal(fields.address, "1500 Main St");
    assert.equal(fields.service, "AC repair");
  });

  test("recovers required template intake answers without reusing unrelated turns", () => {
    const intakeFields = [
      { id: "address", label: "Service address", required: true },
      { id: "issue_type", label: "What's happening?", required: true },
      { id: "urgency", label: "How urgent is this?", required: true },
    ];
    const fields = recoverPublicBookingFieldsFromTurns([
      { role: "user", content: "Issue: AC not cooling" },
      { role: "assistant", content: buildPublicBookingFieldQuestion(intakeFields[0]!) },
      { role: "user", content: "123 Main St, Dallas, TX" },
      { role: "assistant", content: buildPublicBookingFieldQuestion(intakeFields[2]!) },
      { role: "user", content: "This week" },
    ], intakeFields);

    assert.equal(getRecoveredBookingFieldValue(fields, "address"), "123 Main St, Dallas, TX");
    assert.equal(getRecoveredBookingFieldValue(fields, "issue_type"), "AC not cooling");
    assert.equal(getRecoveredBookingFieldValue(fields, "urgency"), "This week");
    assert.deepEqual(missingPublicBookingFields(fields, intakeFields), [
      "name",
      "phone or email",
    ]);
  });

    test("recovers a natural issue answer from the assistant intake question", () => {
      const intakeFields = [
        { id: "issue_type", label: "What's happening?", required: true },
      ];

      const fields = recoverPublicBookingFieldsFromTurns([
        {
          role: "assistant",
          content: buildPublicBookingFieldQuestion(intakeFields[0]!),
        },
        {
          role: "user",
          content: "AC not cooling",
        },
      ], intakeFields);

      assert.equal(fields.intakeResponses?.issue_type, "AC not cooling");
      assert.equal(
        getRecoveredBookingFieldValue(fields, "issue_type"),
        "AC not cooling",
      );
      assert.deepEqual(
        missingPublicBookingFields(fields, intakeFields),
        ["name", "phone or email"],
      );
    });

  test("reports only genuinely missing public booking fields", () => {
    const intakeFields = [
      { id: "phone", label: "Best phone number", required: true },
      { id: "address", label: "Service address", required: true },
      { id: "issue_type", label: "What's happening?", required: true },
      { id: "urgency", label: "How urgent is this?", required: true },
    ];
    assert.deepEqual(
      missingPublicBookingFields(
        {
          fullName: "Rutu Test",
          phone: "+12145550198",
          address: "123 Main St, Dallas, TX",
          issue: "AC not cooling",
          intakeResponses: { urgency: "This week" },
        },
        intakeFields,
      ),
      [],
    );
  });

  test("builds the normal confirmation-stage tool input with the exact ISO", () => {
    const input = buildPublicBookingToolInput(slots[0]!, {
      fullName: "QA Loop Final",
      phone: "214-555-0101",
      email: "qa@example.com",
      address: "1500 Main St",
      issue: "AC not cooling",
      service: "AC repair",
    }, "default");
    assert.equal(input.slotIso, "2026-08-26T16:00:00.000Z");
    assert.equal(input.confirmed, false);
    assert.equal(input.bookingSlug, "default");
    assert.equal(input.intakeResponses.service, "AC repair");
  });

  test("builds the public confirmation from the matched label, never the ISO", () => {
    const text = buildPublicSlotConfirmationReadBack(
      "QA Readback Final",
      slots[1]!,
      "AC repair",
    );
    assert.equal(
      text,
      "Just to confirm: AC repair for QA Readback Final on Wednesday, August 26 at 12:00 PM CDT. Is that correct?",
    );
    assert.doesNotMatch(text, /2026-08-26T17:00:00\.000Z/);
  });
});
