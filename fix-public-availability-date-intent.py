from pathlib import Path

p = Path(r"packages/crm/src/lib/agents/public-availability-intent.ts")
s = p.read_text(encoding="utf-8")

old = r'''const DATE_SPECIFIC_PATTERN =
  /\b(today|tomorrow|tonight|this\s+(?:morning|afternoon|evening|week|weekend)|next\s+(?:week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/i;'''

new = r'''const DATE_SPECIFIC_PATTERN =
  /\b(today|tomorrow|tonight|this\s+(?:morning|afternoon|evening|week|weekend|month)|next\s+(?:week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|in\s+\d+\s+(?:day|days|week|weeks)|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/i;'''

if old not in s:
    raise SystemExit("date-specific pattern anchor not found")

s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")

print("PASS: expanded date-specific availability protection")
