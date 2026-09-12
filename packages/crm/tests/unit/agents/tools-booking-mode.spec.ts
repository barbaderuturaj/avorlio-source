// Deployed-agent booking-mode branch tests (TDD, ICP-3).
//
// look_up_availability + book_appointment gain an early, ctx.booking-guarded
// branch at the TOP of execute:
//   - mode 'native' / ctx.booking absent → the EXISTING native chain, unchanged
//     (workspace/operator agents never set ctx.booking, so they hit it).
//   - 'external_link' → hand off the client's booking URL; NO availability
//     lookup, NO booking write.
//   - 'api_mcp' / 'cal_com' (coming soon) → capture-the-lead handoff promising
//     follow-up; NO write.
//
// PATTERN: this repo prefers DI over module mocking (see voice-r1-tools.spec.ts).
// book_appointment exposes a `submitBooking` deps seam — we pass a
// `shouldNotBeCalled` stub to PROVE the native write never fires for a non-native
// mode (it throws if invoked). look_up_availability has no deps seam; its native
// path calls listPublicBookingSlotsAction (→ Neon), so for the non-native modes
// we assert the handoff result comes back WITHOUT any DB access — the branch must
// short-circuit before the native availability call (a DB hit would throw here).

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  lookUpAvailability,
  bookAppointment,
  type ToolExecuteContext,
  type BookAppointmentDeps,
} from "../../../src/lib/agents/tools";

/** A ctx WITHOUT booking → workspace/operator agent → native path. */
const NATIVE_CTX: ToolExecuteContext = {
  orgId: "org-1",
  orgSlug: "acme",
  agentId: "agt-1",
  conversationId: "conv-1",
  testMode: false,
  timezone: "America/Chicago",
};

function makeCtx(
  booking: NonNullable<ToolExecuteContext["booking"]>,
): ToolExecuteContext {
  return { ...NATIVE_CTX, booking };
}

/** A submitBooking stub that fails loudly if the native write is reached. */
const shouldNotSubmit: BookAppointmentDeps = {
  submitBooking: async () => {
    throw new Error("native booking write must NOT run for a non-native mode");
  },
};

// ─── look_up_availability ──────────────────────────────────────────────────

describe("look_up_availability honors booking mode", () => {
  test("returns the canonical ISO value unchanged alongside its local label", async () => {
    const slotIso = "2026-08-25T13:00:00.000Z";
    const result = await lookUpAvailability.execute(
      { date: "2026-08-25" },
      NATIVE_CTX,
      {
        listSlots: async () => ({
          slots: [slotIso],
          durationMinutes: 60,
          workspaceTimezone: "America/Chicago",
        }),
        now: () => new Date("2026-08-25T00:00:00.000Z"),
      },
    );

    assert.equal("slots" in result, true);
    if ("slots" in result) {
      assert.equal(result.slots[0]?.iso, slotIso);
    }
  });

  test("external_link → returns the link as a handoff, no availability lookup", async () => {
    const ctx = makeCtx({
      mode: "external_link",
      externalUrl: "https://book.acme.test/x",
    });
    // No DB / DI is wired; reaching the native listPublicBookingSlotsAction would
    // throw (no Neon). A clean handoff result proves the branch short-circuited.
    const res = (await lookUpAvailability.execute(
      { date: "2026-07-01" },
      ctx,
    )) as Record<string, unknown>;
    assert.match(JSON.stringify(res), /book\.acme\.test\/x/);
    assert.equal((res as { bookingHandoff?: string }).bookingHandoff, "external_link");
  });

  test("external_link with NO url → still a handoff (offer to send the link)", async () => {
    const ctx = makeCtx({ mode: "external_link", externalUrl: null });
    const res = (await lookUpAvailability.execute(
      { date: "2026-07-01" },
      ctx,
    )) as { bookingHandoff?: string; url?: string | null };
    assert.equal(res.bookingHandoff, "external_link");
    assert.equal(res.url ?? null, null);
  });

  test("cal_com (coming soon) → followup handoff, no availability lookup", async () => {
    const ctx = makeCtx({ mode: "cal_com" });
    const res = (await lookUpAvailability.execute(
      { date: "2026-07-01" },
      ctx,
    )) as { bookingHandoff?: string };
    assert.equal(res.bookingHandoff, "followup");
  });

  test("api_mcp (coming soon) → followup handoff, no availability lookup", async () => {
    const ctx = makeCtx({ mode: "api_mcp" });
    const res = (await lookUpAvailability.execute(
      { date: "2026-07-01" },
      ctx,
    )) as { bookingHandoff?: string };
    assert.equal(res.bookingHandoff, "followup");
  });
});

