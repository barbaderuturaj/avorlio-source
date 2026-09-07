from pathlib import Path

p = Path(r"packages/crm/src/lib/agents/runtime.ts")
s = p.read_text(encoding="utf-8")

# 1. Extend public slot-selection imports.
old = '''import {
  buildPublicBookingToolInput,
  buildPublicSlotConfirmationReadBack,
  latestSuccessfulAvailabilitySlots,
  recoverPublicBookingFields,
  resolvePublicSlotSelection,
} from "@/lib/agents/public-slot-selection";'''

new = '''import {
  buildPublicBookingToolInput,
  buildPublicSlotConfirmationReadBack,
  latestHistoricalPublicSlotSelection,
  latestSuccessfulAvailabilitySlots,
  recoverPublicBookingFieldsFromTurns,
  resolvePublicSlotSelection,
} from "@/lib/agents/public-slot-selection";'''

if old not in s:
    raise SystemExit("public-slot-selection import anchor not found")
s = s.replace(old, new, 1)

# 2. Import the explicit affirmative helper as well.
old = '''import {
  enforceExplicitConfirmation,
  latestPendingConfirmationAction,
} from "@/lib/agents/explicit-confirmation";'''

new = '''import {
  enforceExplicitConfirmation,
  isExplicitAffirmativeConfirmation,
  latestPendingConfirmationAction,
} from "@/lib/agents/explicit-confirmation";'''

if old not in s:
    raise SystemExit("explicit-confirmation import anchor not found")
s = s.replace(old, new, 1)

# 3. Replace current-only slot + user-only field recovery with persisted
# historical selection + conversational field recovery.
old = '''  const publicSelection =
    agent.archetype === "website-chatbot"
      ? resolvePublicSlotSelection(
          latestSuccessfulAvailabilitySlots(history),
          input.userMessage,
        )
      : { kind: "no_match" as const };
  const userHistory = history
    .filter((turn) => turn.role === "user" && typeof turn.content === "string")
    .map((turn) => turn.content as string);
  const recoveredBookingFields = recoverPublicBookingFields(userHistory);
  const bookingTool = tools.find((tool) => tool.name === "book_appointment");'''

new = '''  const currentPublicSelection =
    agent.archetype === "website-chatbot"
      ? resolvePublicSlotSelection(
          latestSuccessfulAvailabilitySlots(history),
          input.userMessage,
        )
      : { kind: "no_match" as const };

  const historicalPublicSelection =
    agent.archetype === "website-chatbot"
      ? latestHistoricalPublicSlotSelection(history)
      : { kind: "no_match" as const };

  // A current explicit choice wins. Otherwise retain the latest valid choice
  // while later turns collect name / phone / address.
  const publicSelection =
    currentPublicSelection.kind === "no_match"
      ? historicalPublicSelection
      : currentPublicSelection;

  const bookingConversationTurns = [
    ...history.map((turn) => ({
      role: turn.role,
      content: typeof turn.content === "string" ? turn.content : null,
    })),
    { role: "user", content: input.userMessage },
  ];
  const recoveredBookingFields =
    recoverPublicBookingFieldsFromTurns(bookingConversationTurns);

  const bookingTool = tools.find((tool) => tool.name === "book_appointment");'''

if old not in s:
    raise SystemExit("public selection/recovery anchor not found")
s = s.replace(old, new, 1)

# 4. Insert deterministic confirmation action and prevent a new proposal
# while an authoritative pending confirmation exists.
old = '''  const deterministicBookingInput =
    publicSelection.kind === "matched" &&
    bookingTool &&
    recoveredBookingFields.fullName &&
    (recoveredBookingFields.phone || recoveredBookingFields.email)
      ? {
          ...buildPublicBookingToolInput(
            publicSelection.slot,
            { ...recoveredBookingFields, fullName: recoveredBookingFields.fullName! },
            publicBookingTemplateSlugs?.length === 1
              ? publicBookingTemplateSlugs[0]
              : undefined,
          ),
        }
      : null;'''

