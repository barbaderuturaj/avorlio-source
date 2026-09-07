import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_SONNET_MODEL } from "@/lib/ai/models";

describe("messaging model default", () => {
  test("uses the canonical supported Sonnet default, not stale claude-sonnet-4-5", () => {
    assert.equal(DEFAULT_SONNET_MODEL, "claude-sonnet-4-6");
    assert.notEqual(DEFAULT_SONNET_MODEL, "claude-sonnet-4-5");
  });
});

