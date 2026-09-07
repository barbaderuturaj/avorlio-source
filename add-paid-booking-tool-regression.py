from pathlib import Path

p = Path(r"packages/crm/tests/unit/agents/tools-booking-mode.spec.ts")
s = p.read_text(encoding="utf-8")

needle = 'test("preserves the exact ISO returned by availability through the booking write"'
pos = s.find(needle)
if pos == -1:
    raise SystemExit("tools test insertion point not found")

line_start = s.rfind("\n", 0, pos) + 1

test = '''    test("paid native booking preserves the checkout handoff", async () => {
      const checkoutUrl = "https://checkout.stripe.com/c/pay/qa-test";
      const deps: BookAppointmentDeps = {
        submitBooking: async () => ({
          success: true,
          bookingId: "booking-paid-1",
          checkoutUrl,
        }),
      };

      const result = (await bookAppointment.execute(
        {
          fullName: "Paid QA",
          phone: "+15551234567",
          slotIso: "2026-07-01T15:00:00Z",
          confirmed: true,
        },
        NATIVE_CTX,
        deps,
      )) as {
        ok: boolean;
        bookingId?: string;
        paymentRequired?: boolean;
        checkoutUrl?: string;
      };

      assert.equal(result.ok, true);
      assert.equal(result.bookingId, "booking-paid-1");
      assert.equal(result.paymentRequired, true);
      assert.equal(result.checkoutUrl, checkoutUrl);
    });

'''

s = s[:line_start] + test + s[line_start:]
p.write_text(s, encoding="utf-8")
print("PASS: paid booking tool regression added")
