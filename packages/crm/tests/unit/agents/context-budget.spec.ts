import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  boundPublicAgentMessages,
  estimatePublicAgentTokens,
  PUBLIC_AGENT_REQUEST_BUDGET_TOKENS,
  PUBLIC_AGENT_RETRY_MESSAGE,
} from "@/lib/agents/context-budget";
import type { TurnMessage } from "@/lib/agents/turn-messages";

const user = (content: string): TurnMessage => ({ role: "user", content });
const assistant = (content: string): TurnMessage => ({
  role: "assistant",
  content: [{ type: "text", text: content }],
});

describe("public agent context budget", () => {
  test("trims long history while keeping the latest request and booking details", () => {
    const messages: TurnMessage[] = [];
    for (let i = 0; i < 32; i++) {
      messages.push(user(`old conversation chatter ${i} ${"x".repeat(180)}`));
      messages.push(assistant(`old answer ${i} ${"y".repeat(180)}`));
    }
    messages.push(user("Name: QA\nPhone: 214-555-0144\nEmail: qa@example.com\nAddress: 1100 Main St"));
    messages.push(assistant("Selected slot: 2026-08-26T15:00:00.000Z, Wednesday at 10:00 AM CDT"));
    messages.push(user("Please confirm that appointment."));

    const bounded = boundPublicAgentMessages(messages, 1_600);
    assert.equal(bounded.trimmed, true);
    assert.ok(bounded.includedMessageCount < messages.length);
    assert.ok(bounded.estimatedTokensAfter <= 1_600);
    const text = JSON.stringify(bounded.messages);
    assert.match(text, /Please confirm that appointment/);
    assert.match(text, /qa@example.com/);
    assert.match(text, /2026-08-26T15:00:00.000Z/);
  });

  test("short conversations are returned unchanged and trimming is deterministic", () => {
    const messages = [user("What are your hours?"), assistant("Monday-Friday, 8 AM-6 PM.")];
    const first = boundPublicAgentMessages(messages, 1_600);
    const second = boundPublicAgentMessages(messages, 1_600);
    assert.equal(first.trimmed, false);
    assert.deepEqual(first.messages, messages);
    assert.deepEqual(second, first);
  });

  test("keeps the active availability tool exchange when trimming history", () => {
    const messages: TurnMessage[] = [];
    for (let i = 0; i < 24; i++) {
      messages.push(user(`old chatter ${i} ${"x".repeat(180)}`));
      messages.push(assistant(`old answer ${i} ${"y".repeat(180)}`));
    }
    messages.push(user("Name: QA Loop Final\nPhone: 214-555-0101\nEmail: qa@example.com"));
    messages.push({
      role: "assistant",
      content: [{
        type: "tool_use",
        id: "availability-1",
        name: "look_up_availability",
        input: { date: "2026-08-26" },
      }],
    });
    messages.push({
      role: "user",
      content: [{
        type: "tool_result",
        tool_use_id: "availability-1",
        content: JSON.stringify({
          slots: [{ iso: "2026-08-26T16:00:00.000Z", label: "Wednesday, August 26 at 11:00 AM CDT" }],
        }),
      }],
    });
    messages.push(user("Wednesday, August 26 at 11:00 AM CDT"));

    const bounded = boundPublicAgentMessages(messages, 1_600);
    const text = JSON.stringify(bounded.messages);
    assert.match(text, /availability-1/);
    assert.match(text, /2026-08-26T16:00:00\.000Z/);
    assert.match(text, /Wednesday, August 26 at 11:00 AM CDT/);
    assert.match(text, /QA Loop Final/);
  });

  test("bounded input remains below the configured request budget", () => {
    const messages = Array.from({ length: 40 }, (_, i) => user(`${i} ${"message ".repeat(100)}`));
    const bounded = boundPublicAgentMessages(messages, 2_000);
    assert.ok(bounded.estimatedTokensAfter <= 2_000);
    assert.ok(bounded.estimatedTokensAfter < PUBLIC_AGENT_REQUEST_BUDGET_TOKENS);
    assert.ok(estimatePublicAgentTokens(bounded.messages) <= 2_000);
  });

  test("rate-limit fallback is neutral and does not ask for known details or claim booking", () => {
    assert.doesNotMatch(PUBLIC_AGENT_RETRY_MESSAGE, /booked|email|phone|name/i);
    assert.match(PUBLIC_AGENT_RETRY_MESSAGE, /try again/i);
  });
});
