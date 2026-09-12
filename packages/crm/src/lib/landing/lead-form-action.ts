"use server";

import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { activities, bookings, contacts, deals, organizations, pipelines, users } from "@/db/schema";
import { assertWritable as assertWritableImpl } from "@/lib/demo/server";
import { enforceContactLimit as enforceContactLimitImpl } from "@/lib/billing/limits";
import { emitSeldonEvent } from "@/lib/events/bus";
import { findContactByPhone as findContactByPhoneImpl } from "@/lib/sms/api";
import { sendSmsFromApi } from "@/lib/sms/api";
import { normalizePhone } from "@/lib/sms/suppression";
import { sendNewLeadAlert } from "@/lib/notifications/ops-notifications";
import {
  buildPublicBookingUrl,
  getPublicBookingTemplateForOrg,
  requestOriginFromHeaders,
  type PublicBookingTemplate,
} from "@/lib/bookings/public-booking-url";
import { resolveOrgActivityUserId } from "@/lib/crm/activity-user";
import type { LimitDecision } from "@/lib/billing/limits";

// ── Public contract ───────────────────────────────────────────────────────

export type LeadFormInput = {
  orgSlug: string;
  name: string;
  phone: string;
  need: string;
};

export type LeadFormActionResult = {
  ok: boolean;
  smsSent: boolean;
  bookUrl: string;
  /** Set only when ok=false — a friendly message the form surfaces inline. */
  error?: string;
};

const LANDING_DEAL_DEDUP_WINDOW_MS = 10 * 60 * 1000;

type ActivityUserResolverDeps = {
  getOrgOwnerId: (orgId: string) => Promise<string | null>;
  userExists: (userId: string) => Promise<boolean>;
  getFallbackOrgUserId: (orgId: string) => Promise<string | null>;
};

// ── Injectable boundary (the repo's testable-deps idiom; see
//    src/lib/events/listeners-testable.ts). The "use server" action below
//    wires the production implementations; unit tests inject fakes so no
//    DB / Twilio / Resend is touched. ───────────────────────────────────────

export type LeadFormDeps = {
  assertWritable: () => void;
  resolveOrgIdBySlug: (slug: string) => Promise<string | null>;
  enforceContactLimit: (orgId: string) => Promise<LimitDecision>;
  findContactByPhone: (orgId: string, phone: string) => Promise<string | null>;
  getContactById: (
    orgId: string,
    contactId: string,
  ) => Promise<{
    firstName: string | null;
    lastName: string | null;
    customFields?: Record<string, unknown> | null;
  } | null>;
  createContact: (values: {
    orgId: string;
    firstName: string;
    lastName: string | null;
    phone: string;
    status: "lead";
    source: "landing-leadform";
    customFields: Record<string, unknown>;
  }) => Promise<string>;
  updateContact: (
    contactId: string,
    patch: Record<string, unknown>,
  ) => Promise<void>;
  resolveActivityUserId: (orgId: string) => Promise<string | null>;
  createActivity: (values: {
    orgId: string;
    userId: string;
    contactId: string;
    type: "note";
    subject: string;
    body: string;
    metadata: Record<string, unknown>;
  }) => Promise<void>;
  getDefaultPipeline: (orgId: string) => Promise<{
    id: string;
    stages: Array<{ name: string; probability?: number | null }>;
  } | null>;
  hasRecentLandingDeal: (orgId: string, contactId: string, service: string, since: Date) => Promise<boolean>;
  createDeal: (values: {
    orgId: string;
    contactId: string;
    pipelineId: string;
    title: string;
    stage: string;
    probability: number;
    customFields: Record<string, unknown>;
    notes: string | null;
  }) => Promise<void>;
  getBookingTemplate: (orgId: string) => Promise<PublicBookingTemplate | null>;
  emit: (type: "contact.created" | "form.submitted", data: Record<string, unknown>, orgId: string) => Promise<void>;
  buildBookUrl: (params: { orgSlug: string; orgId: string; bookingSlug: string }) => string;
  sendSms: (params: {
    orgId: string;
    contactId: string;
    toNumber: string;
    body: string;
  }) => Promise<{ suppressed: boolean }>;
  sendOperatorEmail: (params: {
    businessName: string;
    name: string;
    phone: string;
    need: string;
    orgSlug: string;
  }) => Promise<void>;
  getBusinessName: (orgId: string) => Promise<string>;
  now: () => Date;
};

