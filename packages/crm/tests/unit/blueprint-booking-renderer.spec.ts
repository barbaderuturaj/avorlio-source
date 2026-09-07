import { test } from "node:test";
import assert from "node:assert/strict";

import { renderCalcomMonthV1 } from "@/lib/blueprint/renderers/calcom-month-v1";
import { pickTemplate } from "@/lib/blueprint/templates";

// ─── Smoke / determinism / theme integration ──────────────────────────

test("renderCalcomMonthV1 ? embeds safe confirmation headline and avoids unsupported delivery promises", () => {
  const blueprint = pickTemplate("hvac");
  const out = renderCalcomMonthV1(blueprint);

  assert.ok(
    out.html.includes("Your appointment request was received"),
    "confirmation headline"
  );
  assert.ok(
    out.html.includes("Thanks - we received your appointment request."),
    "safe confirmation message present"
  );
  assert.ok(
    !out.html.includes("We&#39;ll send a confirmation"),
    "unsupported email delivery promise removed"
  );
  assert.ok(
    !out.html.includes("call about an hour before"),
    "unsupported callback timing promise removed"
  );
});

// ─── Booking-data island for the client JS ────────────────────────────

test("renderCalcomMonthV1 — emits booking-data <script type=application/json> island", () => {
  const out = renderCalcomMonthV1(pickTemplate("hvac"));
  assert.ok(
    out.html.includes(`id="sf-booking-data"`),
    "data island has expected id"
  );
  assert.ok(
    out.html.includes(`type="application/json"`),
    "data island uses application/json type"
  );
});

test("renderCalcomMonthV1 — booking-data island contains availability + duration", () => {
  const blueprint = pickTemplate("hvac");
  const out = renderCalcomMonthV1(blueprint);
  // Pull out the JSON island and parse it.
  const m = out.html.match(/id="sf-booking-data">([^<]+)<\/script>/);
  assert.ok(m, "data island present in HTML");
  const data = JSON.parse(m![1]);
  assert.equal(data.eventType.durationMinutes, blueprint.booking.eventType.durationMinutes);
  assert.deepEqual(data.availability.weekly, blueprint.booking.availability.weekly);
  assert.equal(data.workspaceName, blueprint.workspace.name);
});

test("renderCalcomMonthV1 — escapes </script> in JSON island data (defense in depth)", () => {
  const blueprint = pickTemplate("hvac");
  // Plant a payload that would otherwise close the script tag.
  blueprint.workspace.name = `</script><img src=x onerror=alert(1)>`;
  const out = renderCalcomMonthV1(blueprint);
  // The </script> inside the JSON island must be escaped so the browser
  // doesn't treat it as a tag close. Also no raw script-close in the body.
  const islandStart = out.html.indexOf(`id="sf-booking-data"`);
  const islandEnd = out.html.indexOf(`</script>`, islandStart);
  const island = out.html.slice(islandStart, islandEnd);
  assert.ok(!island.includes("</script"), "json island must not contain raw </script");
  assert.ok(!out.html.includes("<img src=x"), "raw img tag must not appear");
});

// ─── Calendar/scheduler shell ─────────────────────────────────────────

test("renderCalcomMonthV1 — emits calendar shell with empty days grid (JS fills it)", () => {
  const out = renderCalcomMonthV1(pickTemplate("hvac"));
  assert.ok(out.html.includes(`id="sf-cal-days"`), "days grid has id");
  assert.ok(out.html.includes(`id="sf-cal-month"`), "month label has id");
  assert.ok(/<div[^>]+id="sf-cal-days"[^>]+role="grid"[^>]*><\/div>/.test(out.html),
    "days grid is empty server-side (client JS populates)");
});

test("renderCalcomMonthV1 — emits all four scheduler panels (calendar/slots/form/confirmation)", () => {
  const out = renderCalcomMonthV1(pickTemplate("hvac"));
  assert.ok(out.html.includes(`data-panel="calendar"`));
  assert.ok(out.html.includes(`data-panel="slots"`));
  assert.ok(out.html.includes(`data-panel="form"`));
  assert.ok(out.html.includes(`data-panel="confirmation"`));
});

test("renderCalcomMonthV1 — non-default panels are hidden initially", () => {
  const out = renderCalcomMonthV1(pickTemplate("hvac"));
  assert.ok(/data-panel="slots"[^>]+hidden/.test(out.html), "slots hidden");
  assert.ok(/data-panel="form"[^>]+hidden/.test(out.html), "form hidden");
  assert.ok(/data-panel="confirmation"[^>]+hidden/.test(out.html), "confirmation hidden");
});

// ─── Timezone selector ────────────────────────────────────────────────

test("renderCalcomMonthV1 — emits a timezone selector in event details", () => {
  const out = renderCalcomMonthV1(pickTemplate("hvac"));
  assert.ok(out.html.includes(`id="sf-tz-select"`), "timezone select element");
  assert.ok(out.html.includes(`Timezone`), "timezone label visible");
});

// ─── Footer parity with landing ───────────────────────────────────────

test("renderCalcomMonthV1 — footer Powered-by SeldonFrame is present (parity with landing)", () => {
  const out = renderCalcomMonthV1(pickTemplate("hvac"));
  assert.ok(out.html.includes("Powered by"));
  assert.ok(out.html.includes("seldonframe.com"));
});
