from pathlib import Path

p = Path(r"packages/crm/src/lib/agents/explicit-confirmation.ts")
s = p.read_text(encoding="utf-8")

old = '''  if (!normalized) return false;
  if (/\\b(?:do not|don't|not yet|maybe|wait|hold on|change|instead|cancel that)\\b/.test(normalized)) {
    return false;
  }
  if (/^(?:what|when|where|which|who|why|how)\\b/.test(normalized)) return false;

  return /^(?:yes|yeah|yes (?:that is|that's|this is) correct|correct|confirm(?: it)?|please confirm(?: it)?|go ahead|go ahead and confirm(?: it)?|go ahead and (?:book|reschedule|cancel)(?: it)?)$/.test(
    normalized,
  );'''

new = '''  if (!normalized) return false;

  // Any correction, hesitation, cancellation, or replacement language wins over
  // an affirmative prefix. "yes but change it" must never authorize a write.
  if (
    /\\b(?:do not|don't|not yet|maybe|wait|hold on|change|instead|cancel that)\\b/.test(
      normalized,
    )
  ) {
    return false;
  }
  if (/^(?:what|when|where|which|who|why|how)\\b/.test(normalized)) return false;

  // Accept ordinary human confirmations rather than requiring an exact one-word
  // response. The negative/correction guard above keeps this fail-closed.
  return /^(?:
    yes(?:\\s+(?:please|perfect|thanks|thank you|that's correct|that is correct|this is correct|that's right|that is right|said already))?
    |yeah
    |yep
    |sure(?:\\s+go ahead)?
    |that's right
    |that is right
    |correct
    |confirm(?: it)?
    |please confirm(?: it)?
    |go ahead
    |go ahead and confirm(?: it)?
    |go ahead and (?:book|reschedule|cancel)(?: it)?
  )$/x.test(normalized);'''

if old not in s:
    raise SystemExit("confirmation matcher anchor not found")

# JavaScript regex has no /x flag, so write a compact equivalent.
new = '''  if (!normalized) return false;

  // Any correction, hesitation, cancellation, or replacement language wins over
  // an affirmative prefix. "yes but change it" must never authorize a write.
  if (
    /\\b(?:do not|don't|not yet|maybe|wait|hold on|change|instead|cancel that)\\b/.test(
      normalized,
    )
  ) {
    return false;
  }
  if (/^(?:what|when|where|which|who|why|how)\\b/.test(normalized)) return false;

  // Accept ordinary human confirmations rather than requiring an exact one-word
  // response. The guard above keeps correction/hesitation phrases fail-closed.
  return /^(?:yes(?:\\s+(?:please|perfect|thanks|thank you|that's correct|that is correct|this is correct|that's right|that is right|said already))?|yeah|yep|sure(?:\\s+go ahead)?|that's right|that is right|correct|confirm(?: it)?|please confirm(?: it)?|go ahead|go ahead and confirm(?: it)?|go ahead and (?:book|reschedule|cancel)(?: it)?)$/.test(
    normalized,
  );'''

s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")
print("PASS: natural explicit confirmation support added")