// ── In-memory idempotency (mirrors the public intake route). Dedup by
//    orgId+phone for a short window so a double-tap doesn't double-create
//    the contact or double-send the SMS. Lives for the lambda's lifetime. ──
const LEAD_IDEMPOTENCY_CACHE = new Map<string, number>();
const LEAD_IDEMPOTENCY_TTL_MS = 60_000;

function leadDedupSeen(key: string, now: number): boolean {
  for (const [k, expires] of LEAD_IDEMPOTENCY_CACHE) {
    if (expires < now) LEAD_IDEMPOTENCY_CACHE.delete(k);
  }
  const existing = LEAD_IDEMPOTENCY_CACHE.get(key);
  if (existing && existing > now) return true;
  LEAD_IDEMPOTENCY_CACHE.set(key, now + LEAD_IDEMPOTENCY_TTL_MS);
  return false;
}

/** Naive "first last" split — matches the public intake route's behavior. */
function splitName(full: string): { firstName: string; lastName: string | null } {
  const parts = full.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

export async function resolveLandingActivityUserId(
  orgId: string,
  deps: ActivityUserResolverDeps = {
    getOrgOwnerId: async (id) => {
      const [org] = await db
        .select({ ownerId: organizations.ownerId })
        .from(organizations)
        .where(eq(organizations.id, id))
        .limit(1);
      return org?.ownerId ?? null;
    },
    userExists: async (userId) => {
      const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
      return Boolean(user?.id);
    },
    getFallbackOrgUserId: async (id) => {
      const [owner] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.orgId, id), eq(users.role, "owner")))
        .orderBy(asc(users.createdAt))
        .limit(1);
      if (owner?.id) return owner.id;
      const [member] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.orgId, id))
        .orderBy(asc(users.createdAt))
        .limit(1);
      return member?.id ?? null;
    },
  },
): Promise<string | null> {
  return resolveOrgActivityUserId(orgId, deps);
}

/**
 * Pure, injectable core. Returns a result object; never throws for the
 * expected branches (limit/suppressed/no-Twilio/validation). Order mirrors
 * app/api/v1/public/intake/route.ts: dedup → resolve → assertWritable →
 * find-or-create → emit → SMS (try/catch) → operator email.
 */
