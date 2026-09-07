from pathlib import Path

p = Path(r"packages/crm/src/lib/agents/tools.ts")
s = p.read_text(encoding="utf-8")

old = '''          let dayFits = dayCandidates.filter((iso) =>
            slotFitsFreeWindows(iso, policy.durationMinutes, windows),
          );
          // Cap per day at policy.maxPerDay (when a policy is set + a cap exists).
          if (hasPolicy && typeof policy.maxPerDay === "number") {
            dayFits = dayFits.slice(0, policy.maxPerDay);
          }'''

new = '''          let dayFits = dayCandidates.filter((iso) =>
            slotFitsFreeWindows(iso, policy.durationMinutes, windows),
          );

          // A connected external calendar is only ONE source of availability
          // truth. SeldonFrame may already contain a scheduled/blocked booking
          // for a time that Google/Outlook still reports as free.
          //
          // listPublicBookingSlotsAction already removes those internal
          // conflicts. When it resolves a real native booking context it also
          // returns workspaceTimezone, which lets us distinguish that case from
          // an external-only deployment with no native booking configuration.
          //
          // Therefore the externally-free candidates must also be present in
          // native/public availability before we offer them.
          const nativeDay = await listSlots({
            orgSlug: ctx.orgSlug,
            bookingSlug,
            date: dayISO,
          });
          const nativeTimezone = (
            nativeDay as { workspaceTimezone?: string }
          ).workspaceTimezone;

          if (
            typeof nativeTimezone === "string" &&
            nativeTimezone.trim().length > 0
          ) {
            const nativeFree = new Set(nativeDay.slots);
            dayFits = dayFits.filter((iso) => nativeFree.has(iso));
          }

          // Cap per day at policy.maxPerDay (when a policy is set + a cap exists).
          if (hasPolicy && typeof policy.maxPerDay === "number") {
            dayFits = dayFits.slice(0, policy.maxPerDay);
          }'''

if old not in s:
    raise SystemExit("book_external intersection anchor not found")

s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")

print("PASS: book_external now intersects internal + external availability")
