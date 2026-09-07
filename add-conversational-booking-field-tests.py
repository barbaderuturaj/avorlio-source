from pathlib import Path

p = Path(r"packages/crm/tests/unit/agents/public-slot-selection.spec.ts")
s = p.read_text(encoding="utf-8")

s = s.replace(
'''  recoverPublicBookingFields,
  resolvePublicSlotSelection,''',
'''  recoverPublicBookingFields,
  recoverPublicBookingFieldsFromTurns,
  resolvePublicSlotSelection,''',
1,
)

anchor = '''  test("recovers explicit customer fields from prior user turns", () => {
    const fields = recoverPublicBookingFields([
      "I want an AC repair appointment.\\nName: QA Loop Final\\nPhone: 214-555-0101\\nEmail: qa@example.com\\nAddress: 1500 Main St, Dallas, TX 75201\\nIssue: AC not cooling.",
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
  });'''

addition = anchor + '''

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
          "Name: Jane Doe\\nPhone: 214-555-0101\\nAddress: 1500 Main St\\nService: AC repair",
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
  });'''

if anchor not in s:
    raise SystemExit("field recovery test anchor not found")

s = s.replace(anchor, addition, 1)
p.write_text(s, encoding="utf-8")

print("PASS: conversational field-recovery regression tests added")
