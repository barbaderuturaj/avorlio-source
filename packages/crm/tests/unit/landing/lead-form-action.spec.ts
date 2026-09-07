import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  resolveLandingActivityUserId,
  submitLeadFormWithDeps,
  type LeadFormDeps,
} from "@/lib/landing/lead-form-action";

// Each makeDeps call gets a unique timestamp offset by 2 minutes per call so
// the module-level idempotency cache never deduplicates across tests.
let nowCounter = 0;
const BASE_NOW_MS = new Date("2026-06-14T12:00:00.000Z").getTime();
const TTL_SKIP_MS = 2 * 60 * 1000; // 2 min > the 60s dedup window

// A fresh recording-fakes set per test. Defaults model the happy path
// for a brand-new contact in a Twilio-configured workspace.
function makeDeps(overrides: Partial<LeadFormDeps> = {}): {
  deps: LeadFormDeps;
  events: Array<{ type: string; data: Record<string, unknown> }>;
  emails: unknown[];
  smsCalls: Array<{ toNumber: string; body: string }>;
  inserts: Array<Record<string, unknown>>;
  updates: Array<{ id: string; patch: Record<string, unknown> }>;
  activities: Array<Record<string, unknown>>;
  deals: Array<Record<string, unknown>>;
} {
  const events: Array<{ type: string; data: Record<string, unknown> }> = [];
  const emails: unknown[] = [];
  const smsCalls: Array<{ toNumber: string; body: string }> = [];
  const inserts: Array<Record<string, unknown>> = [];
  const updates: Array<{ id: string; patch: Record<string, unknown> }> = [];
  const activities: Array<Record<string, unknown>> = [];
  const deals: Array<Record<string, unknown>> = [];

  const deps: LeadFormDeps = {
    assertWritable: () => {},
    resolveOrgIdBySlug: async () => "org-1",
    enforceContactLimit: async () => ({ allowed: true, tier: "workspace" }),
    findContactByPhone: async () => null,
    getContactById: async () => null,
    createContact: async (values) => {
      inserts.push(values);
      return "contact-new";
    },
    updateContact: async (id, patch) => {
      updates.push({ id, patch });
    },
    resolveActivityUserId: async () => "user-1",
    createActivity: async (values) => {
      activities.push(values);
    },
    getDefaultPipeline: async () => ({
      id: "pipeline-1",
      stages: [{ name: "New Lead", probability: 10 }],
    }),
    hasRecentLandingDeal: async () => false,
    createDeal: async (values) => {
      deals.push(values);
    },
    getBookingTemplate: async () => ({ slug: "default", title: "Service Call" }),
    emit: async (type, data, _orgId) => {
      events.push({ type, data });
    },
    buildBookUrl: ({ orgSlug, bookingSlug }) => `http://localhost:3002/book/${orgSlug}/${bookingSlug}`,
    sendSms: async ({ toNumber, body }) => {
      smsCalls.push({ toNumber, body });
      return { suppressed: false };
    },
    sendOperatorEmail: async (p) => {
      emails.push(p);
    },
    getBusinessName: async () => "Maloney Plumbing",
    // Each makeDeps call gets a unique timestamp offset by > the 60s dedup TTL
    // so the module-level idempotency cache never deduplicates across tests.
    now: () => new Date(BASE_NOW_MS + (nowCounter++) * TTL_SKIP_MS),
    ...overrides,
  };
  return { deps, events, emails, smsCalls, inserts, updates, activities, deals };
}

const INPUT = {
  orgSlug: "maloney-plumbing",
  name: "Dana Reyes",
  phone: "(209) 555-0144",
  need: "Burst pipe under the sink",
};

