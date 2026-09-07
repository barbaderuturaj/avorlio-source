from pathlib import Path

p = Path(r"packages/crm/src/lib/agents/public-slot-selection.ts")
s = p.read_text(encoding="utf-8")

anchor = '''export type AvailabilityTurn = {
  role: string;
  toolCalls?: AgentToolCall[] | null;
  toolResults?: AgentToolResult[] | null;
};'''

replacement = '''export type AvailabilityTurn = {
  role: string;
  content?: string | null;
  toolCalls?: AgentToolCall[] | null;
  toolResults?: AgentToolResult[] | null;
};'''

if anchor not in s:
    raise SystemExit("AvailabilityTurn anchor not found")

s = s.replace(anchor, replacement, 1)

insert_after = '''export function resolvePublicSlotSelection(
  slots: readonly OfferedSlot[],
  userText: string,
): PublicSlotSelection {
  if (slots.length === 0) return { kind: "no_match" };

  const normalizedUserText = normalizeText(userText);
  const exactMatches = slots.filter(
    (slot) => normalizeText(slot.label) === normalizedUserText,
  );
  if (exactMatches.length === 1) {
    const slot = exactMatches[0]!;
    return { kind: "matched", slot, index: slots.indexOf(slot) };
  }

  const ordinal = ordinalIndex(userText);
  if (ordinal !== null) {
    const slot = slots[ordinal];
    return slot
      ? { kind: "matched", slot, index: ordinal }
      : { kind: "no_match" };
  }

  const timeMatches = slots.filter((slot) => matchesTime(userText, slot.label));
  if (timeMatches.length === 1) {
    const slot = timeMatches[0]!;
    return { kind: "matched", slot, index: slots.indexOf(slot) };
  }
  if (timeMatches.length > 1) return { kind: "ambiguous", slots: timeMatches };
  return { kind: "no_match" };
}'''

addition = insert_after + '''

/**
 * Recover the newest explicit slot selection made AFTER the newest successful
 * availability offer. Later unrelated intake answers (name, phone, address)
 * do not erase the chosen slot.
 *
 * A newer successful availability result supersedes all older offers/selections.
 */
export function latestHistoricalPublicSlotSelection(
  turns: readonly AvailabilityTurn[],
): PublicSlotSelection {
  let offeredSlots: OfferedSlot[] = [];
  let offerTurnIndex = -1;

  for (let turnIndex = turns.length - 1; turnIndex >= 0; turnIndex -= 1) {
    const turn = turns[turnIndex];
    if (turn?.role !== "assistant") continue;

    const calls = turn.toolCalls ?? [];
    const results = turn.toolResults ?? [];

    for (let callIndex = calls.length - 1; callIndex >= 0; callIndex -= 1) {
      const call = calls[callIndex];
      if (call.name !== "look_up_availability") continue;

      const result = results.find(
        (candidate) => candidate.toolCallId === call.id,
      );
      if (!result?.ok) continue;

      if (
        result.output &&
        typeof result.output === "object" &&
        Array.isArray((result.output as { slots?: unknown }).slots)
      ) {
        offeredSlots = validSlots(result.output);
        offerTurnIndex = turnIndex;
        break;
      }
    }

    if (offerTurnIndex >= 0) break;
  }

  if (offerTurnIndex < 0 || offeredSlots.length === 0) {
    return { kind: "no_match" };
  }

  // Walk newest-to-oldest so a later explicit selection replaces an earlier one.
  // Unrelated intake answers simply produce no_match and are skipped.
  for (
    let turnIndex = turns.length - 1;
    turnIndex > offerTurnIndex;
    turnIndex -= 1
  ) {
    const turn = turns[turnIndex];
    if (
      turn?.role !== "user" ||
      typeof turn.content !== "string" ||
      turn.content.trim().length === 0
    ) {
      continue;
    }

    const resolved = resolvePublicSlotSelection(offeredSlots, turn.content);
    if (resolved.kind !== "no_match") return resolved;
  }

  return { kind: "no_match" };
}'''

if insert_after not in s:
    raise SystemExit("resolvePublicSlotSelection anchor not found")

s = s.replace(insert_after, addition, 1)
p.write_text(s, encoding="utf-8")

print("PASS: historical public slot selection helper added")
