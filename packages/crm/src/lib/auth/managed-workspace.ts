import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { orgMembers, organizations, partnerAgencies } from "@/db/schema";
import { hasManagedWorkspaceAccess } from "@/lib/onboarding/internal-checklist";

/**
 * The authorization used by the agency Ready page and its server actions.
 * A client can be managed through direct ownership, parentUserId, membership,
 * or ownership of the partner agency that owns the client workspace.
 */
export async function canManageWorkspace(workspaceId: string, userId: string): Promise<boolean> {
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

  if (!workspace.parentAgencyId) {
    return hasManagedWorkspaceAccess({ workspace, userId, memberUserId: member?.userId });
  }

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

  return hasManagedWorkspaceAccess({
    workspace,
    userId,
    memberUserId: member?.userId,
    agency,
    agencyOwnerWorkspaceOwnerId,
  });
}