// ─── book_appointment ──────────────────────────────────────────────────────

describe("book_appointment honors booking mode", () => {
  test("external_link → no booking write, returns handoff + the link", async () => {
    const ctx = makeCtx({
      mode: "external_link",
      externalUrl: "https://book.acme.test/x",
    });
    const res = (await bookAppointment.execute(
      { fullName: "Pat Lee", slotIso: "2026-07-01T15:00:00Z", confirmed: true },
      ctx,
      shouldNotSubmit,
    )) as Record<string, unknown>;
    // shouldNotSubmit throws if the native write runs → reaching here proves it didn't.
    assert.match(JSON.stringify(res), /book\.acme\.test\/x/);
    assert.equal((res as { bookingHandoff?: string }).bookingHandoff, "external_link");
  });

  test("cal_com (coming soon) → captures intent, no write, promises follow-up", async () => {
    const ctx = makeCtx({ mode: "cal_com" });
    const res = (await bookAppointment.execute(
      { fullName: "Pat Lee", slotIso: "2026-07-01T15:00:00Z", confirmed: true },
      ctx,
      shouldNotSubmit,
    )) as Record<string, unknown>;
    assert.match(JSON.stringify(res).toLowerCase(), /follow|reach|schedul/);
    assert.equal((res as { bookingHandoff?: string }).bookingHandoff, "followup");
  });

  test("api_mcp (coming soon) → captures intent, no write, promises follow-up", async () => {
    const ctx = makeCtx({ mode: "api_mcp" });
    const res = (await bookAppointment.execute(
      { fullName: "Pat Lee", slotIso: "2026-07-01T15:00:00Z", confirmed: true },
      ctx,
      shouldNotSubmit,
    )) as { bookingHandoff?: string };
    assert.equal(res.bookingHandoff, "followup");
  });

  test("native ctx.booking → existing path: confirmed booking calls submitBooking", async () => {
    // Proves the native path is UNCHANGED when mode is explicitly native — the
    // submit DI is reached exactly as before (one call).
    const calls: unknown[] = [];
    const deps: BookAppointmentDeps = {
      submitBooking: async (args) => {
        calls.push(args);
        return { success: true, bookingId: "booking-native-1" };
      },
    };
    const ctx = { ...makeCtx({ mode: "native", externalUrl: null }), timezone: "America/Chicago" };
    const res = (await bookAppointment.execute(
      { fullName: "Pat Lee", phone: "+15551234567", slotIso: "2026-07-01T15:00:00Z", confirmed: true },
      ctx,
      deps,
    )) as { ok: boolean; bookingId?: string; displayTime?: string };
    assert.equal(res.ok, true);
    assert.equal(res.bookingId, "booking-native-1");
    assert.match(res.displayTime ?? "", /Wednesday, July 1 at 10:00 AM CDT/);
    assert.equal(calls.length, 1, "native mode still books");
  });

    test("paid native booking preserves the checkout handoff", async () => {
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

  test("preserves the exact ISO returned by availability through the booking write", async () => {
    const slotIso = "2026-08-25T13:00:00.000Z";
    const calls: Array<{ startsAt: string }> = [];
    const deps: BookAppointmentDeps = {
      submitBooking: async (args) => {
        calls.push(args);
        return { success: true, bookingId: "booking-native-1" };
      },
    };

    const result = await bookAppointment.execute(
      { fullName: "Pat Lee", phone: "+15551234567", slotIso, confirmed: true },
      NATIVE_CTX,
      deps,
    );

    assert.equal(result.ok, true);
    assert.equal(calls[0]?.startsAt, slotIso);
  });

  test("rejects malformed reconstructed ISO before a booking write", () => {
    const parsed = bookAppointment.inputSchema.safeParse({
      fullName: "Pat Lee",
      phone: "+15551234567",
      slotIso: "2026-08-25T13:00:000Z",
      confirmed: true,
    });

    assert.equal(parsed.success, false);
  });

  test("ctx.booking ABSENT (workspace agent) → native path: submitBooking called", async () => {
    const calls: unknown[] = [];
    const deps: BookAppointmentDeps = {
      submitBooking: async (args) => {
        calls.push(args);
        return { success: true, bookingId: "booking-native-2" };
      },
    };
    const res = (await bookAppointment.execute(
      { fullName: "Pat Lee", phone: "+15551234567", slotIso: "2026-07-01T15:00:00Z", confirmed: true },
      NATIVE_CTX,
      deps,
    )) as { ok: boolean; bookingId?: string; displayTime?: string };
    assert.equal(res.ok, true);
    assert.equal(res.bookingId, "booking-native-2");
    assert.match(res.displayTime ?? "", /Wednesday, July 1 at 10:00 AM CDT/);
    assert.equal(calls.length, 1, "absent booking ctx behaves exactly like native");
  });

  test("native UNCONFIRMED still hits the read-back gate (mode branch did not swallow it)", async () => {
    const res = (await bookAppointment.execute(
      { fullName: "Pat Lee", phone: "+15551234567", slotIso: "2026-07-01T15:00:00Z" },
      NATIVE_CTX,
      shouldNotSubmit,
    )) as { ok: boolean; needsConfirmation?: boolean };
    assert.equal(res.ok, false);
    assert.equal(res.needsConfirmation, true);
  });

  test("public template required fields are enforced before confirmation or write", async () => {
    const ctx: ToolExecuteContext = {
      ...NATIVE_CTX,
      bookingTemplateSlugs: ["default"],
      bookingIntakeFields: [
        { id: "address", label: "Service address", required: true },
        { id: "issue_type", label: "What's happening?", required: true },
      ],
    };
    const calls: unknown[] = [];
    const result = await bookAppointment.execute(
      {
        fullName: "Pat Lee",
        phone: "+15551234567",
        slotIso: "2026-07-01T15:00:00Z",
        confirmed: true,
      },
      ctx,
      { submitBooking: async (args) => { calls.push(args); return { success: true }; } },
    );

    assert.deepEqual("needs" in result ? result.needs : null, ["address", "issue_type"]);
    assert.equal(calls.length, 0);
  });

  test("complete public template intake reaches the normal unconfirmed safety gate", async () => {
    const result = await bookAppointment.execute(
      {
        fullName: "Pat Lee",
        phone: "+15551234567",
        slotIso: "2026-07-01T15:00:00Z",
        intakeResponses: {
          phone: "+15551234567",
          address: "123 Main St",
          issue_type: "AC not cooling",
        },
      },
      {
        ...NATIVE_CTX,
        bookingTemplateSlugs: ["default"],
        bookingIntakeFields: [
          { id: "address", label: "Service address", required: true },
          { id: "issue_type", label: "What's happening?", required: true },
        ],
      },
      shouldNotSubmit,
    );

    assert.equal("needsConfirmation" in result ? result.needsConfirmation : false, true);
  });

  test("unconfirmed booking read-back uses the business timezone, never raw ISO", async () => {
    const slotIso = "2026-08-26T13:00:00.000Z";
    const result = (await bookAppointment.execute(
      {
        fullName: "QA Final Booking",
        phone: "+12145550199",
        slotIso,
      },
      { ...NATIVE_CTX, timezone: "America/Chicago" },
    )) as { readBack?: string; needsConfirmation?: boolean };

    assert.equal(result.needsConfirmation, true);
    assert.match(result.readBack ?? "", /Wednesday, August 26 at 8:00 AM CDT/);
    assert.doesNotMatch(result.readBack ?? "", /2026-08-26T13:00:00\.000Z/);
  });

  test("deterministic public slot selection uses its trusted offered label", async () => {
    const slotIso = "2026-08-26T16:00:00.000Z";
    const result = (await bookAppointment.execute(
      {
        fullName: "QA Slot Final",
        phone: "+12145550101",
        slotIso,
      },
      {
        ...NATIVE_CTX,
        timezone: "America/Chicago",
        selectedSlotLabel: "Wednesday, August 26 at 11:00 AM CDT",
      },
    )) as { readBack?: string; needsConfirmation?: boolean };

    assert.equal(result.needsConfirmation, true);
    assert.equal(
      result.readBack,
      "So that's QA Slot Final, Wednesday, August 26 at 11:00 AM CDT — is that correct?",
    );
    assert.doesNotMatch(result.readBack ?? "", /2026-08-26T16:00:00\.000Z/);
  });
});
