import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  ensureDeterministicAssistantText,
  selectDeterministicFinalFallback,
} from "../../../src/lib/agents/fallbacks";
import { runValidators } from "../../../src/lib/agents/validators";
import type { AgentBlueprint } from "../../../src/db/schema/agents";

const BLUEPRINT = {
  capabilities: ["escalate_to_human"],
  pricingFacts: [],
  faq: [],
} as unknown as AgentBlueprint;

function criticalPasses(response: string, userMessage: string) {
  const { criticalFailed, results } = runValidators({
    response,
    userMessage,
    conversationContext: "",
    turnToolCalls: [],
    turnToolResults: [],
    recentSuccessfulTools: [],
    blueprint: BLUEPRINT,
    soul: { emergency_service: false },
  });
  return { criticalFailed, results };
}

describe("runtime final fallback", () => {
  test("blank model output becomes a non-empty generic fallback for ordinary requests", () => {
    const fallback = ensureDeterministicAssistantText("", [], "Can you help me with my AC?");

    assert.equal(fallback.trim().length > 0, true);
    assert.equal(fallback, selectDeterministicFinalFallback([], "Can you help me with my AC?"));
  });

  test("whitespace-only model output becomes a non-empty generic fallback for ordinary requests", () => {
    const fallback = ensureDeterministicAssistantText(" \n\t ", [], "Can you help me with my AC?");

    assert.equal(fallback.trim().length > 0, true);
    assert.equal(fallback, selectDeterministicFinalFallback([], "Can you help me with my AC?"));
  });

  test("unicode whitespace-only model output becomes a non-empty generic fallback for ordinary requests", () => {
    const fallback = ensureDeterministicAssistantText("\u00A0\u202F", [], "Can you help me with my AC?");

    assert.equal(fallback.trim().length > 0, true);
    assert.equal(fallback, selectDeterministicFinalFallback([], "Can you help me with my AC?"));
  });

  test("blank model output in a hazard turn becomes deterministic hazard guidance", () => {
    const fallback = ensureDeterministicAssistantText("", [], "I smell gas near my furnace.");

    assert.equal(
      fallback,
      "If you smell gas, leave the building immediately and contact emergency services or your gas utility from a safe location.",
    );
  });

  test("blank rejected assistant output still yields hazard guidance for a gas-smell emergency", () => {
    const fallback = ensureDeterministicAssistantText("", ["no_unbacked_operational_promises"], "I smell gas near my furnace. What should I do?");

    assert.equal(
      fallback,
      "If you smell gas, leave the building immediately and contact emergency services or your gas utility from a safe location.",
    );
  });

  test("hazard messages that mention a technician still yield hazard guidance", () => {
    const fallback = selectDeterministicFinalFallback(
      ["no_unbacked_operational_promises"],
      "I smell gas near my furnace. Please send a technician immediately.",
    );

    assert.equal(
      fallback,
      "If you smell gas, leave the building immediately and contact emergency services or your gas utility from a safe location.",
    );
  });

  test("CO alarm messages still yield hazard guidance", () => {
    const fallback = selectDeterministicFinalFallback([], "My CO alarm is going off.");

    assert.equal(
      fallback,
      "If you smell gas, leave the building immediately and contact emergency services or your gas utility from a safe location.",
    );
  });

  test("sparks messages still yield hazard guidance", () => {
    const fallback = selectDeterministicFinalFallback([], "There are sparks coming from the furnace.");

    assert.equal(
      fallback,
      "If you smell gas, leave the building immediately and contact emergency services or your gas utility from a safe location.",
    );
  });

  test("ordinary exhausted fallback stays non-empty", () => {
    const fallback = selectDeterministicFinalFallback(["no_unbacked_operational_promises"], "Can you help me book service?");

    assert.equal(fallback.trim().length > 0, true);
  });

  test("deterministic hazard fallback still passes the critical grounding policy", () => {
    const fallback = selectDeterministicFinalFallback([], "I smell gas near my furnace.");
    const out = criticalPasses(fallback, "I smell gas near my furnace.");

    assert.equal(out.criticalFailed, false);
    assert.ok(out.results.every((r) => r.passed));
  });
});
