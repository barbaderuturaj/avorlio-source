import type { AgentToolCall, AgentToolResult } from "@/db/schema";

export type OfferedSlot = {
  iso: string;
  label: string;
};

export type PublicSlotSelection =
  | { kind: "matched"; slot: OfferedSlot; index: number }
  | { kind: "ambiguous"; slots: OfferedSlot[] }
  | { kind: "no_match" };

export type AvailabilityTurn = {
  role: string;
  content?: string | null;
  toolCalls?: AgentToolCall[] | null;
  toolResults?: AgentToolResult[] | null;
};

export type PublicBookingIntakeField = {
  id: string;
  label: string;
  required?: boolean;
};

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/\u202f|\u00a0/g, " ")
    .replace(/[.,!?;:]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function validSlots(output: unknown): OfferedSlot[] {
  if (!output || typeof output !== "object") return [];
  const rawSlots = (output as { slots?: unknown }).slots;
  if (!Array.isArray(rawSlots)) return [];
  return rawSlots.filter(
    (slot): slot is OfferedSlot =>
      Boolean(slot) &&
      typeof slot === "object" &&
      typeof (slot as { iso?: unknown }).iso === "string" &&
      (slot as { iso: string }).iso.trim().length > 0 &&
      typeof (slot as { label?: unknown }).label === "string" &&
      (slot as { label: string }).label.trim().length > 0,
  );
}

/**
 * Finds the newest successful availability result, without relying on the
 * bounded model-message array. This keeps selection state available even when
 * older conversational messages are omitted from a provider request.
 */
export function latestSuccessfulAvailabilitySlots(
  turns: readonly AvailabilityTurn[],
): OfferedSlot[] {
  for (let turnIndex = turns.length - 1; turnIndex >= 0; turnIndex -= 1) {
    const turn = turns[turnIndex];
    if (turn.role !== "assistant") continue;
    const calls = turn.toolCalls ?? [];
    const results = turn.toolResults ?? [];
    for (let callIndex = calls.length - 1; callIndex >= 0; callIndex -= 1) {
      const call = calls[callIndex];
      if (call.name !== "look_up_availability") continue;
      const result = results.find((candidate) => candidate.toolCallId === call.id);
      if (!result?.ok) continue;
      if (
        result.output &&
        typeof result.output === "object" &&
        Array.isArray((result.output as { slots?: unknown }).slots)
      ) {
        // An authoritative successful empty result supersedes older offers;
        // never let a stale slot become selectable after a fresh no-availability
        // lookup.
        return validSlots(result.output);
      }
    }
  }
  return [];
}

function ordinalIndex(text: string): number | null {
  const normalized = normalizeText(text);
  const match = normalized.match(
    /^(?:the\s+)?(?:(?:option|choice)\s+)?(first|1st|one|1|second|2nd|two|2|third|3rd|three|3)(?:\s+(?:one|option|choice|slot))?$/,
  );
  if (!match) return null;
  const value = match[1];
  if (["first", "1st", "one", "1"].includes(value)) return 0;
  if (["second", "2nd", "two", "2"].includes(value)) return 1;
  if (["third", "3rd", "three", "3"].includes(value)) return 2;
  return null;
}

type SlotTime = { hour: number; minute: number; minuteSpecified: boolean; meridiem?: string };

function extractTime(text: string): SlotTime | null {
  const time = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (time) {
    return {
      hour: Number(time[1]),
      minute: time[2] ? Number(time[2]) : 0,
      minuteSpecified: Boolean(time[2]),
      meridiem: time[3]?.toLowerCase(),
    };
  }
  const oClock = text.match(/\b(\d{1,2})\s*o['’]?clock\b/i);
  if (oClock) {
    return { hour: Number(oClock[1]), minute: 0, minuteSpecified: false };
  }
  const dateTime = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/i);
  return dateTime
    ? {
        hour: Number(dateTime[1]),
        minute: dateTime[2] ? Number(dateTime[2]) : 0,
        minuteSpecified: Boolean(dateTime[2]),
      }
    : null;
}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

function extractMonthDay(text: string): { month: number; day: number } | null {
  const match = text.match(
    new RegExp(`\\b(${MONTHS.join("|")})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "i"),
  );
  if (!match) return null;
  return {
    month: MONTHS.indexOf(match[1]!.toLowerCase() as (typeof MONTHS)[number]),
    day: Number(match[2]),
  };
}

function matchesTime(text: string, label: string): boolean {
  const requested = extractTime(text);
  const offered = extractTime(label);
  if (!requested || !offered || requested.hour !== offered.hour) return false;
  if (requested.meridiem && requested.meridiem !== offered.meridiem) return false;
  if (requested.minuteSpecified && requested.minute !== offered.minute) return false;
  const requestedDate = extractMonthDay(text);
  const offeredDate = extractMonthDay(label);
  return !requestedDate || (
    Boolean(offeredDate) &&
    requestedDate.month === offeredDate!.month &&
    requestedDate.day === offeredDate!.day
  );
}

/** Resolve only against slots actually returned by the latest availability call. */
export function resolvePublicSlotSelection(
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
}

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

  if (hasSuccessfulConfirmedBookingAfter(turns, offerTurnIndex)) {
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
}

function hasSuccessfulConfirmedBookingAfter(
  turns: readonly AvailabilityTurn[],
  afterTurnIndex: number,
): boolean {
  for (let turnIndex = afterTurnIndex + 1; turnIndex < turns.length; turnIndex += 1) {
    const turn = turns[turnIndex];
    if (turn?.role !== "assistant") continue;
    for (const call of turn.toolCalls ?? []) {
      if (call.name !== "book_appointment") continue;
      const input = call.input && typeof call.input === "object"
        ? call.input as Record<string, unknown>
        : null;
      if (input?.confirmed !== true) continue;
      const result = (turn.toolResults ?? []).find(
        (candidate) => candidate.toolCallId === call.id,
      );
      const output = result?.output && typeof result.output === "object"
        ? result.output as Record<string, unknown>
        : null;
      if (result?.ok && output?.ok === true) return true;
    }
  }
  return false;
}

/**
 * Return only the current booking attempt: the user request that immediately
 * preceded the latest successful availability result, plus subsequent turns.
 * A newer availability lookup starts a new attempt, and a successful booking
 * retires the attempt. This prevents old customer intake from leaking into a
 * later booking while preserving slot + field continuity during one attempt.
 */
export function latestPublicBookingAttemptTurns<T extends AvailabilityTurn>(
  turns: readonly T[],
): T[] {
  let offerTurnIndex = -1;
  for (let turnIndex = turns.length - 1; turnIndex >= 0; turnIndex -= 1) {
    const turn = turns[turnIndex];
    if (turn?.role !== "assistant") continue;
    const hasSuccessfulAvailability = (turn.toolCalls ?? []).some((call) => {
      if (call.name !== "look_up_availability") return false;
      const result = (turn.toolResults ?? []).find(
        (candidate) => candidate.toolCallId === call.id,
      );
      return Boolean(
        result?.ok &&
        result.output &&
        typeof result.output === "object" &&
        Array.isArray((result.output as { slots?: unknown }).slots),
      );
    });
    if (hasSuccessfulAvailability) {
      offerTurnIndex = turnIndex;
      break;
    }
  }

  if (offerTurnIndex < 0 || hasSuccessfulConfirmedBookingAfter(turns, offerTurnIndex)) {
    return [];
  }

  let startIndex = offerTurnIndex;
  for (let index = offerTurnIndex - 1; index >= 0; index -= 1) {
    if (turns[index]?.role === "user") {
      startIndex = index;
      break;
    }
  }
  return turns.slice(startIndex);
}

export type RecoveredBookingFields = {
  fullName?: string;
  phone?: string;
  email?: string;
  address?: string;
  issue?: string;
  service?: string;
  intakeResponses?: Record<string, string>;
};

export type PublicBookingToolInput = {
  fullName: string;
  phone?: string;
  email?: string;
  slotIso: string;
  confirmed: false;
  bookingSlug?: string;
  intakeResponses: Record<string, string>;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function lastLabeledValue(text: string, labels: readonly string[]): string | undefined {
  const labelPattern = labels.map(escapeRegExp).join("|");
  const matches = Array.from(
    text.matchAll(new RegExp(`(?:^|\\n)\\s*(?:${labelPattern})\\s*:\\s*([^\\n]+)`, "gi")),
  );
  return matches.at(-1)?.[1]?.trim() || undefined;
}

/** Recover explicit customer fields from user-authored turns only. */
export function recoverPublicBookingFields(
  userMessages: readonly string[],
): RecoveredBookingFields {
  const text = userMessages.join("\n");
  const appointmentService = text.match(
    /\b(?:earliest|first|next|available|an?|the)\s+(.+?)\s+appointment\b/i,
  )?.[1]
    ?.replace(/^available\s+/i, "")
    .trim();
  const availabilityService = text.match(
    /\b(?:available|availability|openings?|slots?|appointments?)\s+for\s+(.+?)(?:\?|$)/im,
  )?.[1]
    ?.trim();
  const openTimesService = text.match(
    /\bwhat\s+times?(?:\s+do\s+you\s+have)?(?:\s+are)?\s+(?:available|open)\s+for\s+(.+?)(?:\?|$)/im,
  )?.[1]
    ?.trim();

  return {
    fullName: lastLabeledValue(text, ["name", "full name"]),
    phone: lastLabeledValue(text, ["phone", "telephone", "mobile"]),
    email: lastLabeledValue(text, ["email", "e-mail"]),
    address: lastLabeledValue(text, ["address"]),
    issue: lastLabeledValue(text, ["issue", "problem"]),
    service:
      lastLabeledValue(text, ["service"]) ??
      appointmentService ??
      availabilityService ??
      openTimesService,
  };
}

export type PublicBookingConversationTurn = {
  role: string;
  content?: string | null;
};

function normalizePhoneCandidate(value: string): string | undefined {
  const match = value.match(/(?:\+?\d[\d\s().-]{7,}\d)/);
  return match?.[0]?.trim() || undefined;
}

function stripPhoneFromAnswer(
  answer: string,
  phone: string | undefined,
): string | undefined {
  if (!phone) return undefined;
  const index = answer.indexOf(phone);
  if (index < 0) return undefined;
  const remainder = `${answer.slice(0, index)} ${answer.slice(index + phone.length)}`
    .replace(/^[\s,;:-]+|[\s,;:-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return remainder || undefined;
}

/**
 * Recover booking fields from the real public-chat conversation.
 *
 * Keeps labeled user input as the primary source, then supplements it from
 * narrow assistant-question -> user-answer pairs such as:
 *
 *   "What name should I use?" -> "Rutu"
 *   "What's your phone number and full street address?" ->
 *     "5555555555 plano street usa"
 *
 * This avoids asking the model to remember transactional booking state.
 */
export function recoverPublicBookingFieldsFromTurns(
  turns: readonly PublicBookingConversationTurn[],
  intakeFields: readonly PublicBookingIntakeField[] = [],
): RecoveredBookingFields {
  const userMessages = turns
    .filter(
      (turn): turn is PublicBookingConversationTurn & { content: string } =>
        turn.role === "user" && typeof turn.content === "string",
    )
    .map((turn) => turn.content);

  const recovered = recoverPublicBookingFields(userMessages);
  const intakeResponses: Record<string, string> = {};

  for (const field of intakeFields) {
    const labeled = lastLabeledValue(userMessages.join("\n"), [
      field.id.replace(/_/g, " "),
      field.label.replace(/[?.!]+$/g, ""),
    ]);
    if (labeled) intakeResponses[field.id] = labeled;
  }

  for (let index = 0; index < turns.length - 1; index += 1) {
    const assistant = turns[index];
    const user = turns[index + 1];

    if (
      assistant?.role !== "assistant" ||
      user?.role !== "user" ||
      typeof assistant.content !== "string" ||
      typeof user.content !== "string"
    ) {
      continue;
    }

    const question = assistant.content.trim();
    const answer = user.content.trim();
    if (!answer) continue;

    if (
      !recovered.fullName &&
      /\b(?:what|which)\s+(?:full\s+)?name\b|\bname should i use\b/i.test(
        question,
      ) &&
      answer.length <= 120
    ) {
      recovered.fullName = answer;
    }

    const asksForPhone = /\b(?:phone|mobile|telephone)\b/i.test(question);
    const asksForEmail = /\b(?:email|e-mail)\b/i.test(question);
    const asksForAddress = /\b(?:street\s+address|address)\b/i.test(question);

    if (asksForPhone && !recovered.phone) {
      recovered.phone = normalizePhoneCandidate(answer);
    }

    if (asksForAddress && !recovered.address) {
      const phone = normalizePhoneCandidate(answer);
      recovered.address = phone
        ? stripPhoneFromAnswer(answer, phone)
        : answer;
    }

    if (asksForEmail && !recovered.email) {
      recovered.email = answer.match(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/)?.[0];
    }

    for (const field of intakeFields) {
      if (
        !intakeResponses[field.id] &&
        question === buildPublicBookingFieldQuestion(field)
      ) {
        intakeResponses[field.id] = answer;
      }
    }
  }

  for (const field of intakeFields) {
    const known = getRecoveredBookingFieldValue(recovered, field.id);
    if (known && !intakeResponses[field.id]) intakeResponses[field.id] = known;
  }
  if (Object.keys(intakeResponses).length > 0) {
    recovered.intakeResponses = intakeResponses;
  }

  return recovered;
}

export function getRecoveredBookingFieldValue(
  fields: RecoveredBookingFields,
  fieldId: string,
): string | undefined {
  const id = fieldId.trim().toLowerCase();
  if (["name", "full_name", "fullname"].includes(id)) return fields.fullName;
  if (["phone", "telephone", "mobile"].includes(id)) return fields.phone;
  if (["email", "e-mail"].includes(id)) return fields.email;
  if (["address", "service_address"].includes(id)) return fields.address;
  if (["issue", "issue_type", "problem", "concern"].includes(id)) {
    return fields.issue ?? fields.intakeResponses?.[fieldId];
  }
  if (["service", "service_type"].includes(id)) return fields.service;
  return fields.intakeResponses?.[fieldId];
}

export function buildPublicBookingFieldQuestion(
  field: PublicBookingIntakeField,
): string {
  const id = field.id.trim().toLowerCase();
  if (["phone", "telephone", "mobile"].includes(id)) {
    return "What phone number should we use for the appointment?";
  }
  if (["email", "e-mail"].includes(id)) {
    return "What email address should we use for the appointment?";
  }
  if (["address", "service_address"].includes(id)) {
    return "What is the service address for the appointment?";
  }
  if (["issue", "issue_type", "problem", "concern"].includes(id)) {
    return "What is happening with the system?";
  }
  if (id === "urgency") return "How urgent is this request?";
  const label = field.label.replace(/[?.!]+$/g, "").trim().toLowerCase();
  return `Please provide ${label} for the appointment.`;
}

export function missingPublicBookingFields(
  fields: RecoveredBookingFields,
  intakeFields: readonly PublicBookingIntakeField[],
  additionalRequiredFields: readonly string[] = [],
): string[] {
  return [...new Set([
    !fields.fullName ? "name" : null,
    !fields.phone && !fields.email ? "phone or email" : null,
    ...intakeFields
      .filter((field) => field.required === true)
      .map((field) =>
        getRecoveredBookingFieldValue(fields, field.id)?.trim()
          ? null
          : field.id,
      ),
    ...additionalRequiredFields.map((field) =>
      getRecoveredBookingFieldValue(fields, field)?.trim() ? null : field,
    ),
  ].filter((field): field is string => Boolean(field)))];
}

export function buildPublicBookingMissingFieldMessage(
  fieldId: string | undefined,
  intakeFields: readonly PublicBookingIntakeField[],
): string | null {
  if (!fieldId) return null;
  if (fieldId === "name") return "What name should I use for the appointment?";
  if (fieldId === "phone or email") {
    return "What phone number or email should we use?";
  }
  const templateField = intakeFields.find((field) => field.id === fieldId);
  return templateField
    ? buildPublicBookingFieldQuestion(templateField)
    : `What is the ${fieldId.replace(/_/g, " ")} for the appointment?`;
}

export function buildPublicBookingToolInput(
  slot: OfferedSlot,
  fields: RecoveredBookingFields & { fullName: string },
  bookingSlug?: string,
): PublicBookingToolInput {
  const intakeResponses = Object.fromEntries(
    Object.entries({
      ...(fields.intakeResponses ?? {}),
      phone: fields.phone,
      address: fields.address,
      issue: fields.issue,
      service: fields.service,
    }).filter(([, value]) => typeof value === "string" && value.trim().length > 0),
  ) as Record<string, string>;
  return {
    fullName: fields.fullName,
    phone: fields.phone,
    email: fields.email,
    slotIso: slot.iso,
    confirmed: false,
    bookingSlug,
    intakeResponses,
  };
}

/** Customer-facing confirmation for the deterministic public selection path. */
export function buildPublicSlotConfirmationReadBack(
  fullName: string,
  slot: OfferedSlot,
  service?: string,
): string {
  const subject = service?.trim()
    ? `${service.trim()} for ${fullName}`
    : `the appointment for ${fullName}`;
  return `Just to confirm: ${subject} on ${slot.label}. Is that correct?`;
}
