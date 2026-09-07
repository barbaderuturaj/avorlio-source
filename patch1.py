from pathlib import Path

p = Path(r"packages/crm/src/lib/integrations/calendar-push.ts")
s = p.read_text(encoding="utf-8")

old = '''const CREATE_EVENT_SLUG: Record<CalendarProvider, string> = {
  googlecalendar: "GOOGLECALENDAR_CREATE_EVENT",
  outlook: "OUTLOOK_CALENDAR_CREATE_EVENT",
};'''

new = '''const CREATE_EVENT_SLUG: Record<CalendarProvider, string> = {
  googlecalendar: "GOOGLECALENDAR_CREATE_EVENT",
  outlook: "OUTLOOK_CALENDAR_CREATE_EVENT",
};

const FIND_FREE_SLOTS_SLUG: Record<CalendarProvider, string> = {
  googlecalendar: "GOOGLECALENDAR_FIND_FREE_SLOTS",
  outlook: "OUTLOOK_CALENDAR_GET_SCHEDULE",
};

export type CalendarFreeWindow = {
  start: string;
  end: string;
};'''

if old not in s:
    raise SystemExit("MARKER_NOT_FOUND")

p.write_text(s.replace(old, new, 1), encoding="utf-8")
print("PATCH_1_OK")
