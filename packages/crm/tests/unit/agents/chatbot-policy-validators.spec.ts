import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  ALL_VALIDATORS,
  runValidators,
  sanitizeUnbackedOperationalPromises,
} from "../../../src/lib/agents/validators";
import type {
  AgentBlueprint,
  AgentToolCall,
  AgentToolResult,
} from "../../../src/db/schema/agents";

const BLUEPRINT = {
  capabilities: ["look_up_availability", "book_appointment", "escalate_to_human"],
  pricingFacts: [],
  faq: [],
} as unknown as AgentBlueprint;

const DALLASFLOW_PLUMBING_SOUL = {
  emergency_service: false,
  services: [
    { name: "Drain cleaning" },
    { name: "Leak repair" },
    { name: "Water heater repair" },
    { name: "Toilet repair" },
    { name: "Emergency plumbing" },
  ],
};

const DALLASFLOW_PLUMBING_BLUEPRINT: AgentBlueprint = {
  capabilities: ["look_up_availability", "book_appointment", "escalate_to_human"],
  pricingFacts: [
    { label: "Plumbing service visit", amount: 79, currency: "USD" },
  ],
  faq: [],
};

function resultByName(name: string, response: string, extra?: {
  userMessage?: string;
  blueprint?: AgentBlueprint;
  soul?: Parameters<typeof runValidators>[0]["soul"];
  turnToolCalls?: AgentToolCall[];
  turnToolResults?: AgentToolResult[];
  recentSuccessfulTools?: string[];
}) {
  const { results, criticalFailed } = runValidators({
    response,
    userMessage: extra?.userMessage ?? "Do you offer 24/7 emergency service?",
    conversationContext: "",
    turnToolCalls: extra?.turnToolCalls ?? [],
    turnToolResults: extra?.turnToolResults ?? [],
    recentSuccessfulTools: extra?.recentSuccessfulTools ?? [],
    blueprint: extra?.blueprint ?? BLUEPRINT,
    soul: extra?.soul ?? { emergency_service: false },
  });
  return {
    criticalFailed,
    results,
    validator: results.find((r) => r.name === name),
  };
}

function assertValidatorPasses(
  name: string,
  response: string,
  extra?: Parameters<typeof resultByName>[2],
) {
  const out = resultByName(name, response, extra);
  assert.equal(out.validator?.passed, true);
}

function assertValidatorFails(
  name: string,
  response: string,
  extra?: Parameters<typeof resultByName>[2],
  details?: RegExp,
) {
  const out = resultByName(name, response, extra);
  assert.equal(out.criticalFailed, true);
  assert.equal(out.validator?.passed, false);
  if (details) assert.match(out.validator?.details ?? "", details);
}

function assertCriticalValidatorsPass(
  response: string,
  extra?: Parameters<typeof resultByName>[2],
) {
  const out = resultByName("no_unbacked_operational_promises", response, extra);
  assert.equal(out.criticalFailed, false);
  assert.deepEqual(
    out.results.filter((result) => result.passed === false),
    [],
  );
}

