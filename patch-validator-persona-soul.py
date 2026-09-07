from pathlib import Path

p = Path(r"packages/crm/src/lib/agents/runtime.ts")
s = p.read_text(encoding="utf-8")

old = '''  const soulForValidators = (orgRow.soul as {
    services?: Array<{ name: string }>;
    voice?: { avoidWords?: string[] };
    contact?: { email?: string; phone?: string };
  } | null) ?? null;'''

new = '''  const soulForValidators = (personaSoul as {
    services?: Array<{ name: string }>;
    voice?: { avoidWords?: string[] };
    contact?: { email?: string; phone?: string };
  } | null) ?? null;'''

if old not in s:
    raise SystemExit("soulForValidators anchor not found")

s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")

print("PASS: validators now use resolved personaSoul")
