from pathlib import Path

p = Path(r"packages/crm/src/lib/agents/public-slot-selection.ts")
s = p.read_text(encoding="utf-8")

old = '''  const availabilityService = text.match(
    /\\b(?:available\\s+(?:times?|appointments?|slots?)|availability|openings?|times?|slots?)\\s+for\\s+(.+?)(?:\\?|$)/im,
  )?.[1]
    ?.trim();'''

new = '''  const availabilityService = text.match(
    /\\b(?:available|availability|openings?|slots?|appointments?)\\s+for\\s+(.+?)(?:\\?|$)/im,
  )?.[1]
    ?.trim();'''

if old not in s:
    raise SystemExit("availability service matcher anchor not found")

s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")

print("PASS: service extraction now anchors on 'available for'")
