import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { agentConversations, agents } from "@/db/schema";
import {
  resolvePublicWebConversation,
  type PublicWebConversationDeps,
  type ResolvePublicWebConversationInput,
  type ResolvePublicWebConversationResult,
} from "@/lib/agents/public-web-conversation";

export async function resolvePublicWebConversationWithDb(
  input: ResolvePublicWebConversationInput,
): Promise<ResolvePublicWebConversationResult> {
  return resolvePublicWebConversation(input, makeDefaultPublicWebConversationDeps());
}

export function makeDefaultPublicWebConversationDeps(): PublicWebConversationDeps {
  return {
    now: () => new Date(),
    async findConversationById(id) {
      const [row] = await db
        .select({
          id: agentConversations.id,
          agentId: agentConversations.agentId,
          orgId: agentConversations.orgId,
          anonymousSessionId: agentConversations.anonymousSessionId,
          status: agentConversations.status,
          lastTurnAt: agentConversations.lastTurnAt,
        })
        .from(agentConversations)
        .where(eq(agentConversations.id, id))
        .limit(1);
      return row ?? null;
    },
    async findLatestActiveConversation(input) {
      const [row] = await db
        .select({
          id: agentConversations.id,
          agentId: agentConversations.agentId,
          orgId: agentConversations.orgId,
          anonymousSessionId: agentConversations.anonymousSessionId,
          status: agentConversations.status,
          lastTurnAt: agentConversations.lastTurnAt,
        })
        .from(agentConversations)
        .where(
          and(
            eq(agentConversations.agentId, input.agentId),
            eq(agentConversations.orgId, input.orgId),
            eq(agentConversations.anonymousSessionId, input.anonymousSessionId),
            eq(agentConversations.status, input.status),
          ),
        )
        .orderBy(desc(agentConversations.lastTurnAt))
        .limit(1);
      return row ?? null;
    },
    async createConversation(input) {
      const [agentForVersion] = await db
        .select({ currentVersion: agents.currentVersion })
        .from(agents)
        .where(eq(agents.id, input.agentId))
        .limit(1);
      const [created] = await db
        .insert(agentConversations)
        .values({
          agentId: input.agentId,
          agentVersion: agentForVersion?.currentVersion ?? 1,
          orgId: input.orgId,
          anonymousSessionId: input.anonymousSessionId,
          channelMeta: input.channelMeta,
          status: input.status,
        })
        .returning({ id: agentConversations.id });
      return created?.id ?? null;
    },
    async markConversationAbandoned(conversationId, endedAt) {
      await db
        .update(agentConversations)
        .set({ status: "abandoned", endedAt })
        .where(eq(agentConversations.id, conversationId));
    },
  };
}
