import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { resolveBookingTemplateSlug } from "@/lib/agents/booking/template-resolution";

describe("public booking template resolution", () => {
  test("maps a service-derived slug to the only configured template", () => {
    assert.deepEqual(
      resolveBookingTemplateSlug("ac-repair", ["default"]),
      { ok: true, bookingSlug: "default" },
    );
  });

  test("omitted slug resolves to the only configured template", () => {
    assert.deepEqual(
      resolveBookingTemplateSlug(undefined, ["default"]),
      { ok: true, bookingSlug: "default" },
    );
  });

  test("invalid slug is explicit when multiple templates exist", () => {
    assert.deepEqual(
      resolveBookingTemplateSlug("ac-repair", ["default", "maintenance"]),
      {
        ok: false,
        code: "invalid_booking_slug",
        validBookingSlugs: ["default", "maintenance"],
      },
    );
  });

  test("missing public template is explicit", () => {
    assert.deepEqual(resolveBookingTemplateSlug(undefined, []), {
      ok: false,
      code: "no_booking_template",
      validBookingSlugs: [],
    });
  });
});
