from pathlib import Path

p = Path(r"packages/crm/src/lib/agents/public-slot-selection.ts")
s = p.read_text(encoding="utf-8")

old = '''  if (["issue", "issue_type", "problem", "concern"].includes(id)) return fields.issue;'''

new = '''  if (["issue", "issue_type", "problem", "concern"].includes(id)) {
    return fields.issue ?? fields.intakeResponses?.[fieldId];
  }'''

if old not in s:
    raise SystemExit("issue getter anchor not found")

s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")

print("PASS: issue intake answers now fall back to recovered intakeResponses")
