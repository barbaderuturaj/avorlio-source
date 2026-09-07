import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { resolveOrgActivityUserId } from "@/lib/crm/activity-user";
import {
  buildPublicBookingActivityBody,
  createPublicBookingActivityProjection,
  selectPublicBookingDealStage,
} from "@/lib/bookings/public-booking-crm";

const ACTIVITY_INPUT = {
  orgId: "org-1",
  contactId: "contact-1",
  dealId: "deal-1",
  bookingId: "booking-1",
  bookingSlug: "default",
  appointmentName: "Service Call",
  startsAt: new Date("2026-08-25T16:00:00.000Z"),
  notes: "Gate code 4242",
  intakeResponses: {
    issue_type: "AC repair",
    urgency: "This week",
  },
};

describe("public booking CRM projection", () => {
  test("activity user resolves from organizations.owner_id before org-user fallback", async () => {
    const fallbackCalls: string[] = [];
    const userId = await resolveOrgActivityUserId("org-1", {
      getOrgOwnerId: async () => "owner-user-1",
      userExists: async (id) => id === "owner-user-1",
      getFallbackOrgUserId: async (orgId) => {
        fallbackCalls.push(orgId);
        return "fallback-user-1";
      },
    });

    assert.equal(userId, "owner-user-1");
    assert.deepEqual(fallbackCalls, []);
  });

  test("invalid or null owner safely falls back, and missing fallback returns null", async () => {
    const invalidOwner = await resolveOrgActivityUserId("org-1", {
      getOrgOwnerId: async () => "missing-owner",
      userExists: async () => false,
      getFallbackOrgUserId: async () => "fallback-user-1",
    });
    const noUser = await resolveOrgActivityUserId("org-1", {
      getOrgOwnerId: async () => null,
      userExists: async () => {
        throw new Error("should not verify null owner");
      },
      getFallbackOrgUserId: async () => null,
    });

    assert.equal(invalidOwner, "fallback-user-1");
    assert.equal(noUser, null);
  });

  test("creates note activity linked to contact and deal with booking metadata", async () => {
    const activities: Array<Record<string, unknown>> = [];
    const logs: Array<Record<string, unknown>> = [];

    const result = await createPublicBookingActivityProjection(ACTIVITY_INPUT, {
      resolveActivityUserId: async () => "owner-user-1",
      createActivity: async (values) => {
        activities.push(values);
      },
      log: (event) => {
        logs.push(event);
      },
    });

    assert.deepEqual(result, { created: true });
    assert.equal(activities.length, 1);
    assert.equal(activities[0]!.userId, "owner-user-1");
    assert.equal(activities[0]!.contactId, "contact-1");
    assert.equal(activities[0]!.dealId, "deal-1");
    assert.equal(activities[0]!.type, "note");
    assert.equal(activities[0]!.subject, "Booking scheduled");
    assert.match(String(activities[0]!.body), /Appointment: Service Call/);
    assert.match(String(activities[0]!.body), /Scheduled for: 2026-08-25T16:00:00.000Z/);
    assert.match(String(activities[0]!.body), /Issue\/service: AC repair/);
    assert.match(String(activities[0]!.body), /Urgency: This week/);
    assert.match(String(activities[0]!.body), /Notes: Gate code 4242/);
    assert.deepEqual(activities[0]!.metadata, {
      source: "public-booking",
      bookingId: "booking-1",
      bookingSlug: "default",
      appointmentName: "Service Call",
      startsAt: "2026-08-25T16:00:00.000Z",
    });
    assert.equal(logs[0]!.event, "public_booking_activity_created");
  });

  test("missing user skips/logs without creating activity", async () => {
    const logs: Array<Record<string, unknown>> = [];
    const result = await createPublicBookingActivityProjection(ACTIVITY_INPUT, {
      resolveActivityUserId: async () => null,
      createActivity: async () => {
        throw new Error("should not create without user");
      },
      log: (event) => {
        logs.push(event);
      },
    });

    assert.deepEqual(result, { created: false, skippedReason: "no_org_user" });
    assert.equal(logs[0]!.event, "public_booking_activity_skipped");
    assert.equal(logs[0]!.reason, "no_org_user");
  });

  test("activity insert failure propagates to caller for best-effort catch while primary booking can continue", async () => {
    await assert.rejects(
      createPublicBookingActivityProjection(ACTIVITY_INPUT, {
        resolveActivityUserId: async () => "owner-user-1",
        createActivity: async () => {
          throw new Error("activity unavailable");
        },
        log: () => {},
      }),
      /activity unavailable/,
    );
  });

  test("body includes only submitted booking facts", () => {
    const body = buildPublicBookingActivityBody({
      ...ACTIVITY_INPUT,
      notes: null,
      intakeResponses: {},
    });

    assert.match(body, /Appointment: Service Call/);
    assert.match(body, /Scheduled for:/);
    assert.doesNotMatch(body, /Urgency:/);
    assert.doesNotMatch(body, /Notes:/);
  });

  test("deal stage selection preserves Estimate Scheduled behavior", () => {
    const selected = selectPublicBookingDealStage([
      { name: "New Lead", probability: 10 },
      { name: "Estimate Scheduled", probability: 25 },
      { name: "Estimate Given", probability: 50 },
    ]);

    assert.deepEqual(selected, {
      stage: "Estimate Scheduled",
      probability: 25,
      matched: true,
    });
  });
});

