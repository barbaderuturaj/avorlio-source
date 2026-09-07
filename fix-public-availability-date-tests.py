from pathlib import Path

p = Path(r"packages/crm/tests/unit/agents/public-availability-intent.spec.ts")
s = p.read_text(encoding="utf-8")

anchor = '''    assert.equal(
      shouldForceGenericAvailabilityLookup("What is available today?"),
      false,
    );'''

replacement = '''    assert.equal(
      shouldForceGenericAvailabilityLookup("What is available today?"),
      false,
    );
    assert.equal(
      shouldForceGenericAvailabilityLookup("What times are available August 30?"),
      false,
    );
    assert.equal(
      shouldForceGenericAvailabilityLookup("What openings do you have next month?"),
      false,
    );'''

if anchor not in s:
    raise SystemExit("test anchor not found")

s = s.replace(anchor, replacement, 1)
p.write_text(s, encoding="utf-8")

print("PASS: date-specific regression cases added")
