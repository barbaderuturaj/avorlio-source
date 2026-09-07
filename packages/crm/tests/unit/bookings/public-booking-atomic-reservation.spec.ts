import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";

function readActionsSource() {
  const actionsPath = [
    join(process.cwd(), "src/lib/bookings/actions.ts"),
    join(process.cwd(), "packages/crm/src/lib/bookings/actions.ts"),
  ].find(existsSync);
  assert.ok(actionsPath);
  return readFileSync(actionsPath, "utf8");
}

describe("public booking atomic reservation", () => {
  test("final reservation uses a real Postgres transaction-scoped advisory lock", () => {
    const source = readActionsSource();
    const helperStart = source.indexOf("async function reservePublicBookingSlotAtomically");
    const helperEnd = source.indexOf("function toBookingSlug", helperStart);
    assert.ok(helperStart > 0);
    const helper = source.slice(helperStart, helperEnd);

    assert.match(helper, /rawSql\.transaction\(\[lockQuery,\s*insertQuery\]\)/);
    assert.match(helper, /pg_advisory_xact_lock/);
    assert.match(helper, /hashtextextended/);
    assert.match(helper, /WITH conflicts AS MATERIALIZED/);
    assert.match(helper, /INSERT INTO bookings/);
  });

  test("lock granularity is workspace local date, not exact start timestamp", () => {
    const source = readActionsSource();
    const helperStart = source.indexOf("async function reservePublicBookingSlotAtomically");
    const helperEnd = source.indexOf("function toBookingSlug", helperStart);
    const helper = source.slice(helperStart, helperEnd);
    const lockLine = helper
      .split(/\r?\n/)
      .find((line) => line.includes("const lockResource"));

    assert.ok(lockLine);
    assert.match(lockLine, /input\.orgId/);
    assert.match(lockLine, /input\.localBookingDate/);
    assert.doesNotMatch(lockLine, /input\.startsAt/);
  });

  test("final conflict check rejects overlapping starts, not only identical starts", () => {
    const source = readActionsSource();
    const helperStart = source.indexOf("async function reservePublicBookingSlotAtomically");
    const helperEnd = source.indexOf("function toBookingSlug", helperStart);
    const helper = source.slice(helperStart, helperEnd);

    assert.match(helper, /starts_at < \$\{input\.endsAt\}::timestamptz/);
    assert.match(helper, /ends_at > \$\{input\.startsAt\}::timestamptz/);
    assert.doesNotMatch(helper, /starts_at = \$\{input\.startsAt\}/);
  });

  test("losing concurrent reservation returns the friendly slot conflict path", () => {
    const source = readActionsSource();
    const submitStart = source.indexOf("export async function submitPublicBookingAction");
    const submitEnd = source.indexOf("export async function rescheduleBookingAction", submitStart);
    assert.ok(submitStart > 0);
    const submit = source.slice(submitStart, submitEnd);

    assert.match(submit, /const reservation = await reservePublicBookingSlotAtomically/);
    assert.match(submit, /if \(!reservation\)/);
    assert.match(submit, /rejectAndThrow\("slot_already_booked"/);
  });
});
