from pathlib import Path

p = Path(r"packages/crm/tests/unit/agents/public-output.spec.ts")
s = p.read_text(encoding="utf-8")

needle = 'test("constructs the authoritative success response without another model completion"'
pos = s.find(needle)

if pos == -1:
    raise SystemExit("public-output insertion point not found")

line_start = s.rfind("\n", 0, pos) + 1

test = '''  test("does not claim a pending-payment booking is fully booked", () => {
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
    assert.match(output, /checkout\\.stripe\\.com/);
    assert.doesNotMatch(output, /you're booked/i);
  });

'''

s = s[:line_start] + test + s[line_start:]
p.write_text(s, encoding="utf-8")

print("PASS: pending-payment public-output regression added")
