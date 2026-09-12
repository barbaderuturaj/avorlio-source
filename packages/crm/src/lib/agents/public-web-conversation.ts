export const PUBLIC_WEB_CONVERSATION_FRESHNESS_MS = 24 * 60 * 60 * 1000;

export type PublicWebConversationRow = {
  id: string;
  agentId: string;
  orgId: string;
  anonymousSessionId: string | null;
  status: string;
  lastTurnAt: Date | string;
};

export type ResolvePublicWebConversationInput = {
  suppliedConversationId?: string | null;
  anonymousSessionId?: string | null;
  agentId: string;
  orgId: string;
  status: string;
  channelMeta: Record<string, unknown>;
  startNewConversation?: boolean;
};

export type ResolvePublicWebConversationResult = {
  conversationId: string;
  created: boolean;
  reusedFrom: "supplied" | "anonymous_session" | null;
  rejectedSuppliedReason?: "not_found" | "wrong_scope" | "anonymous_session_mismatch" | "wrong_status" | "stale";
  abandonedStaleConversationId?: string;
  abandonedResetConversationId?: string;
};

export type PublicWebConversationDeps = {
  now: () => Date;
  findConversationById: (id: string) => Promise<PublicWebConversationRow | null>;
  findLatestActiveConversation: (input: {
    agentId: string;
    orgId: string;
    anonymousSessionId: string;
    status: string;
  }) => Promise<PublicWebConversationRow | null>;
  createConversation: (input: {
    agentId: string;
    orgId: string;
    anonymousSessionId: string | null;
    status: string;
    channelMeta: Record<string, unknown>;
  }) => Promise<string | null>;
  markConversationAbandoned: (conversationId: string, endedAt: Date) => Promise<void>;
};

export function isFreshPublicWebConversation(
  row: Pick<PublicWebConversationRow, "lastTurnAt">,
  now: Date,
): boolean {
  const lastTurnAt = row.lastTurnAt instanceof Date ? row.lastTurnAt : new Date(row.lastTurnAt);
  if (Number.isNaN(lastTurnAt.getTime())) return false;
  return now.getTime() - lastTurnAt.getTime() <= PUBLIC_WEB_CONVERSATION_FRESHNESS_MS;
}

export async function resolvePublicWebConversation(
  input: ResolvePublicWebConversationInput,
  deps: PublicWebConversationDeps,
): Promise<ResolvePublicWebConversationResult> {
  const now = deps.now();
  const suppliedConversationId = cleanId(input.suppliedConversationId);
  const anonymousSessionId = cleanId(input.anonymousSessionId);

  let rejectedSuppliedReason: ResolvePublicWebConversationResult["rejectedSuppliedReason"];

  if (input.startNewConversation === true) {
    let abandonedResetConversationId: string | undefined;
    if (suppliedConversationId && anonymousSessionId) {
      const supplied = await deps.findConversationById(suppliedConversationId);
      if (!supplied) {
        rejectedSuppliedReason = "not_found";
      } else if (supplied.agentId !== input.agentId || supplied.orgId !== input.orgId) {
        rejectedSuppliedReason = "wrong_scope";
      } else if (supplied.anonymousSessionId !== anonymousSessionId) {
        rejectedSuppliedReason = "anonymous_session_mismatch";
      } else if (supplied.status !== input.status) {
        rejectedSuppliedReason = "wrong_status";
      } else {
        await safelyMarkConversationAbandoned(deps, supplied.id, now);
        abandonedResetConversationId = supplied.id;
      }
    }

    const createdId = await deps.createConversation({
      agentId: input.agentId,
      orgId: input.orgId,
      anonymousSessionId,
      status: input.status,
      channelMeta: input.channelMeta,
    });
    if (!createdId) throw new Error("conversation_create_failed");
    return {
      conversationId: createdId,
      created: true,
      reusedFrom: null,
      rejectedSuppliedReason,
      abandonedResetConversationId,
    };
  }

  if (suppliedConversationId) {
    const supplied = await deps.findConversationById(suppliedConversationId);
    if (!supplied) {
      rejectedSuppliedReason = "not_found";
    } else if (supplied.agentId !== input.agentId || supplied.orgId !== input.orgId) {
      rejectedSuppliedReason = "wrong_scope";
    } else if (anonymousSessionId && supplied.anonymousSessionId !== anonymousSessionId) {
      rejectedSuppliedReason = "anonymous_session_mismatch";
    } else if (supplied.status !== input.status) {
      rejectedSuppliedReason = "wrong_status";
    } else if (!isFreshPublicWebConversation(supplied, now)) {
      rejectedSuppliedReason = "stale";
      await safelyMarkConversationAbandoned(deps, supplied.id, now);
    } else {
      return {
        conversationId: supplied.id,
        created: false,
        reusedFrom: "supplied",
      };
    }
  }

  let abandonedStaleConversationId: string | undefined;
  if (anonymousSessionId) {
    const latest = await deps.findLatestActiveConversation({
      agentId: input.agentId,
      orgId: input.orgId,
      anonymousSessionId,
      status: input.status,
    });
    if (latest) {
      if (isFreshPublicWebConversation(latest, now)) {
        return {
          conversationId: latest.id,
          created: false,
          reusedFrom: "anonymous_session",
          rejectedSuppliedReason,
        };
      }
      abandonedStaleConversationId = latest.id;
      await safelyMarkConversationAbandoned(deps, latest.id, now);
    }
  }

  const createdId = await deps.createConversation({
    agentId: input.agentId,
    orgId: input.orgId,
    anonymousSessionId,
    status: input.status,
    channelMeta: input.channelMeta,
  });
  if (!createdId) {
    throw new Error("conversation_create_failed");
  }

  return {
    conversationId: createdId,
    created: true,
    reusedFrom: null,
    rejectedSuppliedReason,
    abandonedStaleConversationId,
  };
}

function cleanId(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function safelyMarkConversationAbandoned(
  deps: PublicWebConversationDeps,
  conversationId: string,
  endedAt: Date,
): Promise<void> {
  try {
    await deps.markConversationAbandoned(conversationId, endedAt);
  } catch (err) {
    console.warn("public_agent_stale_conversation_cleanup_failed", {
      conversationId,
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}
