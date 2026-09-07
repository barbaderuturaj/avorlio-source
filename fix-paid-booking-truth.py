from pathlib import Path

# ---------- tools.ts ----------
p = Path(r"packages/crm/src/lib/agents/tools.ts")
s = p.read_text(encoding="utf-8")

old_catch = '''          const [committed] = await db
            .select({ id: bookings.id })
            .from(bookings)
            .where(
              and(
                eq(bookings.orgId, ctx.orgId),
                eq(bookings.fullName, input.fullName),
                emailMatch,
                eq(bookings.startsAt, new Date(input.slotIso)),
              ),
            )
            .limit(1);
          if (!committed) throw err;
          result = { success: true, bookingId: committed.id };
'''

new_catch = '''          const [committed] = await db
            .select({ id: bookings.id, status: bookings.status })
            .from(bookings)
            .where(
              and(
                eq(bookings.orgId, ctx.orgId),
                eq(bookings.fullName, input.fullName),
                emailMatch,
                eq(bookings.startsAt, new Date(input.slotIso)),
              ),
            )
            .limit(1);
          if (!committed) throw err;
          result = {
            success: true,
            bookingId: committed.id,
            paymentRequired: committed.status === "pending_payment" ? true : undefined,
          };
'''

if old_catch not in s:
    raise SystemExit("tools.ts recovery block not found")

s = s.replace(old_catch, new_catch, 1)

old_return = '''        return {
          ok: true,
          bookingId: typeof bookingResult?.bookingId === "string" ? bookingResult.bookingId : undefined,
          startsAt: input.slotIso,
          displayTime: formatSlotLabel(input.slotIso, await resolveToolTimezone(ctx)),
        };
'''

new_return = '''        const checkoutUrl =
          typeof bookingResult?.checkoutUrl === "string" && bookingResult.checkoutUrl.trim()
            ? bookingResult.checkoutUrl.trim()
            : undefined;
        const paymentRequired =
          bookingResult?.paymentRequired === true || Boolean(checkoutUrl);

        return {
          ok: true,
          bookingId: typeof bookingResult?.bookingId === "string" ? bookingResult.bookingId : undefined,
          startsAt: input.slotIso,
          displayTime: formatSlotLabel(input.slotIso, await resolveToolTimezone(ctx)),
          paymentRequired: paymentRequired || undefined,
          checkoutUrl,
        };
'''

if old_return not in s:
    raise SystemExit("tools.ts success return block not found")

s = s.replace(old_return, new_return, 1)
p.write_text(s, encoding="utf-8")

# ---------- public-output.ts ----------
p = Path(r"packages/crm/src/lib/agents/public-output.ts")
s = p.read_text(encoding="utf-8")

old = '''    if (inputRecord.confirmed === true && outputRecord?.ok === true && (timezone || typeof outputRecord.displayTime === "string")) {
      const displayTime =
        typeof outputRecord.displayTime === "string" && outputRecord.displayTime.trim()
          ? outputRecord.displayTime
          : formatSlotLabel(slotIso, timezone ?? "UTC");
      return `Done \u2014 you're booked for ${displayTime}.`;
    }
'''

new = '''    if (inputRecord.confirmed === true && outputRecord?.ok === true && (timezone || typeof outputRecord.displayTime === "string")) {
      const displayTime =
        typeof outputRecord.displayTime === "string" && outputRecord.displayTime.trim()
          ? outputRecord.displayTime
          : formatSlotLabel(slotIso, timezone ?? "UTC");

      const checkoutUrl =
        typeof outputRecord.checkoutUrl === "string" && outputRecord.checkoutUrl.trim()
          ? outputRecord.checkoutUrl.trim()
          : "";
      const paymentRequired =
        outputRecord.paymentRequired === true || Boolean(checkoutUrl);

      if (paymentRequired) {
        if (checkoutUrl) {
          return `Your slot is reserved for ${displayTime}. Complete payment to finalize your appointment: ${checkoutUrl}`;
        }
        return `Your slot is reserved for ${displayTime}, but payment is still required to finalize the appointment. Please contact the business to complete payment.`;
      }

      return `Done \u2014 you're booked for ${displayTime}.`;
    }
'''

if old not in s:
    raise SystemExit("public-output.ts success block not found")

s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")

print("PASS: paid-booking truthfulness fix applied")
