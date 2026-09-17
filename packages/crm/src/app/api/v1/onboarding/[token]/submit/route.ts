import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { intakeForms } from "@/db/schema";
import { loadOnboardingLinkByToken } from "@/lib/onboarding/links";
import { HVAC_ONBOARDING_FIELDS } from "@/lib/onboarding/hvac-form-definition";
import { validatePublicIntakeAnswers } from "@/lib/forms/validation";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await loadOnboardingLinkByToken(token);
  if (!link || link.status !== "pending") return NextResponse.json({ error: "Onboarding link is not active." }, { status: 404 });
  let body: { answers?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body.answers || typeof body.answers !== "object" || Array.isArray(body.answers)) return NextResponse.json({ error: "Answers are required." }, { status: 400 });
  const answers = body.answers as Record<string, unknown>;
  const validationError = validatePublicIntakeAnswers(HVAC_ONBOARDING_FIELDS, answers);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  if (answers.emergency_service !== "Yes") delete answers.emergency_phone;
  const [form] = await db.select({ id: intakeForms.id }).from(intakeForms).where(and(eq(intakeForms.orgId, link.orgId), eq(intakeForms.slug, "onboarding"))).limit(1);
  if (!form) return NextResponse.json({ error: "Onboarding form is not configured." }, { status: 500 });
  const answersJson = JSON.stringify(answers);
  const submitted = await db.execute(sql`
    WITH claimed AS (
      UPDATE onboarding_links
      SET status = 'submitted', submitted_at = NOW()
      WHERE id = ${link.id}::uuid
        AND status = 'pending'
      RETURNING id
    )
    INSERT INTO intake_submissions (org_id, form_id, data)
    SELECT ${link.orgId}::uuid, ${form.id}::uuid, ${answersJson}::jsonb
    FROM claimed
    RETURNING id
  `);
  if (submitted.rows.length === 0) return NextResponse.json({ error: "Onboarding has already been submitted." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
