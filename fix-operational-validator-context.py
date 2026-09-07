from pathlib import Path

p = Path(r"packages/crm/src/lib/agents/validators.ts")
s = p.read_text(encoding="utf-8")

old = '''  run: ({ response, turnToolCalls, turnToolResults, soul }) => {'''
new = '''  run: ({ response, userMessage, turnToolCalls, turnToolResults, soul }) => {'''

if old not in s:
    raise SystemExit("validator signature anchor not found")

s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")

print("PASS: userMessage added to operational validator context")
