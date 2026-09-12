import assert from "node:assert/strict";
import test from "node:test";
import { formatContactDateTime } from "@/components/contacts/contact-record-detail";

test("contact booking dates include the workspace timezone", () => {
  const label = formatContactDateTime("2026-08-31T13:30:00.000Z", "America/Chicago");
  assert.match(label, /Aug 31/);
  assert.match(label, /CDT|CST/);
});
