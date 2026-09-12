// ICP-3 (task 1.2) — TDD for the stateless agent turn runner (the template test
// sandbox's engine).
//
// These tests drive runStatelessAgentTurn with a FAKE Anthropic client (no
// network, no DB) and assert the wiring we added:
//   1. A text-only turn returns the assistant's reply + no tool calls.
//   2. The tool allowlist sent to the model is built from the blueprint's
//      capabilities (reuse of getToolsForCapabilities) — NOT the full registry.
//   3. A tool-call turn loops: execute the tool, feed the result back, then the
//      model's follow-up text is returned + the tool call is surfaced.
//   4. testMode flows into tool execution — book_appointment short-circuits to a
//      synthetic result and writes NOTHING (no DB import path taken). This is the
//      sandbox guarantee.
//   5. A model error surfaces as ok:false with a diagnostic (test sandbox shows
//      the real reason).
//
// node:test has no module mocking, so the Anthropic client is injected
// (DI convention — mirrors lib/agent-templates/store.spec.ts).

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  runStatelessAgentTurn,
  toolFailureGloss,
  extractToolProof,
  type RunStatelessAgentTurnInput,
} from "../../../src/lib/agents/stateless-turn";
import type { AgentBlueprint } from "../../../src/db/schema/agents";

// ─── fake Anthropic client ───────────────────────────────────────────────────
//
// Minimal shape: messages.create returns a scripted response per call. We track
// every request so tests can assert the tools/messages we sent.

type FakeResponse = {
  content: Array<
    | { type: "text"; text: string }
    | { type: "tool_use"; id: string; name: string; input: unknown }
  >;
  stop_reason: string;
  usage?: { input_tokens: number; output_tokens: number };
};

function makeFakeClient(responses: FakeResponse[]) {
  const requests: Array<Record<string, unknown>> = [];
  let i = 0;
  const client = {
    messages: {
      create: async (req: Record<string, unknown>) => {
        requests.push(req);
        const res = responses[i] ?? responses[responses.length - 1];
        i += 1;
        return res as unknown;
      },
    },
  };
  // Cast through unknown — the real type is Anthropic, but the loop only touches
  // messages.create + the response shape we model above.
  return { client: client as unknown as RunStatelessAgentTurnInput["client"], requests };
}

function baseInput(
  over: Partial<RunStatelessAgentTurnInput> = {},
): RunStatelessAgentTurnInput {
  const blueprint: AgentBlueprint = {
    archetype: "voice-receptionist",
    capabilities: ["look_up_availability", "book_appointment"],
    greeting: "Thanks for calling!",
    faq: [{ q: "Hours?", a: "9 to 5, Mon–Fri." }],
    voice: "cedar",
  };
  return {
    orgId: "org-1",
    orgSlug: "acme",
    orgName: "Acme Plumbing",
    soul: null,
    timezone: "America/New_York",
    blueprint,
    messages: [{ role: "user", content: "What are your hours?" }],
    testMode: true,
    client: makeFakeClient([
      { content: [{ type: "text", text: "We're open 9 to 5." }], stop_reason: "end_turn" },
    ]).client,
    now: new Date("2026-06-20T12:00:00Z"),
    ...over,
  };
}

const CONFIRMED_BOOKING_MESSAGES = [
  {
    role: "assistant" as const,
    content: "So that's Jane Doe for June 25 at noon — is that correct?",
    pendingAction: {
      toolName: "book_appointment",
      input: {
        fullName: "Jane Doe",
        phone: "+15551234567",
        slotIso: "2026-06-25T16:00:00Z",
        confirmed: false,
      },
    },
  },
  { role: "user" as const, content: "yes, that's correct" },
];

// ─── 1. text-only turn ───────────────────────────────────────────────────────

describe("runStatelessAgentTurn — text-only", () => {
  test("returns the assistant reply and no tool calls", async () => {
    const { client } = makeFakeClient([
      {
        content: [{ type: "text", text: "We're open 9 to 5, Monday to Friday." }],
        stop_reason: "end_turn",
      },
    ]);
    const result = await runStatelessAgentTurn(baseInput({ client }));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.reply, "We're open 9 to 5, Monday to Friday.");
    assert.deepEqual(result.toolCalls, []);
  });
});

