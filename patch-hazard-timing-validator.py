from pathlib import Path

p = Path(r"packages/crm/src/lib/agents/validators.ts")
s = p.read_text(encoding="utf-8")

old = '''    for (const claim of OPERATIONAL_PROMISE_PATTERNS) {
      const match = response.match(claim.pattern)?.[0];
      if (match && !toolOutputExplicitlySupports(match, escalationOutputs)) {
        failures.push(claim.label);
      }
    }'''

new = '''    for (const claim of OPERATIONAL_PROMISE_PATTERNS) {
      const match = response.match(claim.pattern)?.[0];
      if (!match) continue;

      // Safety urgency such as "leave the building immediately" is not an
      // operational response-time promise. Other dispatch/contact patterns
      // still independently block claims like "we'll dispatch immediately."
      const isHazardSafetyTiming =
        claim.label === "time promise" &&
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
    raise SystemExit("operational validator anchor not found")

s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")

print("PASS: hazard safety timing exemption added")
