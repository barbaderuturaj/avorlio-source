import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  buildSmsInboxThreads,
  shouldShowDisconnectedPhoneEmptyState,
} from "../../../src/lib/conversations/inbox-threads";

describe("dashboard SMS Inbox thread visibility", () => {
  test("historical sms_messages-backed threads still render when Twilio is disconnected", () => {
    const threads = buildSmsInboxThreads([
      {
        contactId: "contact-a",
        direction: "inbound",
        body: "Do you service Dallas?",
        createdAt: new Date("2026-08-24T12:00:00Z"),
      },
    ]);

    assert.equal(threads.length, 1);
    assert.equal(threads[0].contactId, "contact-a");
    assert.equal(
      shouldShowDisconnectedPhoneEmptyState({ phoneConnected: false, threadCount: threads.length }),
      false,
    );
  });

  test("disconnected-phone empty state only applies when no threads exist", () => {
    assert.equal(
      shouldShowDisconnectedPhoneEmptyState({ phoneConnected: false, threadCount: 0 }),
      true,
    );
    assert.equal(
      shouldShowDisconnectedPhoneEmptyState({ phoneConnected: true, threadCount: 0 }),
      false,
    );
  });
});
