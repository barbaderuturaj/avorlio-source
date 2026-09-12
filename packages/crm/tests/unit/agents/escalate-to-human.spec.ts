import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { escalateToHuman } from "../../../src/lib/agents/tools";

describe("escalate_to_human tool schema", () => {
  test("provider-facing schema treats contactEmail as a plain optional string", () => {
    const contactEmail = (escalateToHuman.jsonSchema.properties ?? {}).contactEmail as
      | Record<string, unknown>
      | undefined;

    assert.equal(contactEmail?.type, "string");
    assert.equal(contactEmail?.format, undefined);
  });

  test("reason only is valid", () => {
    const parsed = escalateToHuman.inputSchema.safeParse({
      reason: "User reported a gas smell near the furnace.",
    });

    assert.equal(parsed.success, true);
  });

  test("contactEmail omitted is valid", () => {
    const parsed = escalateToHuman.inputSchema.safeParse({
      reason: "User reported a gas smell near the furnace.",
      contactName: "Jordan",
    });

    assert.equal(parsed.success, true);
  });

  test("blank optional contact fields normalize away", () => {
    const parsed = escalateToHuman.inputSchema.safeParse({
      reason: "User reported a gas smell near the furnace.",
      contactEmail: "",
      contactPhone: "   ",
      contactName: "",
    });

    assert.equal(parsed.success, true);
    if (!parsed.success) return;
    assert.equal(parsed.data.contactEmail, undefined);
    assert.equal(parsed.data.contactPhone, undefined);
    assert.equal(parsed.data.contactName, undefined);
  });

  test("blank contactEmail with surrounding whitespace normalizes away", () => {
    const parsed = escalateToHuman.inputSchema.safeParse({
      reason: "User reported a gas smell near the furnace.",
      contactEmail: "   ",
    });

    assert.equal(parsed.success, true);
    if (!parsed.success) return;
    assert.equal(parsed.data.contactEmail, undefined);
  });

  test("valid contactEmail is retained", () => {
    const parsed = escalateToHuman.inputSchema.safeParse({
      reason: "User reported a gas smell near the furnace.",
      contactEmail: "alice@example.com",
    });

    assert.equal(parsed.success, true);
    if (!parsed.success) return;
    assert.equal(parsed.data.contactEmail, "alice@example.com");
  });

  test("malformed non-empty email is rejected", () => {
    const parsed = escalateToHuman.inputSchema.safeParse({
      reason: "User reported a gas smell near the furnace.",
      contactEmail: "not-an-email",
    });

    assert.equal(parsed.success, false);
  });
});
