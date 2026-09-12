import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations, users } from "@/db/schema";

export type ActivityUserResolverDeps = {
  getOrgOwnerId: (orgId: string) => Promise<string | null>;
  userExists: (userId: string) => Promise<boolean>;
  getFallbackOrgUserId: (orgId: string) => Promise<string | null>;
};

export async function resolveOrgActivityUserId(
  orgId: string,
  deps: ActivityUserResolverDeps,
): Promise<string | null> {
  const ownerId = await deps.getOrgOwnerId(orgId);
  if (ownerId && (await deps.userExists(ownerId))) {
    return ownerId;
  }
  return deps.getFallbackOrgUserId(orgId);
}

export function makeDefaultActivityUserResolverDeps(): ActivityUserResolverDeps {
  return {
    getOrgOwnerId: async (orgId) => {
      const [org] = await db
        .select({ ownerId: organizations.ownerId })
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);
      return org?.ownerId ?? null;
    },
    userExists: async (userId) => {
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return Boolean(user?.id);
    },
    getFallbackOrgUserId: async (orgId) => {
      const [owner] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.orgId, orgId), eq(users.role, "owner")))
        .orderBy(asc(users.createdAt))
        .limit(1);
      if (owner?.id) return owner.id;

      const [anyUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.orgId, orgId))
        .orderBy(asc(users.createdAt))
        .limit(1);
      return anyUser?.id ?? null;
    },
  };
}

