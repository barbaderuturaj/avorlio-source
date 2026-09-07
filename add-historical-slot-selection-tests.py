from pathlib import Path

p = Path(r"packages/crm/tests/unit/agents/public-slot-selection.spec.ts")
s = p.read_text(encoding="utf-8")

s = s.replace(
'''  latestSuccessfulAvailabilitySlots,
  recoverPublicBookingFields,''',
'''  latestHistoricalPublicSlotSelection,
  latestSuccessfulAvailabilitySlots,
  recoverPublicBookingFields,''',
1,
)

anchor = '''  test("does not reuse older slots after a newer successful empty result", () => {
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
  });'''

addition = anchor + '''

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
  });'''

if anchor not in s:
    raise SystemExit("test insertion anchor not found")

s = s.replace(anchor, addition, 1)
p.write_text(s, encoding="utf-8")

print("PASS: historical slot-selection regression tests added")
