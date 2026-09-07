import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  PUBLIC_WEB_CONVERSATION_FRESHNESS_MS,
  resolvePublicWebConversation,
  type PublicWebConversationDeps,
  type PublicWebConversationRow,
} from "../../../src/lib/agents/public-web-conversation";

type StoredConversation = PublicWebConversationRow & {
  channelMeta: Record<string, unknown>;
  turnCount: number;
  endedAt?: Date;
};

function makeStore(now: Date, options: { failStaleCleanup?: boolean } = {}) {
  const rows = new Map<string, StoredConversation>();
  let next = 1;

  const deps: PublicWebConversationDeps = {
    now: () => now,
    async findConversationById(id) {
      return rows.get(id) ?? null;
    },
    async findLatestActiveConversation(input) {
      return (
        [...rows.values()]
          .filter(
            (row) =>
              row.agentId === input.agentId &&
              row.orgId === input.orgId &&
              row.anonymousSessionId === input.anonymousSessionId &&
              row.status === input.status,
          )
          .sort(
            (a, b) =>
              new Date(b.lastTurnAt).getTime() - new Date(a.lastTurnAt).getTime(),
          )[0] ?? null
      );
    },
    async createConversation(input) {
      const id = `conv-${next++}`;
      rows.set(id, {
        id,
        agentId: input.agentId,
        orgId: input.orgId,
        anonymousSessionId: input.anonymousSessionId,
        status: input.status,
        lastTurnAt: now,
        channelMeta: input.channelMeta,
        turnCount: 0,
      });
      return id;
    },
    async markConversationAbandoned(conversationId, endedAt) {
      if (options.failStaleCleanup) {
        throw new Error("cleanup unavailable");
      }
      const row = rows.get(conversationId);
      if (!row) return;
      row.status = "abandoned";
      row.endedAt = endedAt;
    },
  };

  return {
    rows,
    deps,
    add(overrides: Partial<StoredConversation> = {}) {
      const id = overrides.id ?? `conv-${next++}`;
      rows.set(id, {
        id,
        agentId: "agent-1",
        orgId: "org-1",
        anonymousSessionId: "anon-1",
        status: "active",
        lastTurnAt: now,
        channelMeta: {},
        turnCount: 0,
        ...overrides,
      });
      return rows.get(id)!;
    },
    recordTurn(id: string) {
      const row = rows.get(id);
      assert.ok(row, `missing conversation ${id}`);
      row.turnCount += 2;
      row.lastTurnAt = now;
    },
    activeRows() {
      return [...rows.values()].filter((row) => row.status === "active");
    },
  };
}

function baseInput(overrides: Partial<Parameters<typeof resolvePublicWebConversation>[0]> = {}) {
  return {
    suppliedConversationId: null,
    anonymousSessionId: "anon-1",
    agentId: "agent-1",
    orgId: "org-1",
    status: "active",
    channelMeta: { page_url: "https://example.test/" },
    ...overrides,
  };
}

