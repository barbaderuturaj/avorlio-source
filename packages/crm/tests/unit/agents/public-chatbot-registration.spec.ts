import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { registerHvacCreateFullChatbotEmbed } from "../../../src/lib/agents/public-chatbot-registration";

describe("HVAC create-full public chatbot registration", () => {
  test("registers HVAC live chatbot with a valid agent id and embed URL", async () => {
    const calls: Array<{ orgId: string; agentId: string; embedUrl: string }> = [];

    const result = await registerHvacCreateFullChatbotEmbed({
      workspaceId: "org_hvac",
      personality: "hvac",
      chatbotStatus: "live",
      chatbotAgentId: "agent_123",
      chatbotEmbedUrl: "https://app.seldonframe.com/api/v1/public/agent/acme--default/embed.js",
      register: async (orgId, record) => {
        calls.push({ orgId, ...record });
      },
    });

    assert.deepEqual(result, { registered: true });
    assert.deepEqual(calls, [
      {
        orgId: "org_hvac",
        agentId: "agent_123",
        embedUrl: "https://app.seldonframe.com/api/v1/public/agent/acme--default/embed.js",
      },
    ]);
  });

  test("does not register HVAC chatbot unless publish status is live", async () => {
    let calls = 0;

    const result = await registerHvacCreateFullChatbotEmbed({
      workspaceId: "org_hvac",
      personality: "hvac",
      chatbotStatus: "draft",
      chatbotAgentId: "agent_123",
      chatbotEmbedUrl: "https://app.seldonframe.com/api/v1/public/agent/acme--default/embed.js",
      register: async () => {
        calls += 1;
      },
    });

    assert.deepEqual(result, { registered: false, reason: "not_live" });
    assert.equal(calls, 0);
  });

  test("does not register non-HVAC create-full chatbots", async () => {
    let calls = 0;

    const result = await registerHvacCreateFullChatbotEmbed({
      workspaceId: "org_general",
      personality: "general",
      chatbotStatus: "live",
      chatbotAgentId: "agent_123",
      chatbotEmbedUrl: "https://app.seldonframe.com/api/v1/public/agent/acme--default/embed.js",
      register: async () => {
        calls += 1;
      },
    });

    assert.deepEqual(result, { registered: false, reason: "non_hvac" });
    assert.equal(calls, 0);
  });

  test("does not register without a valid agent id and embed URL", async () => {
    let calls = 0;

    const missingAgent = await registerHvacCreateFullChatbotEmbed({
      workspaceId: "org_hvac",
      personality: "hvac",
      chatbotStatus: "live",
      chatbotAgentId: " ",
      chatbotEmbedUrl: "https://app.seldonframe.com/api/v1/public/agent/acme--default/embed.js",
      register: async () => {
        calls += 1;
      },
    });

    const missingEmbed = await registerHvacCreateFullChatbotEmbed({
      workspaceId: "org_hvac",
      personality: "hvac",
      chatbotStatus: "live",
      chatbotAgentId: "agent_123",
      chatbotEmbedUrl: "",
      register: async () => {
        calls += 1;
      },
    });

    assert.deepEqual(missingAgent, { registered: false, reason: "missing_agent_id" });
    assert.deepEqual(missingEmbed, { registered: false, reason: "missing_embed_url" });
    assert.equal(calls, 0);
  });

  test("registration persistence failure remains fail-soft", async () => {
    let observedError: unknown = null;

    const result = await registerHvacCreateFullChatbotEmbed({
      workspaceId: "org_hvac",
      personality: "hvac",
      chatbotStatus: "live",
      chatbotAgentId: "agent_123",
      chatbotEmbedUrl: "https://app.seldonframe.com/api/v1/public/agent/acme--default/embed.js",
      register: async () => {
        throw new Error("simulated settings write failure");
      },
      onRegistrationError: (error) => {
        observedError = error;
      },
    });

    assert.deepEqual(result, { registered: false, reason: "failed" });
    assert.ok(observedError instanceof Error);
    assert.equal(observedError.message, "simulated settings write failure");
  });
});