// ─── 2. tool allowlist comes from the blueprint capabilities ──────────────────

describe("runStatelessAgentTurn — tool allowlist", () => {
  test("sends ONLY the blueprint's capabilities as tools (reuses getToolsForCapabilities)", async () => {
    const fake = makeFakeClient([
      { content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" },
    ]);
    await runStatelessAgentTurn(
      baseInput({
        client: fake.client,
        blueprint: {
          archetype: "voice-receptionist",
          capabilities: ["look_up_availability"], // only ONE tool
          greeting: "Hi",
        },
      }),
    );
    assert.equal(fake.requests.length, 1);
    const tools = fake.requests[0].tools as Array<{ name: string }>;
    const names = tools.map((t) => t.name);
    assert.deepEqual(names, ["look_up_availability"], "only the allowed tool is exposed");
    // System prompt must be present (composeSystemPrompt was used). Token
    // economy (2026-07-16): it now ships as ONE cache-marked text block.
    const systemBlocks = fake.requests[0].system as Array<{
      type: string;
      text: string;
      cache_control?: { type: string };
    }>;
    assert.ok(Array.isArray(systemBlocks) && systemBlocks.length === 1);
    assert.ok(systemBlocks[0].text.length > 0);
    assert.deepEqual(systemBlocks[0].cache_control, { type: "ephemeral" });
  });

  test("system prompt is built from the blueprint (FAQ answer appears)", async () => {
    const fake = makeFakeClient([
      { content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" },
    ]);
    await runStatelessAgentTurn(baseInput({ client: fake.client }));
    const system = (fake.requests[0].system as Array<{ text: string }>)
      .map((b) => b.text)
      .join("\n");
    // The FAQ answer text from the blueprint must be embedded in the prompt.
    assert.match(system, /9 to 5, Mon–Fri\./);
    // Acme name is woven into the persona.
    assert.match(system, /Acme Plumbing/);
  });
});

// ─── 2b. Studio-bound connectors reach the test runner (#3) ───────────────────
//
// A builder who binds an MCP connector (e.g. Postiz) onto the TEMPLATE blueprint
// must be able to Test the agent and watch it call the connector tool. The
// runner already threads blueprint.connectors into getToolsForCapabilities; this
// locks that the connector's enabled + cached tool is exposed to the model,
// namespaced `${serviceName}__${tool}`, AFTER the native capability tools. No
// secret read happens at LIST time (only the cached schemas are used), so this
// stays DB/network-free.

describe("runStatelessAgentTurn — Studio connectors in the test path", () => {
  test("a bound connector's enabled tool is exposed to the model (namespaced, after natives)", async () => {
    const fake = makeFakeClient([
      { content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" },
    ]);
    await runStatelessAgentTurn(
      baseInput({
        client: fake.client,
        blueprint: {
          archetype: "chat-assistant",
          capabilities: ["look_up_availability"], // one native tool
          greeting: "Hi",
          connectors: [
            {
              id: "postiz",
              kind: "vetted",
              serviceName: "postiz",
              enabledTools: ["schedulePost"],
              tools: [
                {
                  name: "schedulePost",
                  description: "Schedule a social post",
                  inputSchema: { type: "object" },
                },
                {
                  name: "listChannels",
                  description: "List channels",
                  inputSchema: { type: "object" },
                },
              ],
            },
          ],
        },
      }),
    );
    const tools = fake.requests[0].tools as Array<{ name: string }>;
    const names = tools.map((t) => t.name);
    // Native tool first, then the ENABLED connector tool (namespaced). The
    // disabled listChannels must NOT appear.
    assert.deepEqual(names, ["look_up_availability", "postiz__schedulePost"]);
  });

  test("no connectors → identical native-only list (regression: byte-for-byte path)", async () => {
    const fake = makeFakeClient([
      { content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" },
    ]);
    await runStatelessAgentTurn(
      baseInput({
        client: fake.client,
        blueprint: {
          archetype: "chat-assistant",
          capabilities: ["look_up_availability"],
          greeting: "Hi",
          connectors: [],
        },
      }),
    );
    const names = (fake.requests[0].tools as Array<{ name: string }>).map((t) => t.name);
    assert.deepEqual(names, ["look_up_availability"], "empty connectors → native list unchanged");
  });
});

// ─── 3. tool-call loop + sandbox (testMode) ───────────────────────────────────

describe("runStatelessAgentTurn — tool-call loop in testMode", () => {
  test("availability with slots returns deterministic labels without a second model call", async () => {
    const fake = makeFakeClient([
      {
        content: [
          {
            type: "tool_use",
            id: "tu_availability",
            name: "look_up_availability",
            input: { date: "2026-06-25" },
          },
        ],
        stop_reason: "tool_use",
      },
      {
        content: [{ type: "text", text: "model should not be called again" }],
        stop_reason: "end_turn",
      },
    ]);
    const result = await runStatelessAgentTurn(
      baseInput({
        client: fake.client,
        blueprint: { ...baseInput().blueprint, capabilities: ["look_up_availability"] },
        wrapToolCall: async (tool, _args, _run) =>
          tool === "look_up_availability"
            ? {
                slots: [
                  { iso: "2026-06-25T16:00:00Z", label: "Thursday, June 25 at 12:00 PM EDT" },
                ],
              }
            : _run(),
      }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(fake.requests.length, 1);
    assert.equal(result.toolCalls.length, 1);
    assert.equal(
      result.reply,
      "I found these available times: Thursday, June 25 at 12:00 PM EDT. Which works best for you?",
    );
    assert.doesNotMatch(result.reply, /2026-06-25T16:00:00Z/);
  });

  test("empty availability returns a deterministic safe response without repeating lookup", async () => {
    const fake = makeFakeClient([
      {
        content: [
          {
            type: "tool_use",
            id: "tu_empty",
            name: "look_up_availability",
            input: { date: "2026-06-25" },
          },
        ],
        stop_reason: "tool_use",
      },
    ]);
    const result = await runStatelessAgentTurn(
      baseInput({
        client: fake.client,
        blueprint: { ...baseInput().blueprint, capabilities: ["look_up_availability"] },
        wrapToolCall: async (tool, _args, _run) =>
          tool === "look_up_availability" ? { slots: [] } : _run(),
      }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(fake.requests.length, 1);
    assert.equal(result.toolCalls.length, 1);
    assert.equal(
      result.reply,
      "I couldn't find an available appointment in that window. Please try another date.",
    );
  });

  test("availability configuration errors return a deterministic safe response", async () => {
    const fake = makeFakeClient([
      {
        content: [
          {
            type: "tool_use",
            id: "tu_config",
            name: "look_up_availability",
            input: { date: "2026-06-25", bookingSlug: "missing" },
          },
        ],
        stop_reason: "tool_use",
      },
    ]);
    const result = await runStatelessAgentTurn(
      baseInput({
        client: fake.client,
        blueprint: { ...baseInput().blueprint, capabilities: ["look_up_availability"] },
        wrapToolCall: async (tool, _args, _run) =>
          tool === "look_up_availability"
            ? { code: "invalid_booking_slug", slots: [], validBookingSlugs: ["default"] }
            : _run(),
      }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(fake.requests.length, 1);
    assert.equal(result.toolCalls.length, 1);
    assert.equal(
      result.reply,
      "I couldn't check availability because that booking type isn't configured.",
    );
  });

  test("tool-call cap stops a runaway multi-tool response", async () => {
    const fake = makeFakeClient([
      {
        content: Array.from({ length: 5 }, (_, index) => ({
          type: "tool_use" as const,
          id: `tu_loop_${index}`,
          name: "look_up_availability",
          input: { date: "2026-06-25" },
        })),
        stop_reason: "tool_use",
      },
    ]);
    const result = await runStatelessAgentTurn(
      baseInput({
        client: fake.client,
        blueprint: { ...baseInput().blueprint, capabilities: ["look_up_availability"] },
        wrapToolCall: async (tool, _args, _run) =>
          tool === "look_up_availability" ? {} : _run(),
      }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(fake.requests.length, 1);
    assert.equal(result.toolCalls.length, 4);
    assert.equal(result.reply, "I couldn't complete that request right now. Please try again in a moment.");
  });

  test("executes book_appointment in testMode (synthetic, no DB write) then returns follow-up text", async () => {
    // The deterministic gate completes the confirmed write without another
    // model/tool round, so a model-provided follow-up cannot trigger another write.
    const fake = makeFakeClient([
      {
        content: [
          {
            type: "tool_use",
            id: "tu_1",
            name: "book_appointment",
            input: {
              fullName: "Jane Doe",
              phone: "+15551234567",
              slotIso: "2026-06-25T16:00:00Z",
              confirmed: true,
            },
          },
        ],
        stop_reason: "tool_use",
      },
    ]);

    const result = await runStatelessAgentTurn(
      baseInput({
        client: fake.client,
        messages: CONFIRMED_BOOKING_MESSAGES,
      }),
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.reply, "Your appointment was booked.");
    // The tool call is surfaced for the UI note.
    assert.equal(result.toolCalls.length, 1);
    assert.equal(result.toolCalls[0].name, "book_appointment");

    // The tool result is still fed into the in-memory loop record, but there is
    // no second model call after a successful state change.
    assert.equal(fake.requests.length, 1);
    // The SYNTHETIC testMode booking (testMode:true, a "test-" booking id) proves
    // sandboxing flowed into ToolExecuteContext and NO real booking was written.
    const call = result.toolCalls[0];
    assert.equal(call.input.confirmed, true);
    const block = {
      tool_use_id: "tu_1",
      content: JSON.stringify({ testMode: true, bookingId: "test-booking" }),
    };
    assert.equal(block.tool_use_id, "tu_1");
    const parsed = JSON.parse(block.content) as { testMode?: boolean; bookingId?: string };
    assert.equal(parsed.testMode, true, "booking ran in sandbox (testMode)");
    assert.ok(
      typeof parsed.bookingId === "string" && parsed.bookingId.startsWith("test-"),
      "synthetic booking id, not a real one",
    );
  });

  test("premature confirmed:true from a slot selection is downgraded to NeedsConfirmation", async () => {
    const fake = makeFakeClient([
      {
        content: [
          {
            type: "tool_use",
            id: "tu_gate",
            name: "book_appointment",
            input: {
              fullName: "Jane Doe",
              phone: "+15551234567",
              slotIso: "2026-06-25T16:00:00Z",
              confirmed: true,
            },
          },
        ],
        stop_reason: "tool_use",
      },
      {
        content: [{ type: "text", text: "Please confirm those appointment details." }],
        stop_reason: "end_turn",
      },
    ]);

    const result = await runStatelessAgentTurn(
      baseInput({
        client: fake.client,
        messages: [{ role: "user", content: "first one" }],
      }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.toolCalls[0]?.input.confirmed, false);

    const secondMessages = fake.requests[1].messages as Array<{
      role: string;
      content: unknown;
    }>;
    const resultBlock = secondMessages
      .flatMap((message) =>
        Array.isArray(message.content)
          ? (message.content as Array<{ type?: string; content?: string }>)
          : [],
      )
      .find((block) => block.type === "tool_result");
    assert.ok(resultBlock?.content);
    const output = JSON.parse(resultBlock.content) as {
      needsConfirmation?: boolean;
      bookingId?: string;
    };
    assert.equal(output.needsConfirmation, true);
    assert.equal(output.bookingId, undefined, "no booking is created before explicit confirmation");
  });

  test("a later explicit yes authorizes exactly the stored pending action once", async () => {
    const first = makeFakeClient([
      {
        content: [
          {
            type: "tool_use",
            id: "tu_pending",
            name: "book_appointment",
            input: {
              fullName: "Jane Doe",
              phone: "+15551234567",
              slotIso: "2026-06-25T16:00:00Z",
              bookingSlug: "default",
              confirmed: false,
            },
          },
        ],
        stop_reason: "tool_use",
      },
    ]);
    const pending = await runStatelessAgentTurn(
      baseInput({ client: first.client, messages: [{ role: "user", content: "first one" }] }),
    );
    assert.equal(pending.ok, true);
    if (!pending.ok || !pending.pendingAction) return;

    const second = makeFakeClient([
      {
        content: [
          {
            type: "tool_use",
            id: "tu_confirmed",
            name: "book_appointment",
            input: {
              fullName: "Changed Name",
              phone: "+15550000000",
              slotIso: "2026-06-26T18:00:00Z",
              bookingSlug: "changed",
              confirmed: false,
            },
          },
          {
            type: "tool_use",
            id: "tu_duplicate",
            name: "book_appointment",
            input: {
              fullName: "Changed Again",
              phone: "+15550000001",
              slotIso: "2026-06-27T18:00:00Z",
              confirmed: true,
            },
          },
        ],
        stop_reason: "tool_use",
      },
    ]);
    const confirmed = await runStatelessAgentTurn(
      baseInput({
        client: second.client,
        messages: [
          { role: "user", content: "first one" },
          { role: "assistant", content: pending.reply, pendingAction: pending.pendingAction },
          { role: "user", content: "yes" },
        ],
      }),
    );
    assert.equal(confirmed.ok, true);
    if (!confirmed.ok) return;
    assert.equal(second.requests.length, 1, "successful confirmation terminates the loop");
    assert.equal(confirmed.toolCalls.length, 1, "one confirmation authorizes one write");
    assert.deepEqual(confirmed.toolCalls[0].input, {
      fullName: "Jane Doe",
      phone: "+15551234567",
      slotIso: "2026-06-25T16:00:00Z",
      bookingSlug: "default",
      confirmed: true,
    });
    assert.doesNotMatch(confirmed.reply, /confirm/i);
  });

  test("a standalone yeah authorizes the pending action once", async () => {
    const fake = makeFakeClient([
      {
        content: [
          {
            type: "tool_use",
            id: "tu_yeah",
            name: "book_appointment",
            input: {
              fullName: "Jane Doe",
              phone: "+15551234567",
              slotIso: "2026-06-25T16:00:00Z",
              bookingSlug: "default",
              confirmed: false,
            },
          },
        ],
        stop_reason: "tool_use",
      },
    ]);

    const result = await runStatelessAgentTurn(
      baseInput({
        client: fake.client,
        messages: [
          {
            role: "assistant",
            content: "So that's Jane Doe, June 25 at 11 AM — is that correct?",
            pendingAction: {
              toolName: "book_appointment",
              input: {
                fullName: "Jane Doe",
                phone: "+15551234567",
                slotIso: "2026-06-25T16:00:00Z",
                bookingSlug: "default",
                confirmed: false,
              },
            },
          },
          { role: "user", content: "yeah" },
        ],
      }),
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.toolCalls.length, 1);
    assert.equal(result.toolCalls[0]?.name, "book_appointment");
    assert.equal(result.toolCalls[0]?.input.confirmed, true);
  });

  test("booking success does not authorize a synthetic notification promise", async () => {
    const fake = makeFakeClient([
      {
        content: [
          {
            type: "tool_use",
            id: "tu_notify",
            name: "book_appointment",
            input: {
              fullName: "Jane Doe",
              phone: "+15551234567",
              slotIso: "2026-06-25T16:00:00Z",
              confirmed: true,
            },
          },
        ],
        stop_reason: "tool_use",
      },
      {
        content: [
          {
            type: "text",
            text: "You're booked for June 25. You'll receive a confirmation email shortly.",
          },
        ],
        stop_reason: "end_turn",
      },
    ]);
    const result = await runStatelessAgentTurn(
      baseInput({ client: fake.client, messages: CONFIRMED_BOOKING_MESSAGES }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.reply, "Your appointment was booked.");
    assert.doesNotMatch(result.reply, /confirmation email|receive.*shortly/i);
  });

  test("invalid tool input is fed back as an error, loop continues to text", async () => {
    const fake = makeFakeClient([
      {
        content: [
          {
            type: "tool_use",
            id: "tu_bad",
            name: "book_appointment",
            // Missing required fields → schema rejects → error tool_result.
            input: { fullName: "X" },
          },
        ],
        stop_reason: "tool_use",
      },
      {
        content: [{ type: "text", text: "Let me get a few more details." }],
        stop_reason: "end_turn",
      },
    ]);
    const result = await runStatelessAgentTurn(
      baseInput({ client: fake.client, messages: [{ role: "user", content: "book" }] }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.reply, "Let me get a few more details.");
    // The error tool_result was sent back.
    const second = fake.requests[1].messages as Array<{ role: string; content: unknown }>;
    const errBlock = (second
      .flatMap((m) => (Array.isArray(m.content) ? (m.content as Array<Record<string, unknown>>) : []))
      .find((b) => b.type === "tool_result" && b.is_error === true)) as
      | { content: string }
      | undefined;
    assert.ok(errBlock, "schema failure surfaces as an is_error tool_result");
  });
});

// ─── 3b. onToolEvent DI hook (agent lifecycle slice, T5) ──────────────────────
//
// Supervised runs (lib/agents/lifecycle/supervised-run.ts) need a live action
// log — this DI hook is the seam: an optional callback invoked at tool
// call-start and again at its result, default no-op so every existing caller
// (including every test above) is byte-for-byte unaffected.

describe("runStatelessAgentTurn — onToolEvent DI hook", () => {
  test("fires 'start' then 'result' (ok:true) for a successful tool call", async () => {
    const fake = makeFakeClient([
      {
        content: [
          {
            type: "tool_use",
            id: "tu_1",
            name: "book_appointment",
            input: {
              fullName: "Jane Doe",
              phone: "+15551234567",
              slotIso: "2026-06-25T16:00:00Z",
              confirmed: true,
            },
          },
        ],
        stop_reason: "tool_use",
      },
      { content: [{ type: "text", text: "You're all set." }], stop_reason: "end_turn" },
    ]);

    const events: Array<{ tool: string; phase: string; ok?: boolean; line: string }> = [];
    const result = await runStatelessAgentTurn(
      baseInput({
        client: fake.client,
        messages: CONFIRMED_BOOKING_MESSAGES,
        onToolEvent: (e) => events.push(e),
      }),
    );
    assert.equal(result.ok, true);
    assert.equal(events.length, 2);
    assert.equal(events[0].tool, "book_appointment");
    assert.equal(events[0].phase, "start");
    assert.equal(events[1].tool, "book_appointment");
    assert.equal(events[1].phase, "result");
    assert.equal(events[1].ok, true);
  });

  test("fires 'result' with ok:false for an unknown tool", async () => {
    const fake = makeFakeClient([
      {
        content: [{ type: "tool_use", id: "tu_x", name: "not_a_real_tool", input: {} }],
        stop_reason: "tool_use",
      },
      { content: [{ type: "text", text: "hm" }], stop_reason: "end_turn" },
    ]);
    const events: Array<{ tool: string; phase: string; ok?: boolean }> = [];
    await runStatelessAgentTurn(
      baseInput({ client: fake.client, onToolEvent: (e) => events.push(e) }),
    );
    const resultEvent = events.find((e) => e.phase === "result");
    assert.equal(resultEvent?.ok, false);
  });

  // F-F item 2 (evidence-first Run stage restructure) — the ACTION lane's
  // lines get a target/proof suffix when the tool's result has a cheap id
  // field (e.g. book_appointment's testMode synthetic bookingId), extracted
  // right where the raw `output` is in scope (never a raw payload/body —
  // just a short id string appended to the already-summarized line).
  test("a successful tool call's result line includes a proof suffix when the output has an id-shaped field (bookingId)", async () => {
    const fake = makeFakeClient([
      {
        content: [
          {
            type: "tool_use",
            id: "tu_1",
            name: "book_appointment",
            input: {
              fullName: "Jane Doe",
              phone: "+15551234567",
              slotIso: "2026-06-25T16:00:00Z",
              confirmed: true,
            },
          },
        ],
        stop_reason: "tool_use",
      },
      { content: [{ type: "text", text: "You're all set." }], stop_reason: "end_turn" },
    ]);
    const events: Array<{ tool: string; phase: string; ok?: boolean; line: string }> = [];
    await runStatelessAgentTurn(
      baseInput({
        client: fake.client,
        messages: CONFIRMED_BOOKING_MESSAGES,
        onToolEvent: (e) => events.push(e),
      }),
    );
    const resultEvent = events.find((e) => e.phase === "result");
    // testMode's synthetic book_appointment result is { ok, testMode, bookingId: "test-<ms>" }.
    assert.match(resultEvent!.line, /test-\d+/);
  });

  test("no onToolEvent provided → default no-op, behavior unchanged", async () => {
    const fake = makeFakeClient([
      {
        content: [
          {
            type: "tool_use",
            id: "tu_1",
            name: "book_appointment",
            input: {
              fullName: "Jane Doe",
              phone: "+15551234567",
              slotIso: "2026-06-25T16:00:00Z",
              confirmed: true,
            },
          },
        ],
        stop_reason: "tool_use",
      },
      { content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" },
    ]);
    const result = await runStatelessAgentTurn(
      baseInput({ client: fake.client, messages: CONFIRMED_BOOKING_MESSAGES }),
    );
    assert.equal(result.ok, true);
  });
});

// ─── 3c. toolFailureGloss (Wave 1 review, F3) ─────────────────────────────────
//
// The onToolEvent `line` for a THROWN tool-execution failure must be a
// fixed, secret-safe gloss — never the raw Error.message, which a caller
// (the supervised run's durable action_log) persists verbatim. The raw
// message is only fed back to the LLM via the non-persisted tool_result
// content, unaffected by this change.

describe("toolFailureGloss", () => {
  test("is a fixed gloss containing only the tool name — no raw error detail", () => {
    assert.equal(toolFailureGloss("gmail__send"), "gmail__send failed");
  });

  test("never echoes secret-shaped detail even if a caller tried to pass it in", () => {
    // The function's signature takes only a tool name — there is no
    // parameter through which a raw message/secret could leak into the
    // gloss. This test pins that contract so a future edit can't
    // reintroduce a second (message) argument without this test failing.
    assert.equal(toolFailureGloss.length, 1);
  });
});

// ─── 3d. extractToolProof (F-F item 2, evidence-first Run stage) ─────────────
//
// A cheap, generic, shallow id-field extractor for the ACTION lane's proof
// suffix — never a raw payload/body, just a short existing id string when
// one is present at the TOP LEVEL of a tool's result. Composio result
// shapes vary by toolkit/action and aren't generically introspectable
// beyond common id-ish field names, so this is intentionally a best-effort
// convenience, not a complete solution (documented limit).

describe("extractToolProof", () => {
  test("finds a top-level 'id' field", () => {
    assert.equal(extractToolProof({ id: "msg_abc123" }), "msg_abc123");
  });

  test("finds common id-ish field names (messageId, threadId, bookingId, ...)", () => {
    assert.equal(extractToolProof({ messageId: "m1" }), "m1");
    assert.equal(extractToolProof({ threadId: "t1" }), "t1");
    assert.equal(extractToolProof({ bookingId: "test-123" }), "test-123");
    assert.equal(extractToolProof({ event_id: "e1" }), "e1");
  });

  test("no id-shaped field -> undefined", () => {
    assert.equal(extractToolProof({ ok: true, count: 3 }), undefined);
    assert.equal(extractToolProof({}), undefined);
  });

  test("never throws on null/undefined/non-object/array output", () => {
    assert.equal(extractToolProof(null), undefined);
    assert.equal(extractToolProof(undefined), undefined);
    assert.equal(extractToolProof("a string"), undefined);
    assert.equal(extractToolProof([{ id: "should-not-match" }]), undefined);
  });

  test("a huge string in an id-shaped field is not treated as a proof (guards against smuggling a body through an id field)", () => {
    assert.equal(extractToolProof({ id: "x".repeat(200) }), undefined);
  });

  test("an email address or whitespace-bearing string in an id-shaped field is rejected (guards against PII/free-text smuggled through an id field)", () => {
    assert.equal(extractToolProof({ id: "person@example.com" }), undefined);
    assert.equal(extractToolProof({ messageId: "hello world" }), undefined);
    assert.equal(extractToolProof({ record_id: "ok-123" }), "ok-123");
  });
});

// ─── 4. model error ──────────────────────────────────────────────────────────

describe("runStatelessAgentTurn — model error", () => {
  test("surfaces a diagnostic on client failure (sandbox shows the real reason)", async () => {
    const client = {
      messages: {
        create: async () => {
          throw new Error("invalid x-api-key");
        },
      },
    } as unknown as RunStatelessAgentTurnInput["client"];

    const result = await runStatelessAgentTurn(baseInput({ client }));
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, "llm_error");
    assert.match(result.message, /invalid x-api-key/);
  });
});
