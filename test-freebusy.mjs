import { getConnectedCalendarFreeWindows } from "./packages/crm/src/lib/integrations/calendar-push.ts";

const r = await getConnectedCalendarFreeWindows({
  orgId: "e50aee42-f3e5-41c7-99fa-5e7db508651d",
  date: "2026-08-31",
  timezone: "America/Chicago",
});

console.log(JSON.stringify(r, null, 2));