describe("resolveLandingActivityUserId", () => {
  test("uses a valid organizations.owner_id before org-user fallback", async () => {
    const fallbackCalls: string[] = [];
    const userId = await resolveLandingActivityUserId("org-1", {
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

  test("falls back when organizations.owner_id is null or invalid", async () => {
    const nullOwner = await resolveLandingActivityUserId("org-1", {
      getOrgOwnerId: async () => null,
      userExists: async () => {
        throw new Error("userExists should not run without an owner id");
      },
      getFallbackOrgUserId: async () => "fallback-user-1",
    });
    const invalidOwner = await resolveLandingActivityUserId("org-1", {
      getOrgOwnerId: async () => "missing-owner",
      userExists: async () => false,
      getFallbackOrgUserId: async () => "fallback-user-2",
    });

    assert.equal(nullOwner, "fallback-user-1");
    assert.equal(invalidOwner, "fallback-user-2");
  });

  test("returns null when owner and fallback cannot resolve a real user", async () => {
    const userId = await resolveLandingActivityUserId("org-1", {
      getOrgOwnerId: async () => "missing-owner",
      userExists: async () => false,
      getFallbackOrgUserId: async () => null,
    });

    assert.equal(userId, null);
  });
});

describe("submitLeadFormWithDeps — new contact, Twilio configured", () => {
  test("creates a lead contact, texts the lead, emails the operator, returns ok+smsSent", async () => {
    const { deps, events, emails, smsCalls, inserts, activities, deals } = makeDeps();
    const result = await submitLeadFormWithDeps(INPUT, deps);

    assert.equal(result.ok, true);
    assert.equal(result.smsSent, true);
    assert.equal(result.bookUrl, "http://localhost:3002/book/maloney-plumbing/default");

    // One contact created, status=lead, source=landing-leadform, need in customFields.
    assert.equal(inserts.length, 1);
    assert.equal(inserts[0].orgId, "org-1");
    assert.equal(inserts[0].status, "lead");
    assert.equal(inserts[0].source, "landing-leadform");
    assert.equal(inserts[0].firstName, "Dana");
    assert.equal(inserts[0].lastName, "Reyes");
    assert.deepEqual(inserts[0].customFields, {
      need: "Burst pipe under the sink",
      lastLeadSource: "landing-leadform",
    });

    assert.equal(activities.length, 1);
    assert.equal(activities[0].subject, "Landing form submitted");
    assert.equal(activities[0].contactId, "contact-new");
    assert.equal(activities[0].userId, "user-1");
    assert.deepEqual(activities[0].metadata, {
      source: "landing-leadform",
      service: "Burst pipe under the sink",
    });
    assert.equal(activities[0].body, "Service: Burst pipe under the sink");

    assert.equal(deals.length, 1);
    assert.equal(deals[0].contactId, "contact-new");
    assert.equal(deals[0].pipelineId, "pipeline-1");
    assert.equal(deals[0].stage, "New Lead");
    assert.equal(deals[0].probability, 10);
    assert.equal(deals[0].title, "Burst pipe under the sink — Dana Reyes");
    assert.deepEqual(deals[0].customFields, {
      source: "landing-leadform",
      service: "Burst pipe under the sink",
    });

    // Both events emitted: contact.created (create) + form.submitted (always).
    const types = events.map((e) => e.type);
    assert.deepEqual(types, ["contact.created", "form.submitted"]);
    assert.deepEqual(events[0].data, { contactId: "contact-new" });
    assert.equal(events[1].data.contactId, "contact-new");
    assert.equal(events[1].data.formId, "landing-leadform");

    // Lead SMS sent to the normalized number, with the book URL in the body.
    assert.equal(smsCalls.length, 1);
    assert.equal(smsCalls[0].toNumber, "+12095550144");
    assert.match(smsCalls[0].body, /localhost:3002\/book\/maloney-plumbing\/default/);

    // Operator emailed once.
    assert.equal(emails.length, 1);
  });
});

describe("submitLeadFormWithDeps — existing contact by phone (upsert)", () => {
  test("links existing contact, backfills blank name only, no contact.created", async () => {
    const { deps, events, inserts, updates } = makeDeps({
      findContactByPhone: async () => "contact-existing",
      // Existing contact has no firstName/lastName → name backfills.
      getContactById: async () => ({
        firstName: "",
        lastName: null,
        customFields: { campaign: "google", vip: true },
      }),
    });
    const result = await submitLeadFormWithDeps(INPUT, deps);

    assert.equal(result.ok, true);
    // No new insert.
    assert.equal(inserts.length, 0);
    // Name backfilled + need merged into customFields via update.
    assert.equal(updates.length, 1);
    assert.equal(updates[0].id, "contact-existing");
    assert.equal(updates[0].patch.firstName, "Dana");
    assert.equal(updates[0].patch.lastName, "Reyes");
    assert.deepEqual(updates[0].patch.customFields, {
      campaign: "google",
      vip: true,
      need: "Burst pipe under the sink",
      lastLeadSource: "landing-leadform",
    });
    // Only form.submitted — contact.created is NOT emitted on upsert.
    assert.deepEqual(events.map((e) => e.type), ["form.submitted"]);
  });

  test("does NOT clobber an existing non-blank name", async () => {
    const { deps, updates } = makeDeps({
      findContactByPhone: async () => "contact-existing",
      getContactById: async () => ({ firstName: "Daniela", lastName: "Reyes-Cruz" }),
    });
    await submitLeadFormWithDeps(INPUT, deps);
    // name fields must be absent from the patch (we only set need-related fields).
    const patch = updates[0]?.patch ?? {};
    assert.equal(patch.firstName, undefined);
    assert.equal(patch.lastName, undefined);
  });

  test("does not create a duplicate recent landing deal", async () => {
    const { deps, deals } = makeDeps({ hasRecentLandingDeal: async () => true });
    await submitLeadFormWithDeps(INPUT, deps);
    assert.equal(deals.length, 0);
  });

  test("projection failures do not fail the contact submission", async () => {
    const { deps, inserts } = makeDeps({
      createActivity: async () => { throw new Error("activity unavailable"); },
      createDeal: async () => { throw new Error("deal unavailable"); },
    });
    const result = await submitLeadFormWithDeps(INPUT, deps);
    assert.equal(result.ok, true);
    assert.equal(inserts.length, 1);
  });

  test("missing pipeline still succeeds and skips deal projection", async () => {
    const { deps, deals, inserts } = makeDeps({ getDefaultPipeline: async () => null });
    const result = await submitLeadFormWithDeps(INPUT, deps);
    assert.equal(result.ok, true);
    assert.equal(inserts.length, 1);
    assert.equal(deals.length, 0);
  });

  test("missing activity user still succeeds without fabricating an activity", async () => {
    const { deps, activities, inserts } = makeDeps({ resolveActivityUserId: async () => null });
    const result = await submitLeadFormWithDeps(INPUT, deps);
    assert.equal(result.ok, true);
    assert.equal(inserts.length, 1);
    assert.equal(activities.length, 0);
  });

  test("booking CTA and SMS copy stay neutral when no booking template exists", async () => {
    const { deps, smsCalls } = makeDeps({ getBookingTemplate: async () => null });
    const result = await submitLeadFormWithDeps(INPUT, deps);
    assert.equal(result.ok, true);
    assert.equal(result.bookUrl, "");
    assert.doesNotMatch(smsCalls[0]?.body ?? "", /available times|book/i);
  });
});

describe("submitLeadFormWithDeps — SMS graceful skip (no Twilio)", () => {
  test("sendSms throwing leaves contact + operator email intact, smsSent=false", async () => {
    const { deps, events, emails } = makeDeps({
      sendSms: async () => {
        throw new Error("Twilio fromNumber not configured for this workspace");
      },
    });
    const result = await submitLeadFormWithDeps(INPUT, deps);

    assert.equal(result.ok, true);
    assert.equal(result.smsSent, false);
    // Contact + form events still emitted, operator still emailed.
    assert.deepEqual(events.map((e) => e.type), ["contact.created", "form.submitted"]);
    assert.equal(emails.length, 1);
  });
});

describe("submitLeadFormWithDeps — suppressed number", () => {
  test("suppressed result yields smsSent=false without throwing", async () => {
    const { deps } = makeDeps({
      sendSms: async () => ({ suppressed: true }),
    });
    const result = await submitLeadFormWithDeps(INPUT, deps);
    assert.equal(result.ok, true);
    assert.equal(result.smsSent, false);
  });
});

describe("submitLeadFormWithDeps — contact-limit reached", () => {
  test("returns ok=false with the upgrade message; no contact, no SMS", async () => {
    const { deps, inserts, smsCalls, events } = makeDeps({
      enforceContactLimit: async () => ({
        allowed: false,
        tier: "inactive",
        reason: "contact_limit_reached",
        message: "Upgrade to a paid plan to keep adding contacts.",
        upgradeUrl: "/settings/billing",
        used: 50,
        limit: 50,
      }),
      // limit is checked only when the contact doesn't already exist.
      findContactByPhone: async () => null,
    });
    const result = await submitLeadFormWithDeps(INPUT, deps);

    assert.equal(result.ok, false);
    assert.match(result.error ?? "", /Free plan|Upgrade/i);
    assert.equal(inserts.length, 0);
    assert.equal(smsCalls.length, 0);
    assert.deepEqual(events, []);
  });
});

describe("submitLeadFormWithDeps — validation + unknown org", () => {
  beforeEach(() => {});

  test("missing name/phone returns ok=false without side effects", async () => {
    const { deps, inserts } = makeDeps();
    const result = await submitLeadFormWithDeps(
      { orgSlug: "x", name: "  ", phone: "", need: "Z" },
      deps,
    );
    assert.equal(result.ok, false);
    assert.match(result.error ?? "", /name and phone/i);
    assert.equal(inserts.length, 0);
  });

  test("unknown org returns ok=false", async () => {
    const { deps } = makeDeps({ resolveOrgIdBySlug: async () => null });
    const result = await submitLeadFormWithDeps(INPUT, deps);
    assert.equal(result.ok, false);
    assert.match(result.error ?? "", /not found/i);
  });
});