export async function submitLeadFormWithDeps(
  input: LeadFormInput,
  deps: LeadFormDeps,
): Promise<LeadFormActionResult> {
  const name = input.name.trim();
  const phoneRaw = input.phone.trim();
  const need = input.need.trim();
  const orgSlug = input.orgSlug.trim();

  if (!name || !phoneRaw) {
    return { ok: false, smsSent: false, bookUrl: "", error: "Please enter your name and phone." };
  }

  const orgId = await deps.resolveOrgIdBySlug(orgSlug);
  if (!orgId) {
    return { ok: false, smsSent: false, bookUrl: "", error: "Workspace not found." };
  }

  // Demo-readonly guard (no-op in normal workspaces). Throws DEMO_BLOCK_MESSAGE
  // when NEXT_PUBLIC_DEMO_READONLY=true — surfaced to the form as a friendly error.
  try {
    deps.assertWritable();
  } catch (err) {
    return {
      ok: false,
      smsSent: false,
      bookUrl: "",
      error: err instanceof Error ? err.message : "This workspace is read-only.",
    };
  }

  const normalizedPhone = normalizePhone(phoneRaw) || phoneRaw;
  const bookingTemplate = await deps.getBookingTemplate(orgId).catch(() => null);
  const bookUrl = bookingTemplate ? deps.buildBookUrl({ orgSlug, orgId, bookingSlug: bookingTemplate.slug }) : "";

  // Idempotency: short-circuit a duplicate submission (same orgId+phone).
  const nowMs = deps.now().getTime();
  if (leadDedupSeen(`${orgId}:${normalizedPhone}`, nowMs)) {
    return { ok: true, smsSent: false, bookUrl };
  }

  // ── Find-or-create contact by phone ──
  const customFields: Record<string, unknown> = {
    ...(need ? { need } : {}),
    lastLeadSource: "landing-leadform",
  };
  let contactId = await deps.findContactByPhone(orgId, normalizedPhone);
  let created = false;
  const { firstName, lastName } = splitName(name);

  if (contactId) {
    // Upsert: backfill name ONLY when the existing record's is blank; always
    // merge the latest need into customFields.
    const existing = await deps.getContactById(orgId, contactId);
    const mergedCustomFields = { ...(existing?.customFields ?? {}), ...customFields };
    const patch: Record<string, unknown> = { customFields: mergedCustomFields, updatedAt: deps.now() };
    if (existing && !(existing.firstName ?? "").trim()) patch.firstName = firstName;
    if (existing && !(existing.lastName ?? "")?.trim()) patch.lastName = lastName;
    await deps.updateContact(contactId, patch);
  } else {
    // Free-tier cap only blocks NEW contacts (mirrors the intake route).
    const limit = await deps.enforceContactLimit(orgId);
    if (!limit.allowed) {
      return { ok: false, smsSent: false, bookUrl, error: limit.message };
    }
    contactId = await deps.createContact({
      orgId,
      firstName,
      lastName,
      phone: normalizedPhone,
      status: "lead",
      source: "landing-leadform",
      customFields,
    });
    created = true;
  }

  // ── Events: contact.created (create only) + form.submitted (always) ──
  if (created) {
    await deps.emit("contact.created", { contactId }, orgId);
  }
  await deps.emit("form.submitted", {
    formId: "landing-leadform",
    contactId,
    data: { name, phone: normalizedPhone, need, source: "landing-leadform" },
  }, orgId);

  // CRM projection is deliberately best-effort after the required contact
  // write. A missing org user, pipeline, or individual projection failure
  // must not turn a successful public lead submission into a user-visible
  // error.
  try {
    const activityUserId = await deps.resolveActivityUserId(orgId);
    if (activityUserId) {
      await deps.createActivity({
        orgId,
        userId: activityUserId,
        contactId,
        type: "note",
        subject: "Landing form submitted",
        body: need ? `Service: ${need}` : "Landing form submitted without a service selection.",
        metadata: {
          source: "landing-leadform",
          ...(need ? { service: need } : {}),
        },
      });
    } else {
      console.warn(JSON.stringify({
        event: "landing_lead_activity_skipped",
        reason: "no_org_user",
        org_id: orgId,
        contact_id: contactId,
      }));
    }
  } catch (err) {
    console.warn(JSON.stringify({
      event: "landing_lead_activity_projection_failed",
      org_id: orgId,
      contact_id: contactId,
      error: err instanceof Error ? err.message : String(err),
    }));
  }

  try {
    const pipeline = await deps.getDefaultPipeline(orgId);
    const firstStage = pipeline?.stages[0];
    if (pipeline && firstStage) {
      const duplicate = await deps.hasRecentLandingDeal(
        orgId,
        contactId,
        need,
        new Date(deps.now().getTime() - LANDING_DEAL_DEDUP_WINDOW_MS),
      );
      if (!duplicate) {
        const contactName = [firstName, lastName].filter(Boolean).join(" ") || "Contact";
        await deps.createDeal({
          orgId,
          contactId,
          pipelineId: pipeline.id,
          title: need ? `${need} — ${contactName}` : `Website inquiry — ${contactName}`,
          stage: firstStage.name,
          probability: firstStage.probability ?? 0,
          customFields: {
            source: "landing-leadform",
            ...(need ? { service: need } : {}),
          },
          notes: null,
        });
      }
    } else {
      console.info(JSON.stringify({
        event: "landing_lead_deal_skipped",
        reason: "no_default_pipeline",
        org_id: orgId,
        contact_id: contactId,
      }));
    }
  } catch (err) {
    console.warn(JSON.stringify({
      event: "landing_lead_deal_projection_failed",
      org_id: orgId,
      contact_id: contactId,
      error: err instanceof Error ? err.message : String(err),
    }));
  }

  // ── Text the lead. try/catch → graceful skip when no Twilio fromNumber
  //    (sendSmsFromApi throws). suppressed=true (no throw) also ⇒ smsSent:false. ──
  let smsSent = false;
  const businessName = await deps.getBusinessName(orgId);
  try {
    const res = await deps.sendSms({
      orgId,
      contactId,
      toNumber: normalizedPhone,
      body: bookingTemplate
        ? `Hi ${firstName || name}, thanks for reaching out to ${businessName}! View available times here: ${bookUrl}. Reply STOP to opt out.`
        : `Hi ${firstName || name}, thanks for reaching out to ${businessName}. We received your request. Reply STOP to opt out.`,
    });
    smsSent = !res.suppressed;
  } catch {
    smsSent = false;
  }

  // ── Email the operator (platform-level; no Twilio/workspace dependency). ──
  await deps.sendOperatorEmail({ businessName, name, phone: normalizedPhone, need, orgSlug });

  return { ok: true, smsSent, bookUrl };
}

