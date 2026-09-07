from pathlib import Path

p = Path(r"packages/crm/src/lib/agents/public-slot-selection.ts")
s = p.read_text(encoding="utf-8")

anchor = '''export function recoverPublicBookingFields(
  userMessages: readonly string[],
): RecoveredBookingFields {
  const text = userMessages.join("\\n");
  const appointmentService = text.match(
    /\\b(?:earliest|first|next|available|an?|the)\\s+(.+?)\\s+appointment\\b/i,
  )?.[1]
    ?.replace(/^available\\s+/i, "")
    .trim();
  return {
    fullName: lastLabeledValue(text, ["name", "full name"]),
    phone: lastLabeledValue(text, ["phone", "telephone", "mobile"]),
    email: lastLabeledValue(text, ["email", "e-mail"]),
    address: lastLabeledValue(text, ["address"]),
    issue: lastLabeledValue(text, ["issue", "problem"]),
    service: lastLabeledValue(text, ["service"]) ?? appointmentService,
  };
}'''

replacement = '''export function recoverPublicBookingFields(
  userMessages: readonly string[],
): RecoveredBookingFields {
  const text = userMessages.join("\\n");
  const appointmentService = text.match(
    /\\b(?:earliest|first|next|available|an?|the)\\s+(.+?)\\s+appointment\\b/i,
  )?.[1]
    ?.replace(/^available\\s+/i, "")
    .trim();
  const availabilityService = text.match(
    /\\b(?:available|availability|openings?|times?|slots?)\\s+(?:for\\s+)?(.+?)(?:\\?|$)/im,
  )?.[1]
    ?.replace(/^(?:for\\s+)/i, "")
    .trim();

  return {
    fullName: lastLabeledValue(text, ["name", "full name"]),
    phone: lastLabeledValue(text, ["phone", "telephone", "mobile"]),
    email: lastLabeledValue(text, ["email", "e-mail"]),
    address: lastLabeledValue(text, ["address"]),
    issue: lastLabeledValue(text, ["issue", "problem"]),
    service:
      lastLabeledValue(text, ["service"]) ??
      appointmentService ??
      availabilityService,
  };
}

export type PublicBookingConversationTurn = {
  role: string;
  content?: string | null;
};

function normalizePhoneCandidate(value: string): string | undefined {
  const match = value.match(/(?:\\+?\\d[\\d\\s().-]{7,}\\d)/);
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
    .replace(/^[\\s,;:-]+|[\\s,;:-]+$/g, "")
    .replace(/\\s+/g, " ")
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
): RecoveredBookingFields {
  const userMessages = turns
    .filter(
      (turn): turn is PublicBookingConversationTurn & { content: string } =>
        turn.role === "user" && typeof turn.content === "string",
    )
    .map((turn) => turn.content);

  const recovered = recoverPublicBookingFields(userMessages);

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
      /\\b(?:what|which)\\s+(?:full\\s+)?name\\b|\\bname should i use\\b/i.test(
        question,
      ) &&
      answer.length <= 120
    ) {
      recovered.fullName = answer;
    }

    const asksForPhone = /\\b(?:phone|mobile|telephone)\\b/i.test(question);
    const asksForAddress = /\\b(?:street\\s+address|address)\\b/i.test(question);

    if (asksForPhone && !recovered.phone) {
      recovered.phone = normalizePhoneCandidate(answer);
    }

    if (asksForAddress && !recovered.address) {
      const phone = normalizePhoneCandidate(answer);
      recovered.address = phone
        ? stripPhoneFromAnswer(answer, phone)
        : answer;
    }
  }

  return recovered;
}'''

if anchor not in s:
    raise SystemExit("recoverPublicBookingFields anchor not found")

s = s.replace(anchor, replacement, 1)
p.write_text(s, encoding="utf-8")

print("PASS: conversational booking-field recovery added")
