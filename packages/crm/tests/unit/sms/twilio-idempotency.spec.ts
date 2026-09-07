import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  persistInboundSmsWithDeps,
  type PersistInboundSmsInput,
  type PersistInboundSmsResult,
} from "../../../src/lib/sms/api";
import {
  buildTwilioStatusProviderEventId,
  buildUnmatchedInboundSmsLogPayload,
  recordTwilioStatusEventOnce,
  type TwilioStatusEventRecord,
} from "../../../src/lib/sms/twilio-webhook-idempotency";

const baseInbound: PersistInboundSmsInput = {
  orgId: "org-a",
  contactId: "contact-a",
  fromNumber: "+12145550199",
  toNumber: "+12145550147",
  body: "Need AC repair",
  externalMessageId: "SM_same_sid",
  metadata: { twilio: { MessageSid: "SM_same_sid" } },
};

function makeInboundStore() {
  const rows: Array<{ id: string; orgId: string; provider: string; externalMessageId: string; contactId: string | null }> = [];
  let next = 1;
  return {
    rows,
    deps: {
      findExisting: async (input: PersistInboundSmsInput) =>
        rows.find(
          (row) =>
            row.orgId === input.orgId &&
            row.provider === "twilio" &&
            row.externalMessageId === input.externalMessageId,
        ) ?? null,
      insert: async (input: PersistInboundSmsInput) => {
        if (
          rows.some(
            (row) =>
              row.orgId === input.orgId &&
              row.provider === "twilio" &&
              row.externalMessageId === input.externalMessageId,
          )
        ) {
          return null;
        }
        const row = {
          id: `sms-${next++}`,
          orgId: input.orgId,
          provider: "twilio",
          externalMessageId: input.externalMessageId,
          contactId: input.contactId,
        };
        rows.push(row);
        return { id: row.id, contactId: row.contactId };
      },
    },
  };
}

describe("Twilio inbound SMS idempotency", () => {
  test("same inbound MessageSid twice returns one sms row and reuses the existing row", async () => {
    const store = makeInboundStore();

    const first = await persistInboundSmsWithDeps(baseInbound, store.deps);
    const second = await persistInboundSmsWithDeps(baseInbound, store.deps);

    assert.deepEqual(
      [first, second],
      [
        { id: "sms-1", contactId: "contact-a", duplicate: false },
        { id: "sms-1", contactId: "contact-a", duplicate: true },
      ] satisfies PersistInboundSmsResult[],
    );
    assert.equal(store.rows.length, 1);
  });

  test("duplicate inbound result lets webhook skip downstream handling", async () => {
    const store = makeInboundStore();
    let downstreamEffects = 0;

    for (const input of [baseInbound, baseInbound]) {
      const result = await persistInboundSmsWithDeps(input, store.deps);
      if (!result.duplicate) downstreamEffects += 1;
    }

    assert.equal(store.rows.length, 1);
    assert.equal(downstreamEffects, 1);
  });

  test("same provider MessageSid in a different org is isolated", async () => {
    const store = makeInboundStore();

    await persistInboundSmsWithDeps(baseInbound, store.deps);
    const otherOrg = await persistInboundSmsWithDeps({ ...baseInbound, orgId: "org-b", contactId: "contact-b" }, store.deps);

    assert.equal(otherOrg.duplicate, false);
    assert.equal(otherOrg.id, "sms-2");
    assert.equal(store.rows.length, 2);
  });

  test("unmatched sender can persist with null contact and is explicitly logged as hidden from dashboard Inbox", async () => {
    const store = makeInboundStore();
    const result = await persistInboundSmsWithDeps({ ...baseInbound, contactId: null }, store.deps);
    const payload = buildUnmatchedInboundSmsLogPayload({
      orgId: baseInbound.orgId,
      fromNumber: baseInbound.fromNumber,
      toNumber: baseInbound.toNumber,
      externalMessageId: baseInbound.externalMessageId,
    });

    assert.equal(result.contactId, null);
    assert.equal(result.duplicate, false);
    assert.equal(payload.hidden_from_dashboard_inbox, true);
    assert.equal(payload.external_id, "SM_same_sid");
  });
});

function makeStatusEventStore() {
  const events = new Map<string, TwilioStatusEventRecord>();
  return {
    events,
    deps: {
      insertEvent: async (event: TwilioStatusEventRecord) => {
        const key = `${event.provider}:${event.providerEventId}`;
        if (events.has(key)) return null;
        events.set(key, event);
        return { id: `event-${events.size}` };
      },
    },
  };
}

describe("Twilio status callback idempotency", () => {
  test("same status callback twice creates one provider event", async () => {
    const store = makeStatusEventStore();
    const input = {
      orgId: "org-a",
      smsMessageId: "sms-1",
      externalMessageId: "SM_status_sid",
      status: "delivered",
      rawBody: { MessageSid: "SM_status_sid", MessageStatus: "delivered" },
    };

    const first = await recordTwilioStatusEventOnce(input, store.deps);
    const second = await recordTwilioStatusEventOnce(input, store.deps);

    assert.equal(first.inserted, true);
    assert.equal(second.inserted, false);
    assert.equal(store.events.size, 1);
  });

  test("queued -> sent -> delivered callbacks each persist once", async () => {
    const store = makeStatusEventStore();

    for (const status of ["queued", "sent", "delivered"]) {
      const result = await recordTwilioStatusEventOnce(
        {
          orgId: "org-a",
          smsMessageId: "sms-1",
          externalMessageId: "SM_status_sid",
          status,
          rawBody: { MessageSid: "SM_status_sid", MessageStatus: status },
        },
        store.deps,
      );
      assert.equal(result.inserted, true);
    }

    assert.equal(store.events.size, 3);
    assert.equal(
      buildTwilioStatusProviderEventId({ externalMessageId: "SM_status_sid", status: "Delivered" }),
      "twilio:SM_status_sid:delivered",
    );
  });

  test("failed status persists with deterministic event identity", async () => {
    const store = makeStatusEventStore();

    const result = await recordTwilioStatusEventOnce(
      {
        orgId: "org-a",
        smsMessageId: "sms-1",
        externalMessageId: "SM_failed_sid",
        status: "failed",
        rawBody: { MessageSid: "SM_failed_sid", MessageStatus: "failed", ErrorCode: "30003" },
      },
      store.deps,
    );

    assert.equal(result.inserted, true);
    assert.equal(result.providerEventId, "twilio:SM_failed_sid:failed");
    assert.equal(store.events.values().next().value?.eventType, "sms.failed");
  });
});
