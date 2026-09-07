import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { join } from "node:path";

const embedRoutePath = [
  join(process.cwd(), "src/app/api/v1/public/agent/[slug]/embed.js/route.ts"),
  join(process.cwd(), "packages/crm/src/app/api/v1/public/agent/[slug]/embed.js/route.ts"),
].find((candidate) => existsSync(candidate));
const dbAdapterPath = [
  join(process.cwd(), "src/lib/agents/public-web-conversation-db.ts"),
  join(process.cwd(), "packages/crm/src/lib/agents/public-web-conversation-db.ts"),
].find((candidate) => existsSync(candidate));

assert.ok(embedRoutePath, "could not locate public agent embed route");
assert.ok(dbAdapterPath, "could not locate public web conversation DB adapter");

describe("public agent embed conversation storage", () => {
  test("stores conversation_id alongside anonymous session id", () => {
    const source = readFileSync(embedRoutePath, "utf8");

    assert.match(source, /var CONVERSATION_KEY = SESSION_KEY \+ "_conversation"/);
    assert.match(source, /localStorage\.getItem\(CONVERSATION_KEY\)/);
    assert.match(source, /function persistConversationId\(id\)/);
    assert.match(source, /localStorage\.setItem\(CONVERSATION_KEY, id\)/);
    assert.match(source, /conversation_id: conversationId/);
  });

  test("updates stored conversation_id from JSON and streaming responses", () => {
    const source = readFileSync(embedRoutePath, "utf8");

    const persistCalls = source.match(/persistConversationId\(json\.conversation_id\)|persistConversationId\(data\.conversation_id\)/g) ?? [];
    assert.ok(
      persistCalls.length >= 3,
      `expected JSON start/done response paths to persist conversation ids, got ${persistCalls.length}`,
    );
  });

  test("looks up the requested agent slug inside the requested organization", () => {
    const source = readFileSync(embedRoutePath, "utf8");

    assert.match(source, /import \{ and, eq \} from "drizzle-orm"/);
    assert.match(source, /eq\(organizations\.slug, orgSlugPart\)/);
    assert.match(source, /eq\(agents\.slug, agentSlugPart\)/);

    // Regression: querying only by organization + LIMIT 1 can select an
    // unrelated draft agent and incorrectly return the no-op embed script.
    assert.doesNotMatch(
      source,
      /\.where\(eq\(organizations\.slug, orgSlugPart\)\)\s*\.limit\(1\)/,
    );
  });

  test("refresh continuity is visible and an explicit new chat is server-bound", () => {
    const source = readFileSync(embedRoutePath, "utf8");

    assert.match(source, /Continuing your recent chat/);
    assert.match(source, /aria-label="Start a new chat"/);
    assert.match(source, /startNewConversation = true/);
    assert.match(source, /start_new_conversation: startNewConversation/);
    assert.doesNotMatch(source, /localStorage\.clear\s*\(/);
    assert.doesNotMatch(source, /localStorage\.removeItem\s*\(SESSION_KEY\)/);
  });
});

describe("public web conversation DB adapter", () => {
  test("does not require neon-http-incompatible transactions or advisory locks", () => {
    const source = readFileSync(dbAdapterPath, "utf8");

    assert.doesNotMatch(source, /\.transaction\s*\(/);
    assert.doesNotMatch(source, /pg_advisory/i);
    assert.doesNotMatch(source, /hashtextextended/i);
  });
});