new = '''  const deterministicConfirmedAction =
    agent.archetype === "website-chatbot" &&
    pendingAction &&
    isExplicitAffirmativeConfirmation(input.userMessage) &&
    tools.some((tool) => tool.name === pendingAction.toolName)
      ? {
          toolName: pendingAction.toolName,
          input: {
            ...pendingAction.input,
            confirmed: true,
          },
        }
      : null;

  const deterministicBookingInput =
    !pendingAction &&
    publicSelection.kind === "matched" &&
    bookingTool &&
    recoveredBookingFields.fullName &&
    (recoveredBookingFields.phone || recoveredBookingFields.email)
      ? {
          ...buildPublicBookingToolInput(
            publicSelection.slot,
            { ...recoveredBookingFields, fullName: recoveredBookingFields.fullName! },
            publicBookingTemplateSlugs?.length === 1
              ? publicBookingTemplateSlugs[0]
              : undefined,
          ),
        }
      : null;'''

if old not in s:
    raise SystemExit("deterministic booking anchor not found")
s = s.replace(old, new, 1)

# 5. Give confirmed pending action highest precedence in synthetic tool use.
old = '''      if (deterministicBookingInput && iter === 0) {
        response = {
          id: "deterministic-slot-selection",
          type: "message",
          role: "assistant",
          model: turnModel,
          content: ['''

new = '''      if (deterministicConfirmedAction && iter === 0) {
        response = {
          id: "deterministic-confirmed-action",
          type: "message",
          role: "assistant",
          model: turnModel,
          content: [
            {
              type: "tool_use",
              id: "deterministic-confirmed-action",
              name: deterministicConfirmedAction.toolName,
              input: deterministicConfirmedAction.input,
            },
          ],
          stop_reason: "tool_use",
          stop_sequence: null,
          usage: { input_tokens: 0, output_tokens: 0 },
        } as Anthropic.Messages.Message;
      } else if (deterministicBookingInput && iter === 0) {
        response = {
          id: "deterministic-slot-selection",
          type: "message",
          role: "assistant",
          model: turnModel,
          content: ['''

if old not in s:
    raise SystemExit("synthetic confirmation precedence anchor not found")
s = s.replace(old, new, 1)

# 6. Skip fake analytics for the new deterministic confirmation call too.
old = '''      if (
        !(deterministicBookingInput && iter === 0) &&
        !(deterministicAvailabilityInput && iter === 0)
      ) {'''

new = '''      if (
        !(deterministicConfirmedAction && iter === 0) &&
        !(deterministicBookingInput && iter === 0) &&
        !(deterministicAvailabilityInput && iter === 0)
      ) {'''

if old not in s:
    raise SystemExit("analytics deterministic anchor not found")
s = s.replace(old, new, 1)

# 7. When public website booking asks for confirmation, stop immediately
# with that authoritative readback. This also prevents duplicate write calls
# from the same model response from executing.
old = '''        const result: AgentToolResult = { toolCallId: tu.id, ok: true, output };
        allToolResults.push(result);
        toolResultsForThisIter.push({
          type: "tool_result",
          tool_use_id: tu.id,
          // Hard-capped (token economy, 2026-07-16): an unbounded connector
          // payload must never ride the loop at full size — it gets re-sent
          // every remaining iteration AND every later turn's history rebuild.
          // The FULL output still persists on the turn row (allToolResults).
          content: serializeToolResultCapped(output),
        });'''

new = '''        const result: AgentToolResult = { toolCallId: tu.id, ok: true, output };
        allToolResults.push(result);
        toolResultsForThisIter.push({
          type: "tool_result",
          tool_use_id: tu.id,
          // Hard-capped (token economy, 2026-07-16): an unbounded connector
          // payload must never ride the loop at full size — it gets re-sent
          // every remaining iteration AND every later turn's history rebuild.
          // The FULL output still persists on the turn row (allToolResults).
          content: serializeToolResultCapped(output),
        });

        if (
          usePublicContextBudget &&
          output &&
          typeof output === "object" &&
          (output as { needsConfirmation?: unknown }).needsConfirmation === true
        ) {
          const readBack = (output as { readBack?: unknown }).readBack;
          finalText =
            typeof readBack === "string" && readBack.trim().length > 0
              ? readBack
              : "Please confirm those appointment details.";
          break turnLoop;
        }'''

if old not in s:
    raise SystemExit("tool result anchor not found")
s = s.replace(old, new, 1)

p.write_text(s, encoding="utf-8")
print("PASS: deterministic public booking confirmation flow wired")
