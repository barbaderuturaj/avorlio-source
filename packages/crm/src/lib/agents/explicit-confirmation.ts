const CONFIRMED_WRITE_TOOLS = new Set([
  "book_appointment",
  "reschedule_appointment",
  "cancel_appointment",
]);

type HistoricalToolCall = {
  id: string;
  name: string;
  input?: unknown;
};

type HistoricalToolResult = {
  toolCallId: string;
  ok: boolean;
  output?: unknown;
};

type HistoricalTurn = {
  role: string;
  content?: string | null;
  toolCalls?: HistoricalToolCall[] | null;
  toolResults?: HistoricalToolResult[] | null;
};

export type PendingConfirmationAction = {
  toolName: string;
  input: Record<string, unknown>;
};

/**
 * Intentionally strict: selecting a slot or saying that it "works" is not the
 * same as affirming the server-generated action readback.
 */
export function isExplicitAffirmativeConfirmation(text: string | null | undefined): boolean {
  const normalized = (text ?? "")
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;

  // Any correction, hesitation, cancellation, or replacement language wins over
  // an affirmative prefix. "yes but change it" must never authorize a write.
  if (
    /\b(?:do not|don't|not yet|maybe|wait|hold on|change|instead|cancel that)\b/.test(
      normalized,
    )
  ) {
    return false;
  }
  if (/^(?:what|when|where|which|who|why|how)\b/.test(normalized)) return false;

  // Accept ordinary human confirmations rather than requiring an exact one-word
  // response. The guard above keeps correction/hesitation phrases fail-closed.
  return /^(?:yes(?:\s+(?:please|perfect|thanks|thank you|that's correct|that is correct|this is correct|that's right|that is right|said already))?|yeah|yep|sure(?:\s+go ahead)?|that's right|that is right|correct|confirm(?: it)?|please confirm(?: it)?|go ahead|go ahead and confirm(?: it)?|go ahead and (?:book|reschedule|cancel)(?: it)?)$/.test(
    normalized,
  );
}

/** True only when a prior successful call of this action requested confirmation. */
export function hasPriorToolConfirmationRequest(
  turns: HistoricalTurn[],
  toolName: string,
): boolean {
  return latestPendingConfirmationAction(turns, toolName) !== null;
}

/** Return the exact action payload that produced the latest NeedsConfirmation. */
export function latestPendingConfirmationAction(
  turns: HistoricalTurn[],
  toolName?: string,
): PendingConfirmationAction | null {
  const pendingFromTurn = (
    turn: HistoricalTurn,
    requiredReadBack?: string,
  ): PendingConfirmationAction | null => {
    if (!turn.toolCalls || !turn.toolResults) return null;

    for (const call of turn.toolCalls) {
      if (toolName && call.name !== toolName) continue;

      const result = turn.toolResults.find(
        (candidate) => candidate.toolCallId === call.id,
      );
      if (!result?.ok || !result.output || typeof result.output !== "object") {
        continue;
      }

      const output = result.output as {
        needsConfirmation?: unknown;
        readBack?: unknown;
      };
      if (output.needsConfirmation !== true) continue;

      if (
        requiredReadBack !== undefined &&
        (typeof output.readBack !== "string" ||
          output.readBack.trim() !== requiredReadBack)
      ) {
        continue;
      }

      return {
        toolName: call.name,
        input:
          call.input && typeof call.input === "object"
            ? { ...(call.input as Record<string, unknown>), confirmed: false }
            : { confirmed: false },
      };
    }

    return null;
  };

  let latestAssistantIndex = -1;
  for (let index = turns.length - 1; index >= 0; index--) {
    if (turns[index]?.role === "assistant") {
      latestAssistantIndex = index;
      break;
    }
  }

  if (latestAssistantIndex < 0) return null;

  const latestAssistant = turns[latestAssistantIndex]!;
  const directPending = pendingFromTurn(latestAssistant);
  if (directPending) return directPending;

  // A pending write may produce its server readBack on one assistant turn and
  // then be repeated verbatim as a text-only assistant turn after the visitor
  // asks for clarification ("did you check?", etc.). Preserve confirmation
  // authority only across that exact one-assistant-turn replay. Never revive an
  // arbitrary older pending action.
  const echoedReadBack =
    typeof latestAssistant.content === "string"
      ? latestAssistant.content.trim()
      : "";
  if (!echoedReadBack) return null;

  for (let index = latestAssistantIndex - 1; index >= 0; index--) {
    const previousAssistant = turns[index];
    if (previousAssistant?.role !== "assistant") continue;
    return pendingFromTurn(previousAssistant, echoedReadBack);
  }

  return null;
}

/** Stateless template history retains text only, so recognize its prior readback. */
export function hasPriorTextConfirmationRequest(
  messages: Array<{ role: string; content: string }>,
  toolName: string,
): boolean {
  const previousAssistant = [...messages]
    .reverse()
    .find((message) => message.role === "assistant")?.content;
  if (
    typeof previousAssistant !== "string" ||
    !/\bis (?:that|this) correct\??\s*$/i.test(previousAssistant.trim())
  ) {
    return false;
  }
  if (/\b(?:cancel|cancellation)\b/i.test(previousAssistant)) {
    return toolName === "cancel_appointment";
  }
  if (/\b(?:move|reschedule)\b/i.test(previousAssistant)) {
    return toolName === "reschedule_appointment";
  }
  return toolName === "book_appointment";
}

/**
 * A model-supplied confirmed:true is advisory, never authority. If the current
 * user did not explicitly affirm a prior readback, downgrade to the existing
 * confirmed:false path so the real tool returns NeedsConfirmation/readBack.
 */
export function enforceExplicitConfirmation(
  toolName: string,
  input: unknown,
  latestUserMessage: string | null | undefined,
  pendingAction: PendingConfirmationAction | null,
  confirmationConsumed = false,
): unknown {
  if (!CONFIRMED_WRITE_TOOLS.has(toolName) || !input || typeof input !== "object") {
    return input;
  }
  const record = input as Record<string, unknown>;
  const explicitConfirmation = isExplicitAffirmativeConfirmation(latestUserMessage);
  if (
    !confirmationConsumed &&
    pendingAction?.toolName === toolName &&
    explicitConfirmation
  ) {
    // The proposal payload is authoritative. Only the confirmation bit changes;
    // the model cannot swap a slot, target, booking slug, or contact details.
    return { ...pendingAction.input, confirmed: true };
  }
  if (record.confirmed !== true) return input;
  return { ...record, confirmed: false };
}
