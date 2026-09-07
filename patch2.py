from pathlib import Path

p = Path(r"packages/crm/src/lib/integrations/calendar-push.ts")
s = p.read_text(encoding="utf-8")

marker = '''/** Default booking loader: pulls just the fields needed for the event'''

helper = r'''function extractFreeWindows(res: any): CalendarFreeWindow[] {
  const calendars = res?.data?.calendars;

  if (calendars && typeof calendars === "object") {
    const out: CalendarFreeWindow[] = [];

    for (const calendar of Object.values(calendars)) {
      const free = (calendar as any)?.free;
      if (!Array.isArray(free)) continue;

      for (const window of free) {
        const start = (window as any)?.start;
        const end = (window as any)?.end;

        if (typeof start === "string" && typeof end === "string") {
          out.push({ start, end });
        }
      }
    }

    if (out.length > 0) return out;
  }

  const candidates: unknown[] = [
    res?.data?.free_slots,
    res?.data?.freeSlots,
    res?.data?.free,
    res?.data?.slots,
    res?.data?.windows,
  ];

  const raw = candidates.find(Array.isArray) as unknown[] | undefined;
  if (!raw) return [];

  const out: CalendarFreeWindow[] = [];

  for (const window of raw) {
    if (!window || typeof window !== "object") continue;

    const start =
      (window as any).start ??
      (window as any).start_time ??
      (window as any).startTime;

    const end =
      (window as any).end ??
      (window as any).end_time ??
      (window as any).endTime;

    if (typeof start === "string" && typeof end === "string") {
      out.push({ start, end });
    }
  }

  return out;
}

export async function getConnectedCalendarFreeWindows(input: {
  orgId: string;
  date: string;
  timezone: string;
}): Promise<{
  connected: boolean;
  windows: CalendarFreeWindow[];
}> {
  try {
    const connection = await defaultDeps.getConnection(input.orgId);

    if (!connection) {
      return { connected: false, windows: [] };
    }

    const composio = await composioForOrg(input.orgId);

    if (!composio) {
      return { connected: false, windows: [] };
    }

    const slug = FIND_FREE_SLOTS_SLUG[connection.provider];

    const res = await composio.tools.execute(slug, {
      userId: input.orgId,
      connectedAccountId: connection.connectedAccountId,
      dangerouslySkipVersionCheck: true,
      arguments: {
        calendar_id: "primary",
        time_min: `${input.date}T00:00:00`,
        time_max: `${input.date}T23:59:59`,
        timezone: input.timezone,
      },
    });

    return {
      connected: true,
      windows: extractFreeWindows(res),
    };
  } catch (err) {
    logEvent("calendar_freebusy_lookup_failed", {
      orgId: input.orgId,
      date: input.date,
      error: err instanceof Error ? err.message.slice(0, 200) : "unknown_error",
    });

    return { connected: false, windows: [] };
  }
}

'''

if marker not in s:
    raise SystemExit("MARKER_NOT_FOUND")

p.write_text(s.replace(marker, helper + marker, 1), encoding="utf-8")
print("PATCH_2_OK")
