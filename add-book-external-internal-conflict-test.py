from pathlib import Path

p = Path(r"packages/crm/tests/unit/agents/booking/booking-policy-tools.spec.ts")
s = p.read_text(encoding="utf-8")

anchor = '''  test("maxPerDay caps a 2-candidate free day to 1", async () => {
    // Whole 09:00–11:00 window free → both 09:00 + 10:00 fit; maxPerDay:1 caps it.
    const deps: LookUpAvailabilityDeps = {
      resolveBackend: () =>
        backendWithWindows([{ start: `${TEST_DATE}T09:00:00.000Z`, end: `${TEST_DATE}T11:00:00.000Z` }]),
      listSlots: async () => ({ slots: [], durationMinutes: 60 }),
      now: FROZEN_NOW,
    };
    const res = (await lookUpAvailability.execute(
      { date: TEST_DATE },
      ctxWithPolicy({ maxPerDay: 1 }),
      deps,
    )) as { slots: { iso: string }[] };

    assert.equal(res.slots.length, 1, "maxPerDay:1 offers at most one slot");
    assert.deepEqual(
      res.slots.map((s) => s.iso),
      [`${TEST_DATE}T09:00:00.000Z`],
    );
  });'''

addition = anchor + '''

  test("book_external never offers a slot already occupied in SeldonFrame", async () => {
    // External calendar says the full 09:00-11:00 window is free.
    // Native/public availability says 09:00 is already occupied internally,
    // so only 10:00 is actually safe to offer.
    let listSlotsCalls = 0;

    const deps: LookUpAvailabilityDeps = {
      resolveBackend: () =>
        backendWithWindows([
          {
            start: `${TEST_DATE}T09:00:00.000Z`,
            end: `${TEST_DATE}T11:00:00.000Z`,
          },
        ]),
      listSlots: async () => {
        listSlotsCalls += 1;
        return {
          slots: [`${TEST_DATE}T10:00:00.000Z`],
          durationMinutes: 60,
          workspaceTimezone: "UTC",
        };
      },
      now: FROZEN_NOW,
    };

    const res = (await lookUpAvailability.execute(
      { date: TEST_DATE },
      ctxWithPolicy({}),
      deps,
    )) as { slots: { iso: string }[] };

    assert.ok(
      listSlotsCalls >= 1,
      "book_external must consult native/public availability for internal booking conflicts",
    );

    assert.deepEqual(
      res.slots.map((s) => s.iso),
      [`${TEST_DATE}T10:00:00.000Z`],
      "09:00 is externally free but internally occupied and must never be offered",
    );
  });'''

if anchor not in s:
    raise SystemExit("booking policy test anchor not found")

s = s.replace(anchor, addition, 1)
p.write_text(s, encoding="utf-8")

print("PASS: internal-conflict regression test added")
