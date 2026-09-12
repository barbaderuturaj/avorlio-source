import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import {
  addDaysToDateOnly,
  dateOnlyFromLocalDate,
  formatDateOnlyHeading,
  localDateFromDateOnly,
} from "@/lib/bookings/public-booking-date";

describe("public booking date-only helpers", () => {
  test("selecting 2026-08-25 stays 2026-08-25", () => {
    assert.equal(dateOnlyFromLocalDate(new Date(2026, 7, 25)), "2026-08-25");
    assert.equal(dateOnlyFromLocalDate(localDateFromDateOnly("2026-08-25")), "2026-08-25");
  });

  test("selecting 2026-08-26 stays 2026-08-26", () => {
    assert.equal(dateOnlyFromLocalDate(new Date(2026, 7, 26)), "2026-08-26");
    assert.equal(dateOnlyFromLocalDate(localDateFromDateOnly("2026-08-26")), "2026-08-26");
  });

  test("month and year boundaries stay date-only stable", () => {
    assert.equal(dateOnlyFromLocalDate(new Date(2026, 7, 31)), "2026-08-31");
    assert.equal(addDaysToDateOnly("2026-08-31", 1), "2026-09-01");
    assert.equal(dateOnlyFromLocalDate(new Date(2026, 11, 31)), "2026-12-31");
    assert.equal(addDaysToDateOnly("2026-12-31", 1), "2027-01-01");
  });

  test("selected-date label matches the clicked date", () => {
    assert.equal(formatDateOnlyHeading("2026-08-25"), "Tuesday, August 25");
    assert.equal(formatDateOnlyHeading("2026-08-26"), "Wednesday, August 26");
  });

  test("availability request date remains identical to clicked date in positive and negative timezones", () => {
    const script = [
      "const { dateOnlyFromLocalDate, formatDateOnlyHeading } = await import('@/lib/bookings/public-booking-date');",
      "const selected = dateOnlyFromLocalDate(new Date(2026, 7, 25));",
      "console.log(JSON.stringify({ selected, label: formatDateOnlyHeading(selected) }));",
    ].join("");

    for (const tz of ["Asia/Kolkata", "America/Chicago"]) {
      const result = spawnSync(process.execPath, ["--import", "tsx", "-e", script], {
        cwd: process.cwd(),
        env: { ...process.env, TZ: tz },
        encoding: "utf8",
      });
      assert.equal(result.status, 0, result.stderr);
      const parsed = JSON.parse(result.stdout.trim()) as { selected: string; label: string };
      assert.equal(parsed.selected, "2026-08-25", `selected date drifted in ${tz}`);
      assert.equal(parsed.label, "Tuesday, August 25", `label drifted in ${tz}`);
    }
  });
});
