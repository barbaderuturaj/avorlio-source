import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { join } from "node:path";

import {
  PUBLIC_BOOKING_BLOCKING_STATUSES,
  isPublicBookingBlockingStatus,
} from "../../../src/lib/bookings/conflict-policy";

describe("public booking conflict policy", () => {
  test("slot listing and writes share every time-reserving status", () => {
    assert.deepEqual([...PUBLIC_BOOKING_BLOCKING_STATUSES], [
      "scheduled",
      "completed",
      "pending_payment",
      "blocked",
    ]);
  });

  test("cancelled, template, and no-show rows do not reserve a future slot", () => {
    for (const status of ["cancelled", "template", "no_show", null]) {
      assert.equal(isPublicBookingBlockingStatus(status), false);
    }
    assert.equal(isPublicBookingBlockingStatus("pending_payment"), true);
  });

  test("public slot listing applies the shared policy across the whole workspace", () => {
    const actionsPath = [
      join(process.cwd(), "src/lib/bookings/actions.ts"),
      join(process.cwd(), "packages/crm/src/lib/bookings/actions.ts"),
    ].find(existsSync);
    assert.ok(actionsPath);
    const source = readFileSync(actionsPath, "utf8");
    const start = source.indexOf("export async function listPublicBookingSlotsAction");
    const end = source.indexOf("export async function updateWorkspaceBookingRulesAction", start);
    const listing = source.slice(start, end);

    assert.match(listing, /PUBLIC_BOOKING_BLOCKING_STATUSES/);
    assert.doesNotMatch(listing, /eq\(bookings\.bookingSlug, context\.bookingSlug\)/);
  });
});