// ── Production deps factory ──────────────────────────────────────────────

function makeDefaultDeps(requestOrigin: string | null = null): LeadFormDeps {
  return {
    assertWritable: assertWritableImpl,
    resolveOrgIdBySlug: async (slug) => {
      const [org] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, slug))
        .limit(1);
      return org?.id ?? null;
    },
    enforceContactLimit: enforceContactLimitImpl,
    findContactByPhone: findContactByPhoneImpl,
    getContactById: async (orgId, contactId) => {
      const [row] = await db
        .select({ firstName: contacts.firstName, lastName: contacts.lastName, customFields: contacts.customFields })
        .from(contacts)
        .where(and(eq(contacts.orgId, orgId), eq(contacts.id, contactId)))
        .limit(1);
      return row ?? null;
    },
    createContact: async (values) => {
      const [row] = await db.insert(contacts).values(values).returning({ id: contacts.id });
      if (!row) throw new Error("Could not create contact");
      return row.id;
    },
    updateContact: async (contactId, patch) => {
      await db.update(contacts).set(patch).where(eq(contacts.id, contactId));
    },
    resolveActivityUserId: resolveLandingActivityUserId,
    createActivity: async (values) => {
      await db.insert(activities).values(values);
    },
    getDefaultPipeline: async (orgId) => {
      const [pipeline] = await db
        .select({ id: pipelines.id, stages: pipelines.stages })
        .from(pipelines)
        .where(and(eq(pipelines.orgId, orgId), eq(pipelines.isDefault, true)))
        .limit(1);
      return pipeline ?? null;
    },
    hasRecentLandingDeal: async (orgId, contactId, service, since) => {
      const conditions = [
        eq(deals.orgId, orgId),
        eq(deals.contactId, contactId),
        isNull(deals.closedAt),
        gt(deals.createdAt, since),
        sql`${deals.customFields}->>'source' = 'landing-leadform'`,
        sql`COALESCE(${deals.customFields}->>'service', '') = ${service}`,
      ];
      const [existing] = await db.select({ id: deals.id }).from(deals).where(and(...conditions)).limit(1);
      return Boolean(existing);
    },
    createDeal: async (values) => {
      await db.insert(deals).values(values);
    },
    getBookingTemplate: getPublicBookingTemplateForOrg,
    emit: (type, data, orgId) =>
      emitSeldonEvent(
        type,
        // The bus is generically typed; both event shapes are satisfied by
        // the records we build in the core.
        data as never,
        { orgId },
      ),
    buildBookUrl: ({ orgSlug, bookingSlug }) =>
      buildPublicBookingUrl({
        requestOrigin,
        orgSlug,
        bookingSlug,
        baseDomain: process.env.WORKSPACE_BASE_DOMAIN ?? "app.seldonframe.com",
      }),
    sendSms: async ({ orgId, contactId, toNumber, body }) => {
      const res = await sendSmsFromApi({ orgId, userId: null, contactId, toNumber, body });
      return { suppressed: res.suppressed };
    },
    sendOperatorEmail: (params) => sendNewLeadAlert(params),
    getBusinessName: async (orgId) => {
      const [org] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);
      return org?.name ?? "us";
    },
    now: () => new Date(),
  };
}

/**
 * The "use server" action the client form imports directly (mirrors
 * components/bookings/public-booking-form.tsx importing submitPublicBookingAction).
 * Thin wrapper over the injectable core with production deps.
 */
export async function submitLeadFormAction(input: LeadFormInput): Promise<LeadFormActionResult> {
  const requestOrigin = requestOriginFromHeaders(await headers());
  return submitLeadFormWithDeps(input, makeDefaultDeps(requestOrigin));
}
