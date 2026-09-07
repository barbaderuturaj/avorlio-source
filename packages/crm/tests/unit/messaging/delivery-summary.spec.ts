import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  buildDeliveryStatusCounts,
  formatDeliveryStatusSummary,
  isSuccessfulDeliveryStatus,
} from "@/lib/messaging/delivery-summary";

describe("messaging delivery summary", () => {
  test("queued emails are not counted as sent", () => {
    const counts = buildDeliveryStatusCounts([
      { status: "queued" },
      { status: "queued" },
      { status: "pending" },
    ]);

    assert.equal(counts.sent, 0);
    assert.equal(counts.queued, 3);
    assert.equal(formatDeliveryStatusSummary(counts), "0 sent · 3 queued");
  });

  test("failed emails are not counted as sent", () => {
    const counts = buildDeliveryStatusCounts([
      { status: "failed" },
      { status: "bounced" },
    ]);

    assert.equal(counts.sent, 0);
    assert.equal(counts.failed, 2);
    assert.equal(formatDeliveryStatusSummary(counts), "0 sent · 2 failed");
  });

  test("successful sent and delivered rows are counted as sent", () => {
    const counts = buildDeliveryStatusCounts([
      { status: "sent" },
      { status: "delivered" },
      { status: "queued" },
    ]);

    assert.equal(counts.sent, 2);
    assert.equal(counts.queued, 1);
    assert.equal(isSuccessfulDeliveryStatus("queued"), false);
    assert.equal(formatDeliveryStatusSummary(counts), "2 sent · 1 queued");
  });

  test("summary copy is truthful when only queued records exist", () => {
    const summary = formatDeliveryStatusSummary(
      buildDeliveryStatusCounts(Array.from({ length: 6 }, () => ({ status: "queued" }))),
    );

    assert.equal(summary, "0 sent · 6 queued");
    assert.doesNotMatch(summary, /6 emails sent/i);
    assert.doesNotMatch(summary, /sent so far/i);
  });

  test("summary copy is truthful when failures exist", () => {
    const summary = formatDeliveryStatusSummary(
      buildDeliveryStatusCounts([
        ...Array.from({ length: 6 }, () => ({ status: "queued" })),
        { status: "failed" },
        { status: "failed" },
        { status: "failed" },
        { status: "failed" },
      ]),
    );

    assert.equal(summary, "0 sent · 6 queued · 4 failed");
  });
});

