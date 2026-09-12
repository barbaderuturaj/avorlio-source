import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildChecklistView,
  emptyHvacInternalChecklist,
  hasManagedWorkspaceAccess,
  HVAC_INTERNAL_CHECKLIST,
  isHvacOnboardingForm,
  readHvacInternalChecklist,
  summarizeChecklist,
} from "../../../src/lib/onboarding/internal-checklist";

describe("HVAC internal onboarding checklist", () => {
  test("has stable unique IDs", () => {
    const ids = HVAC_INTERNAL_CHECKLIST.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(ids.length, 15);
  });

  test("defaults to empty without persisted state", () => {
    assert.deepEqual(readHvacInternalChecklist(undefined), emptyHvacInternalChecklist());
    assert.equal(buildChecklistView(emptyHvacInternalChecklist()).filter((item) => item.completed).length, 0);
  });

  test("merges valid stored item state with the static definition", () => {
    const items = buildChecklistView(readHvacInternalChecklist({
      version: 1,
      vertical: "hvac",
      items: {
        review_submission: { completed: true, completedAt: "2026-09-12T00:00:00.000Z", completedBy: "user-1" },
        not_a_real_item: { completed: true },
      },
    }));
    const review = items.find((item) => item.id === "review_submission");
    assert.equal(review?.completed, true);
    assert.equal(review?.completedBy, "user-1");
    assert.equal(items.some((item) => item.id === "not_a_real_item"), false);
  });

  test("counts completed items deterministically", () => {
    const items = buildChecklistView(readHvacInternalChecklist({ version: 1, vertical: "hvac", items: {
      review_submission: { completed: true },
      handoff_complete: { completed: true },
    }}));
    const summary = summarizeChecklist(items);
    assert.deepEqual(summary, { completed: 2, total: 15, requiredCompleted: 2, requiredTotal: 12 });
  });

  test("rejects unrelated verticals", () => {
    assert.equal(isHvacOnboardingForm({ slug: "onboarding", name: "Other Onboarding" }), false);
    assert.equal(isHvacOnboardingForm({ slug: "intake", name: "Avorlio HVAC Onboarding" }), false);
    assert.equal(isHvacOnboardingForm({ slug: "onboarding", name: "Avorlio HVAC Onboarding" }), true);
  });

  test("does not authorize another workspace user", () => {
    assert.equal(hasManagedWorkspaceAccess({
      workspace: { ownerId: "owner-1", parentUserId: null, parentAgencyId: null },
      userId: "owner-2",
    }), false);
  });

  test("preserves the intended atomic JSONB update contract", () => {
    // This test pins the implementation contract: the server action must use
    // jsonb_set against the existing settings document rather than replacing it.
    const source = readFileSync(new URL("../../../src/app/(dashboard)/clients/[slug]/ready/checklist-actions.ts", import.meta.url), "utf8");
    assert.match(source, /COALESCE\(\$\{organizations\.settings\}/);
    assert.match(source, /jsonb_set\(/);
  });
});
