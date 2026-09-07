import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { composeSystemPrompt } from "../../../src/lib/agents/prompt";
import type { AgentBlueprint } from "../../../src/db/schema/agents";

async function promptFor(blueprint: AgentBlueprint): Promise<string> {
  return composeSystemPrompt({
    orgName: "Grounded Services",
    soul: null,
    blueprint,
    archetype: "website-chatbot",
  });
}

describe("composeSystemPrompt shared factual truth boundaries", () => {
  test("without pricing facts explicitly forbids numeric/range/free-estimate claims", async () => {
    const prompt = await promptFor({ capabilities: [], pricingFacts: [] });
    assert.match(prompt, /no authoritative pricing facts are configured/i);
    assert.match(prompt, /never provide a numeric price, price range, fee, discount/i);
    assert.match(prompt, /claim that an estimate, quote, or consultation is free/i);
    assert.match(prompt, /pricing depends on the scope/i);
  });

  test("configured pricing facts remain available but do not authorize unlisted claims", async () => {
    const prompt = await promptFor({
      capabilities: [],
      pricingFacts: [{ label: "Diagnostic", amount: 89, currency: "USD" }],
    });
    assert.match(prompt, /Diagnostic: \$89/);
    assert.match(prompt, /ONLY prices you may quote/i);
    assert.match(prompt, /Do not infer or invent another number, range, fee/i);
  });

  test("handoffs and successful bookings do not imply timing or notification delivery", async () => {
    const prompt = await promptFor({ capabilities: [] });
    assert.match(prompt, /handoff or escalation only proves/i);
    assert.match(prompt, /Never promise when a person will respond/i);
    assert.match(prompt, /does not prove that an email, SMS, calendar invite/i);
  });

  test("social and marketing copy cannot invent team, speed, outcome, or efficiency facts", async () => {
    const prompt = await promptFor({ capabilities: [] });
    assert.match(prompt, /Never invent staff identities, credentials, certifications, team composition/i);
    assert.match(prompt, /speed or turnaround claims/i);
    assert.match(prompt, /performance or outcome claims/i);
    assert.match(prompt, /efficiency claims/i);
  });
});