describe("public website-chatbot conversation reuse", () => {
  test("first message creates a conversation", async () => {
    const store = makeStore(new Date("2026-08-25T12:00:00Z"));

    const resolved = await resolvePublicWebConversation(baseInput(), store.deps);

    assert.equal(resolved.created, true);
    assert.equal(resolved.conversationId, "conv-1");
    assert.equal(store.rows.size, 1);
    assert.equal(store.rows.get("conv-1")?.anonymousSessionId, "anon-1");
  });

  test("second message with returned conversation_id reuses the same row", async () => {
    const store = makeStore(new Date("2026-08-25T12:00:00Z"));
    store.add({ id: "conv-existing" });

    const resolved = await resolvePublicWebConversation(
      baseInput({ suppliedConversationId: "conv-existing" }),
      store.deps,
    );

    assert.equal(resolved.created, false);
    assert.equal(resolved.reusedFrom, "supplied");
    assert.equal(resolved.conversationId, "conv-existing");
    assert.equal(store.rows.size, 1);
  });

  test("reload request with same anonymous_session_id and no conversation_id reuses latest active row", async () => {
    const store = makeStore(new Date("2026-08-25T12:00:00Z"));
    store.add({ id: "older", lastTurnAt: new Date("2026-08-25T10:00:00Z") });
    store.add({ id: "latest", lastTurnAt: new Date("2026-08-25T11:00:00Z") });

    const resolved = await resolvePublicWebConversation(baseInput(), store.deps);

    assert.equal(resolved.created, false);
    assert.equal(resolved.reusedFrom, "anonymous_session");
    assert.equal(resolved.conversationId, "latest");
    assert.equal(store.activeRows().length, 2);
  });

  test("supplied conversation_id from another agent or org is rejected and not reused", async () => {
    const store = makeStore(new Date("2026-08-25T12:00:00Z"));
    store.add({ id: "other-agent", agentId: "agent-2" });

    const resolved = await resolvePublicWebConversation(
      baseInput({ suppliedConversationId: "other-agent" }),
      store.deps,
    );

    assert.equal(resolved.rejectedSuppliedReason, "wrong_scope");
    assert.equal(resolved.created, true);
    assert.notEqual(resolved.conversationId, "other-agent");
  });

  test("supplied conversation_id with mismatched anonymous_session_id is rejected and not reused", async () => {
    const store = makeStore(new Date("2026-08-25T12:00:00Z"));
    store.add({ id: "wrong-session", anonymousSessionId: "anon-other" });

    const resolved = await resolvePublicWebConversation(
      baseInput({ suppliedConversationId: "wrong-session" }),
      store.deps,
    );

    assert.equal(resolved.rejectedSuppliedReason, "anonymous_session_mismatch");
    assert.equal(resolved.created, true);
    assert.notEqual(resolved.conversationId, "wrong-session");
  });

  test("stale active conversation is not reused and is marked abandoned when superseded", async () => {
    const now = new Date("2026-08-25T12:00:00Z");
    const store = makeStore(now);
    const stale = store.add({
      id: "stale",
      lastTurnAt: new Date(now.getTime() - PUBLIC_WEB_CONVERSATION_FRESHNESS_MS - 1),
    });

    const resolved = await resolvePublicWebConversation(baseInput(), store.deps);

    assert.equal(resolved.created, true);
    assert.notEqual(resolved.conversationId, stale.id);
    assert.equal(resolved.abandonedStaleConversationId, stale.id);
    assert.equal(store.rows.get(stale.id)?.status, "abandoned");
    assert.equal(store.rows.get(stale.id)?.endedAt?.toISOString(), now.toISOString());
  });

  test("stale cleanup failure still does not reuse stale conversation", async () => {
    const now = new Date("2026-08-25T12:00:00Z");
    const store = makeStore(now, { failStaleCleanup: true });
    const stale = store.add({
      id: "stale",
      lastTurnAt: new Date(now.getTime() - PUBLIC_WEB_CONVERSATION_FRESHNESS_MS - 1),
    });
    const originalWarn = console.warn;
    const warnings: unknown[] = [];
    console.warn = (...args: unknown[]) => warnings.push(args);
    try {
      const resolved = await resolvePublicWebConversation(
        baseInput({ suppliedConversationId: stale.id }),
        store.deps,
      );

      assert.equal(resolved.rejectedSuppliedReason, "stale");
      assert.equal(resolved.created, true);
      assert.notEqual(resolved.conversationId, stale.id);
      assert.equal(store.rows.get(stale.id)?.status, "active");
      assert.ok(warnings.length >= 1);
    } finally {
      console.warn = originalWarn;
    }
  });

  test("optional stale cleanup failure does not authorize a foreign conversation", async () => {
    const now = new Date("2026-08-25T12:00:00Z");
    const store = makeStore(now, { failStaleCleanup: true });
    store.add({ id: "foreign", agentId: "agent-2" });

    const resolved = await resolvePublicWebConversation(
      baseInput({ suppliedConversationId: "foreign" }),
      store.deps,
    );

    assert.equal(resolved.rejectedSuppliedReason, "wrong_scope");
    assert.equal(resolved.created, true);
    assert.notEqual(resolved.conversationId, "foreign");
  });

  test("new conversation id remains stable across valid reload continuation", async () => {
    const store = makeStore(new Date("2026-08-25T12:00:00Z"));
    const first = await resolvePublicWebConversation(baseInput(), store.deps);
    const afterReload = await resolvePublicWebConversation(
      baseInput({ suppliedConversationId: null }),
      store.deps,
    );

    assert.equal(first.created, true);
    assert.equal(afterReload.created, false);
    assert.equal(afterReload.conversationId, first.conversationId);
  });

  test("turn_count continues increasing on the same reused conversation", async () => {
    const store = makeStore(new Date("2026-08-25T12:00:00Z"));
    const first = await resolvePublicWebConversation(baseInput(), store.deps);
    store.recordTurn(first.conversationId);

    const second = await resolvePublicWebConversation(
      baseInput({ suppliedConversationId: first.conversationId }),
      store.deps,
    );
    store.recordTurn(second.conversationId);

    assert.equal(second.conversationId, first.conversationId);
    assert.equal(store.rows.get(first.conversationId)?.turnCount, 4);
  });

  test("no duplicate active conversation is created in the reload case", async () => {
    const store = makeStore(new Date("2026-08-25T12:00:00Z"));

    const first = await resolvePublicWebConversation(baseInput(), store.deps);
    const afterReload = await resolvePublicWebConversation(baseInput(), store.deps);

    assert.equal(afterReload.conversationId, first.conversationId);
    assert.equal(store.activeRows().length, 1);
  });

  test("explicit new chat abandons the validated current conversation and creates one clean row", async () => {
    const now = new Date("2026-08-25T12:00:00Z");
    const store = makeStore(now);
    store.add({ id: "conv-existing", turnCount: 8 });

    const resolved = await resolvePublicWebConversation(
      baseInput({
        suppliedConversationId: "conv-existing",
        startNewConversation: true,
      }),
      store.deps,
    );

    assert.equal(resolved.created, true);
    assert.equal(resolved.reusedFrom, null);
    assert.notEqual(resolved.conversationId, "conv-existing");
    assert.equal(resolved.abandonedResetConversationId, "conv-existing");
    assert.equal(store.rows.get("conv-existing")?.status, "abandoned");
    assert.equal(store.activeRows().length, 1);
  });

  test("new chat never abandons a foreign or mismatched-session conversation", async () => {
    const store = makeStore(new Date("2026-08-25T12:00:00Z"));
    store.add({ id: "foreign", agentId: "agent-2" });
    store.add({ id: "wrong-session", anonymousSessionId: "anon-other" });

    const foreign = await resolvePublicWebConversation(
      baseInput({ suppliedConversationId: "foreign", startNewConversation: true }),
      store.deps,
    );
    assert.equal(foreign.rejectedSuppliedReason, "wrong_scope");
    assert.equal(store.rows.get("foreign")?.status, "active");

    const wrongSession = await resolvePublicWebConversation(
      baseInput({ suppliedConversationId: "wrong-session", startNewConversation: true }),
      store.deps,
    );
    assert.equal(wrongSession.rejectedSuppliedReason, "anonymous_session_mismatch");
    assert.equal(store.rows.get("wrong-session")?.status, "active");
  });
});