describe("chatbot policy validators", () => {
  test("rejects sending a technician without a tool result", () => {
    assertValidatorFails(
      "no_unbacked_operational_promises",
      "We can send a technician once you're safe.",
      { userMessage: "I smell gas near the furnace." },
      /send\/dispatch someone/,
    );
  });

  test("rejects offering to call the visitor back without a tool result", () => {
    assertValidatorFails(
      "no_unbacked_operational_promises",
      "Would you like us to call you back?",
      { userMessage: "I smell gas near the furnace." },
      /callback offer|contact offer/,
    );
  });

  test("rejects saying someone can call the visitor without a tool result", () => {
    assertValidatorFails(
      "no_unbacked_operational_promises",
      "I can have someone call you.",
      { userMessage: "I smell gas near the furnace." },
      /i can operational promise|callback\/contact promise/,
    );
  });

  test("rejects offering to send a technician without a tool result", () => {
    assertValidatorFails(
      "no_unbacked_operational_promises",
      "Would you like us to send a technician?",
      { userMessage: "I smell gas near the furnace." },
      /operational offer/,
    );
  });

  test("rejects arranging technician contact without a tool result", () => {
    assertValidatorFails(
      "no_unbacked_operational_promises",
      "I can arrange for a technician to contact you.",
      { userMessage: "I smell gas near the furnace." },
      /i can operational promise|callback\/contact promise/,
    );
  });

  test("rejects sending someone out without a tool result", () => {
    assertValidatorFails(
      "no_unbacked_operational_promises",
      "We can send someone out.",
      { userMessage: "I smell gas near the furnace." },
      /send\/dispatch someone|we can operational promise/,
    );
  });

  test("rejects scheduling a gas-leak inspection unless the configured services support it", () => {
    assertValidatorFails(
      "no_unbacked_operational_promises",
      "We can schedule a gas-leak inspection.",
      {
        userMessage: "I smell gas near the furnace.",
        soul: { emergency_service: false, services: [{ name: "AC repair" }] },
      },
      /unsupported service promise/,
    );
  });

  test("allows a gas-leak inspection when the configured services support it", () => {
    assertValidatorPasses(
      "no_unbacked_operational_promises",
      "We can schedule a gas-leak inspection.",
      {
        userMessage: "I smell gas near the furnace.",
        soul: {
          emergency_service: false,
          services: [{ name: "Gas leak inspection" }],
        },
      },
    );
  });

  test("allows a normal AC-repair paraphrase when AC repair is configured", () => {
    assertValidatorPasses(
      "no_unbacked_operational_promises",
      "We can schedule air conditioner repair.",
      {
        userMessage: "My AC stopped cooling.",
        soul: { emergency_service: false, services: [{ name: "AC repair" }] },
      },
    );
  });

  test("allows a grounded technician description without dispatch or escalation", () => {
    assertValidatorPasses(
      "no_unbacked_operational_promises",
      "A technician can inspect the drain during a scheduled service visit.",
      {
        userMessage: "My kitchen sink is draining slowly.",
        soul: DALLASFLOW_PLUMBING_SOUL,
      },
    );
  });

  test("allows configured DallasFlow plumbing service listing", () => {
    assertValidatorPasses(
      "no_unbacked_operational_promises",
      "We offer drain cleaning and leak repair.",
      {
        userMessage: "My kitchen sink is draining slowly.",
        soul: DALLASFLOW_PLUMBING_SOUL,
      },
    );
  });

  test("allows configured service listing plus generic service-visit booking language", () => {
    assertValidatorPasses(
      "no_unbacked_operational_promises",
      "We offer drain cleaning and leak repair. I can help you book a service visit.",
      {
        userMessage: "My kitchen sink is draining slowly. What would it cost to have someone come out?",
        soul: DALLASFLOW_PLUMBING_SOUL,
      },
    );
  });

  test("allows generic priced service-visit wording in the operational validator", () => {
    assertValidatorPasses(
      "no_unbacked_operational_promises",
      "A service visit is $79.",
      {
        userMessage: "How much would it cost to have someone come out?",
        soul: DALLASFLOW_PLUMBING_SOUL,
      },
    );
  });

  test("allows live DallasFlow service list plus plumbing service-visit price", () => {
    const context = {
      userMessage:
        "Hi, my kitchen sink is draining very slowly. What services do you offer, and how much would it cost to have someone come out?",
      blueprint: DALLASFLOW_PLUMBING_BLUEPRINT,
      soul: DALLASFLOW_PLUMBING_SOUL,
    };

    assertCriticalValidatorsPass(
      "We offer drain cleaning, leak repair, water heater repair, and toilet repair. A plumbing service visit is $79.",
      context,
    );
    assertCriticalValidatorsPass(
      "For your slow-draining sink, drain cleaning is one of our services. The plumbing service visit is $79.",
      context,
    );
    assertCriticalValidatorsPass(
      "I can help you book a plumbing service visit for $79.",
      context,
    );
    assertCriticalValidatorsPass(
      "We provide plumbing service visits for $79.",
      context,
    );
  });

  test("keeps unsupported named service promises blocked when plumbing visit pricing is configured", () => {
    const context = {
      userMessage: "My kitchen sink is draining slowly.",
      blueprint: DALLASFLOW_PLUMBING_BLUEPRINT,
      soul: DALLASFLOW_PLUMBING_SOUL,
    };

    assertValidatorFails(
      "no_unbacked_operational_promises",
      "We offer electrical repair.",
      context,
      /unsupported service promise/,
    );
    assertValidatorFails(
      "no_unbacked_operational_promises",
      "We can schedule an electrical service visit.",
      context,
      /unsupported service promise/,
    );
    assertValidatorFails(
      "no_unbacked_operational_promises",
      "We can schedule a gas-leak inspection.",
      context,
      /unsupported service promise/,
    );
    assertValidatorFails(
      "no_unbacked_operational_promises",
      "We provide service visits for $79.",
      context,
      /unsupported service promise/,
    );
  });

  test("allows arranging a generic service visit without implying dispatch or timing", () => {
    assertValidatorPasses(
      "no_unbacked_operational_promises",
      "We can arrange a service visit for your slow-draining sink.",
      {
        userMessage: "My sink is draining slowly.",
        soul: { emergency_service: false, services: [{ name: "Drain cleaning" }] },
      },
    );
  });

  test("allows equivalent generic appointment-arrangement language", () => {
    assertValidatorPasses(
      "no_unbacked_operational_promises",
      "I can help arrange an appointment for that service.",
      {
        userMessage: "I need help with a plumbing issue.",
        soul: { emergency_service: false, services: [{ name: "Leak repair" }] },
      },
    );
  });

  test("still rejects arranging technician contact without a tool result", () => {
    assertValidatorFails(
      "no_unbacked_operational_promises",
      "We can arrange for a technician to contact you.",
      {
        userMessage: "My sink is draining slowly.",
        soul: { emergency_service: false, services: [{ name: "Drain cleaning" }] },
      },
      /technician|we can operational promise|callback\/contact promise/,
    );
  });

  test("rejects dispatching a technician without a tool result", () => {
    assertValidatorFails(
      "no_unbacked_operational_promises",
      "We can dispatch a technician.",
      {
        userMessage: "My sink is draining slowly.",
        soul: DALLASFLOW_PLUMBING_SOUL,
      },
      /send\/dispatch someone|we can operational promise|technician/,
    );
  });

  test("rejects technician response-time promises without a tool result", () => {
    assertValidatorFails(
      "no_unbacked_operational_promises",
      "A technician will be there shortly.",
      {
        userMessage: "My sink is draining slowly.",
        soul: DALLASFLOW_PLUMBING_SOUL,
      },
      /technician|shortly/,
    );
  });

  test("rejects unsupported DallasFlow gas-leak inspection", () => {
    assertValidatorFails(
      "no_unbacked_operational_promises",
      "We can schedule a gas-leak inspection.",
      {
        userMessage: "My kitchen sink is draining slowly.",
        soul: DALLASFLOW_PLUMBING_SOUL,
      },
      /unsupported service promise/,
    );
  });

  test("rejects unsupported DallasFlow electrical repair", () => {
    assertValidatorFails(
      "no_unbacked_operational_promises",
      "We offer electrical repair.",
      {
        userMessage: "My kitchen sink is draining slowly.",
        soul: DALLASFLOW_PLUMBING_SOUL,
      },
      /unsupported service promise/,
    );
  });

  test("rejects unsupported named service-visit modifiers", () => {
    assertValidatorFails(
      "no_unbacked_operational_promises",
      "We can schedule an electrical service visit.",
      {
        userMessage: "My kitchen sink is draining slowly.",
        soul: DALLASFLOW_PLUMBING_SOUL,
      },
      /unsupported service promise/,
    );
  });

  test("rejects callback promises without a tool result", () => {
    assertValidatorFails(
      "no_unbacked_operational_promises",
      "We'll have someone call you shortly.",
      { userMessage: "I smell gas near the furnace." },
      /callback\/contact promise|shortly/,
    );
  });

  test("rejects emergency-team dispatch promises without a tool result", () => {
    assertValidatorFails(
      "no_unbacked_operational_promises",
      "That will allow us to dispatch an emergency technician as soon as possible.",
      { userMessage: "I smell gas near the furnace." },
      /technician|time promise/,
    );
  });

  test("rejects follow-up contact promises without a tool result", () => {
    assertValidatorFails(
      "no_unbacked_operational_promises",
      "We will follow up with you later.",
      { userMessage: "My AC is broken after hours." },
      /callback\/contact promise|time promise/,
    );
  });

  test("allows plain handoff acknowledgement after successful escalation", () => {
    assertValidatorPasses(
      "no_unbacked_operational_promises",
      "I've passed this to the team.",
      {
        turnToolCalls: [escalationCall],
        turnToolResults: [basicEscalationResult],
      },
    );
  });

  test("allows grounded escalation details when the tool result explicitly supports them", () => {
    assertValidatorPasses(
      "no_unbacked_operational_promises",
      "I've passed this to our emergency team. They'll call you shortly.",
      {
        turnToolCalls: [escalationCall],
        turnToolResults: [
          {
            toolCallId: escalationCall.id,
            ok: true,
            output: {
              ok: true,
              recipient: "emergency team",
              responseTime: "shortly",
              contactPromise: "They'll call you",
            },
          },
        ],
      },
    );
  });

  test("allows safety guidance for a real gas-smell hazard without promising dispatch", () => {
    assertValidatorPasses(
      "no_unbacked_operational_promises",
      "If you smell gas, leave the home and contact emergency services.",
      { userMessage: "I smell gas near the furnace." },
    );
  });

  test("still blocks unsupported 911 advice when no safety hazard was described", () => {
    assertValidatorFails(
      "no_unsupported_emergency_claims",
      "We are closed for the day. If this is urgent, call 911.",
      { userMessage: "My AC is broken after hours." },
      /without a described safety hazard/,
    );
  });

  const availabilityCall: AgentToolCall = {
    id: "toolu_availability",
    name: "look_up_availability",
    input: { date: "2026-08-24" },
  };

  const availabilityResult: AgentToolResult = {
    toolCallId: availabilityCall.id,
    ok: true,
    output: {
      slots: [
        { iso: "2026-08-24T13:00:00.000Z", label: "Monday, August 24 at 8:00 AM CDT" },
        { iso: "2026-08-24T14:00:00.000Z", label: "Monday, August 24 at 9:00 AM CDT" },
        { iso: "2026-08-24T15:00:00.000Z", label: "Monday, August 24 at 10:00 AM CDT" },
      ],
      durationMinutes: 60,
      date: "2026-08-24",
      timezone: "America/Chicago",
    },
  };

  const escalationCall: AgentToolCall = {
    id: "toolu_escalate",
    name: "escalate_to_human",
    input: { reason: "Visitor reported gas smell near the furnace." },
  };

  const basicEscalationResult: AgentToolResult = {
    toolCallId: escalationCall.id,
    ok: true,
    output: { ok: true },
  };

  const bookingCall: AgentToolCall = {
    id: "toolu_booking",
    name: "book_appointment",
    input: { slotIso: "2026-08-25T13:00:00.000Z", confirmed: true },
  };

  const successfulBookingResult: AgentToolResult = {
    toolCallId: bookingCall.id,
    ok: true,
    output: { ok: true, bookingId: "booking-1" },
  };

  test("still rejects escalation acknowledgement without the tool call", () => {
    const out = resultByName(
      "no_hallucinated_state_change",
      "I've passed this to the team.",
    );

    assert.equal(out.criticalFailed, true);
    assert.equal(out.validator?.passed, false);
    assert.match(out.validator?.details ?? "", /escalate_to_human/);
  });

  test("runs operational-promise validation on final post-tool responses", () => {
    assert.ok(
      ALL_VALIDATORS.some((validator) => validator.name === "no_unbacked_operational_promises"),
    );
    assertValidatorFails(
      "no_unbacked_operational_promises",
      "You're booked. A confirmation text/email will come shortly.",
      {
        turnToolCalls: [bookingCall],
        turnToolResults: [successfulBookingResult],
      },
      /unverified notification delivery/,
    );
  });

  test("sanitizes the exact live notification promise while preserving booking state", () => {
    const liveSentence =
      "Done — you're booked for Wednesday, August 26 at 8:00 AM CDT. Confirmation text/email is on its way.";
    const out = resultByName("no_unbacked_operational_promises", liveSentence, {
      turnToolCalls: [bookingCall],
      turnToolResults: [successfulBookingResult],
    });

    assert.equal(out.validator?.passed, false);
    const sanitized = sanitizeUnbackedOperationalPromises(
      liveSentence,
      [bookingCall],
      [successfulBookingResult],
    );
    assert.equal(sanitized, "Done — you're booked for Wednesday, August 26 at 8:00 AM CDT.");
    assert.doesNotMatch(sanitized, /confirmation\s+text|email.*way/i);
    assert.equal(
      resultByName("no_unbacked_operational_promises", sanitized, {
        turnToolCalls: [bookingCall],
        turnToolResults: [successfulBookingResult],
      }).validator?.passed,
      true,
    );
  });

  test("successful escalation is acknowledged without inventing follow-up timing", () => {
    const escalationCall: AgentToolCall = {
      id: "escalate-1",
      name: "escalate_to_human",
      input: {},
    };
    const escalationResult: AgentToolResult = {
      toolCallId: escalationCall.id,
      ok: true,
      output: { ok: true, escalated: true },
    };
    const sanitized = sanitizeUnbackedOperationalPromises(
      "I've passed your details to the team. They'll be in touch shortly.",
      [escalationCall],
      [escalationResult],
    );
    assert.match(sanitized, /passed your details to the team/i);
    assert.doesNotMatch(sanitized, /\bshortly\b/i);
  });

  test("allows a legitimate booking confirmation after a successful booking", () => {
    assertValidatorPasses(
      "no_hallucinated_state_change",
      "You're booked for Tuesday, August 25 at 8:00 AM CDT.",
      {
        turnToolCalls: [bookingCall],
        turnToolResults: [successfulBookingResult],
      },
    );
  });

  test("does not allow a failed booking to claim success", () => {
    assertValidatorFails(
      "no_hallucinated_state_change",
      "You're booked for Tuesday, August 25 at 8:00 AM CDT.",
      {
        turnToolCalls: [bookingCall],
        turnToolResults: [{ ...successfulBookingResult, ok: false }],
      },
      /book_appointment/,
    );
  });

  test("allows a past-tense email delivery claim only when a tool result proves it", () => {
    assertValidatorPasses(
      "no_unbacked_operational_promises",
      "Your confirmation email was sent.",
      {
        turnToolCalls: [bookingCall],
        turnToolResults: [
          {
            ...successfulBookingResult,
            output: { ok: true, notificationDelivery: { email: "sent" } },
          },
        ],
      },
    );
  });

  test("allows concrete availability that repeats returned slot labels", () => {
    const out = resultByName(
      "availability_times_from_tool",
      "The next openings are Monday, August 24 at 8:00 AM, Monday, August 24 at 9:00 AM, and Monday, August 24 at 10:00 AM.",
      {
        turnToolCalls: [availabilityCall],
        turnToolResults: [availabilityResult],
      },
    );

    assert.equal(out.validator?.passed, true);
  });

  test("rejects concrete availability that invents a time not returned by the tool", () => {
    const out = resultByName(
      "availability_times_from_tool",
      "The next openings are Monday, August 24 at 8:00 AM, Monday, August 24 at 9:00 AM, and Monday, August 24 at 2:00 PM.",
      {
        turnToolCalls: [availabilityCall],
        turnToolResults: [availabilityResult],
      },
    );

    assert.equal(out.criticalFailed, true);
    assert.equal(out.validator?.passed, false);
    assert.match(out.validator?.details ?? "", /2:00 PM/);
  });

  test("allows ordinary business-hours statements without availability lookup", () => {
    const out = resultByName(
      "availability_times_from_tool",
      "We're open Monday-Friday 8 AM-6 PM.",
    );

    assert.equal(out.validator?.passed, true);
  });
});


test("allows generic service-visit booking language without inventing a service", () => {
  assertValidatorPasses(
    "no_unbacked_operational_promises",
    "I can help you schedule a service visit.",
    {
      userMessage: "My kitchen sink is draining slowly. Can someone come out?",
      soul: {
        emergency_service: false,
        services: [
          { name: "Drain cleaning" },
          { name: "Leak repair" },
          { name: "Water heater repair" },
          { name: "Toilet repair" },
          { name: "Emergency plumbing" },
        ],
      },
    },
  );
});
