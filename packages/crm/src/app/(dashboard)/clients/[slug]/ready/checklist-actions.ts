"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { intakeForms, orgMembers, organizations, partnerAgencies } from "@/db/schema";
import { hasManagedWorkspaceAccess, HVAC_INTERNAL_CHECKLIST, isHvacOnboardingForm, type HvacInternalChecklistItemId } from "@/lib/onboarding/internal-checklist";

async function canManageWorkspace(workspaceId: string, userId: string): Promise<boolean> {
  const [workspace] = await db
    .select({ ownerId: organizations.ownerId, parentUserId: organizations.parentUserId, parentAgencyId: organizations.parentAgencyId })
    .from(organizations)
    .where(eq(organizations.id, workspaceId))
    .limit(1);
  if (!workspace) return false;

  const [member] = await db
    .select({ userId: orgMembers.userId })
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, workspaceId), eq(orgMembers.userId, userId)))
    .limit(1);
  if (workspace.parentAgencyId) {
    const [agency] = await db
      .select({ ownerUserId: partnerAgencies.ownerUserId, ownerWorkspaceId: partnerAgencies.ownerWorkspaceId })
      .from(partnerAgencies)
      .where(eq(partnerAgencies.id, workspace.parentAgencyId))
      .limit(1);
    let agencyOwnerWorkspaceOwnerId: string | null = null;
    if (agency?.ownerWorkspaceId) {
      const [ownerWorkspace] = await db
        .select({ ownerId: organizations.ownerId })
        .from(organizations)
        .where(eq(organizations.id, agency.ownerWorkspaceId))
        .limit(1);
      agencyOwnerWorkspaceOwnerId = ownerWorkspace?.ownerId ?? null;
    }
    return hasManagedWorkspaceAccess({ workspace, userId, memberUserId: member?.userId, agency, agencyOwnerWorkspaceOwnerId });
  }

  return hasManagedWorkspaceAccess({ workspace, userId, memberUserId: member?.userId });
}

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
