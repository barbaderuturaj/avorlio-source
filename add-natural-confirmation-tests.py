from pathlib import Path

p = Path(r"packages/crm/tests/unit/agents/explicit-confirmation.spec.ts")
s = p.read_text(encoding="utf-8")

s = s.replace(
'''    "yes, that's correct",
    "correct",''',
'''    "yes, that's correct",
    "yes perfect",
    "yes please",
    "yes said already",
    "yep",
    "sure",
    "sure go ahead",
    "that's right",
    "correct",''',
1,
)

s = s.replace(
'''    "don't confirm it",
    "what time is that?",''',
'''    "don't confirm it",
    "yes but change it to 10",
    "yes, instead use tomorrow",
    "sure but change the time",
    "what time is that?",''',
1,
)

p.write_text(s, encoding="utf-8")
print("PASS: natural confirmation regression cases added")
