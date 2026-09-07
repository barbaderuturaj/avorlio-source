from pathlib import Path

p = Path(r"packages/crm/src/lib/bookings/actions.ts")
s = p.read_text(encoding="utf-8")

# ------------------------------------------------------------
# 1. Add shared external-calendar imports
# ------------------------------------------------------------

import_marker = '''import { createBookingCheckoutSession } from "@/lib/payments/actions";'''

import_replacement = '''import { createBookingCheckoutSession } from "@/lib/payments/actions";
import { slotFitsFreeWindows } from "@/lib/agents/booking/booking-policy";
import { getConnectedCalendarFreeWindows } from "@/lib/integrations/calendar-push";'''

if import_marker not in s:
    raise SystemExit("IMPORT_MARKER_NOT_FOUND")

s = s.replace(import_marker, import_replacement, 1)

# ------------------------------------------------------------
# 2. Filter PUBLIC BOOKING PAGE slots through Google/Outlook
# ------------------------------------------------------------

list_old = '''  return {
    slots,
    durationMinutes: context.durationMinutes,
    // v1.40.2 — surface workspace TZ so the form can format slots
    // and label the time zone clearly.
    workspaceTimezone: tz,
  };
}'''

list_new = '''  // If the workspace has an org-level Google/Outlook calendar connected,
  // public availability must also respect that calendar's real free/busy.
  // No external connection => preserve native SeldonFrame availability.
  // Connected calendar + no free windows => fail closed and offer no slots.
  const externalAvailability = await getConnectedCalendarFreeWindows({
    orgId: context.orgId,
    date,
    timezone: tz,
  });

  const publicSlots = externalAvailability.connected
    ? slots.filter((iso) =>
        slotFitsFreeWindows(
          iso,
          context.durationMinutes,
          externalAvailability.windows,
        ),
      )
    : slots;

  return {
    slots: publicSlots,
    durationMinutes: context.durationMinutes,
    // v1.40.2 — surface workspace TZ so the form can format slots
    // and label the time zone clearly.
    workspaceTimezone: tz,
  };
}'''

if list_old not in s:
    raise SystemExit("LIST_RETURN_MARKER_NOT_FOUND")

s = s.replace(list_old, list_new, 1)

# ------------------------------------------------------------
# 3. Re-check external calendar immediately before booking insert
# ------------------------------------------------------------

submit_marker = '''  const provider = await resolveBookingProvider(null);'''

submit_insert = '''  // External-calendar race-condition guard.
  //
  // The public slot picker already filters against Google/Outlook, but the
  // calendar can change between page load and submit. Re-check the exact
  // requested interval immediately before creating the booking so a stale
  // browser or crafted request cannot double-book an externally busy time.
  const externalDate = [
    String(localParts.year).padStart(4, "0"),
    String(localParts.month).padStart(2, "0"),
    String(localParts.day).padStart(2, "0"),
  ].join("-");

  const externalAvailability = await getConnectedCalendarFreeWindows({
    orgId: bookingContext.orgId,
    date: externalDate,
    timezone: workspaceTz,
  });

  if (
    externalAvailability.connected &&
    !slotFitsFreeWindows(
      bookingStart.toISOString(),
      bookingContext.durationMinutes,
      externalAvailability.windows,
    )
  ) {
    return rejectAndThrow("external_calendar_conflict", {
      requested_start: bookingStart.toISOString(),
      requested_end: slotEnd.toISOString(),
      workspace_timezone: workspaceTz,
    });
  }

  const provider = await resolveBookingProvider(null);'''

if submit_marker not in s:
    raise SystemExit("SUBMIT_MARKER_NOT_FOUND")

s = s.replace(submit_marker, submit_insert, 1)

p.write_text(s, encoding="utf-8")

print("PUBLIC_FREEBUSY_PATCH_OK")
