"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { intakeForms, organizations } from "@/db/schema";
import { canManageWorkspace } from "@/lib/auth/managed-workspace";
import { HVAC_INTERNAL_CHECKLIST, isHvacOnboardingForm, type HvacInternalChecklistItemId } from "@/lib/onboarding/internal-checklist";

export async function toggleInternalOnboardingChecklistItem(input: {
  workspaceId: string;
  workspaceSlug: string;
  itemId: string;
  completed: boolean;
}): Promise<{ ok: true } | { ok: false; error: "unauthorized" | "invalid_item" | "not_hvac" }> {
  const userId = (await auth())?.user?.id?.trim();
  if (!userId || !(await canManageWorkspace(input.workspaceId, userId))) {
    return { ok: false, error: "unauthorized" };
  }

  const [onboardingForm] = await db
    .select({ slug: intakeForms.slug, name: intakeForms.name })
    .from(intakeForms)
    .where(and(eq(intakeForms.orgId, input.workspaceId), eq(intakeForms.slug, "onboarding")))
    .limit(1);
  if (!isHvacOnboardingForm(onboardingForm)) return { ok: false, error: "not_hvac" };

  const definition = HVAC_INTERNAL_CHECKLIST.find((item) => item.id === input.itemId);
  if (!definition) return { ok: false, error: "invalid_item" };
  const itemId = definition.id as HvacInternalChecklistItemId;
  const stateJson = input.completed
    ? JSON.stringify({ completed: true, completedAt: new Date().toISOString(), completedBy: userId })
    : JSON.stringify({ completed: false });
  const emptyChecklistJson = JSON.stringify({ version: 1, vertical: "hvac", items: {} });

  await db
    .update(organizations)
    .set({
      settings: sql`
        jsonb_set(
          COALESCE(${organizations.settings}, '{}'::jsonb),
          ARRAY['internalOnboardingChecklist']::text[],
          jsonb_set(
            COALESCE(${organizations.settings}->'internalOnboardingChecklist', ${emptyChecklistJson}::jsonb),
            ARRAY['items', ${itemId}]::text[],
            ${stateJson}::jsonb,
            true
          ),
          true
        )
      `,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, input.workspaceId));

  revalidatePath(`/clients/${input.workspaceSlug}/ready`);
  return { ok: true };
}
