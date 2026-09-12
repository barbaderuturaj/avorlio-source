"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auth } from "@/auth";
import { intakeForms, onboardingLinks, orgMembers, organizations, partnerAgencies } from "@/db/schema";
import { createOnboardingLink } from "@/lib/onboarding/links";
import { seedOnboardingForm } from "@/lib/onboarding/onboarding-form-definition";

export async function createOrGetOnboardingLinkAction(workspaceId: string): Promise<{ url: string }> {
  const session = await auth();
  const adminUserId = session?.user?.id?.trim();
  if (!adminUserId) throw new Error("Unauthorized");

  const [workspace] = await db
    .select({
      id: organizations.id,
      ownerId: organizations.ownerId,
      parentUserId: organizations.parentUserId,
      parentAgencyId: organizations.parentAgencyId,
    })
    .from(organizations)
    .where(eq(organizations.id, workspaceId))
    .limit(1);
  if (!workspace) throw new Error("Unauthorized");

  const [member] = await db
    .select({ userId: orgMembers.userId })
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, workspace.id), eq(orgMembers.userId, adminUserId)))
    .limit(1);
  let authorized =
    workspace.ownerId === adminUserId ||
    workspace.parentUserId === adminUserId ||
    member?.userId === adminUserId;

  if (!authorized && workspace.parentAgencyId) {
    const [agency] = await db
      .select({ ownerUserId: partnerAgencies.ownerUserId, ownerWorkspaceId: partnerAgencies.ownerWorkspaceId })
      .from(partnerAgencies)
      .where(eq(partnerAgencies.id, workspace.parentAgencyId))
      .limit(1);
    if (agency?.ownerUserId === adminUserId) {
      authorized = true;
    } else if (agency?.ownerWorkspaceId) {
      const [ownerWorkspace] = await db
        .select({ ownerId: organizations.ownerId })
        .from(organizations)
        .where(eq(organizations.id, agency.ownerWorkspaceId))
        .limit(1);
      authorized = ownerWorkspace?.ownerId === adminUserId;
    }
  }

  if (!authorized) throw new Error("Unauthorized");
  await seedOnboardingForm(workspaceId);
  let [link] = await db.select({ token: onboardingLinks.token }).from(onboardingLinks).where(and(eq(onboardingLinks.orgId, workspaceId), eq(onboardingLinks.status, "pending"))).limit(1);
  if (!link) link = await createOnboardingLink(workspaceId).then(({ token }) => ({ token }));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  return { url: `${appUrl}/onboard/${link.token}` };
}
