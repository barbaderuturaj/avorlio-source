from pathlib import Path

p = Path(r"packages/crm/src/lib/agents/validators.ts")
s = p.read_text(encoding="utf-8")

old = '''    for (const claim of ESCALATION_TIMING_OR_CALLBACK_CLAIMS) {
      const match = response.match(claim.pattern)?.[0];
      if (match && !toolOutputExplicitlySupports(match, escalationOutputs)) {
        failures.push(claim.label);
      }
    }'''

new = '''    for (const claim of ESCALATION_TIMING_OR_CALLBACK_CLAIMS) {
      const match = response.match(claim.pattern)?.[0];
      if (!match) continue;

      // "Leave the building immediately" is safety guidance, not a promise
      // about the business's response time. Callback/contact/timing claims
      // remain blocked outside a genuine user-described hazard.
      const isHazardSafetyTiming =
        claim.label === "immediate response" &&
        SAFETY_HAZARD_PATTERN.test(userMessage) &&
        EMERGENCY_SERVICE_ADVICE_PATTERN.test(response);

      if (
        !isHazardSafetyTiming &&
        !toolOutputExplicitlySupports(match, escalationOutputs)
      ) {
        failures.push(claim.label);
      }
    }'''

if old not in s:
    raise SystemExit("escalation timing validator anchor not found")

s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")

print("PASS: hazard safety timing exempted from escalation timing check")
