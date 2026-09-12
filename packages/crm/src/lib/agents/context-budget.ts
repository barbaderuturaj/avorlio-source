import type { TurnMessage, TurnMessageContent } from "./turn-messages";

/**
 * Keep public-web requests comfortably below the smallest provider limit we
 * currently support (8,000 TPM). This is a request budget, not a database
 * retention limit: historical agent_turns are never deleted or rewritten.
 */
export const PUBLIC_AGENT_REQUEST_BUDGET_TOKENS = 7_000;
export const PUBLIC_AGENT_OUTPUT_RESERVE_TOKENS = 1_024;
export const PUBLIC_AGENT_MIN_MESSAGE_BUDGET_TOKENS = 800;

export const PUBLIC_AGENT_RETRY_MESSAGE =
  "I’m having trouble processing that right now. Please try again in a moment.";

export type BoundedPublicMessages = {
  messages: TurnMessage[];
  originalMessageCount: number;
  includedMessageCount: number;
  estimatedTokensBefore: number;
  estimatedTokensAfter: number;
  trimmed: boolean;
};

/** A deliberately conservative, deterministic estimate for request sizing. */
export function estimatePublicAgentTokens(value: unknown): number {
  let serialized: string;
  try {
    serialized = typeof value === "string" ? value : JSON.stringify(value ?? null) ?? "";
  } catch {
    serialized = "[unserializable]";
  }
  return Math.ceil(serialized.length / 3);
}

function contentText(content: TurnMessageContent): string {
  if (typeof content === "string") return content;
  return content
    .map((block) => {
      if (block.type === "text") return block.text;
      if (block.type === "tool_use") {
        return `${block.name} ${JSON.stringify(block.input ?? null)}`;
      }
      return block.content;
    })
    .join("\n");
}

function isRelevantBookingContext(message: TurnMessage): boolean {
  return /\b(name|phone|email|address|issue|service|appointment|booking|book|slot|availability|available|confirm|confirmed|iso|timezone|scheduled|readback|startsat|starts_at)\b/i.test(
    contentText(message.content),
  );
}

function relatedMessageIndexes(messages: TurnMessage[], index: number): number[] {
  const related = [index];
  const message = messages[index];
  const hasToolUse = Array.isArray(message.content) && message.content.some((b) => b.type === "tool_use");
  const hasToolResult = Array.isArray(message.content) && message.content.some((b) => b.type === "tool_result");

  if (hasToolUse && messages[index + 1]?.role === "user") related.push(index + 1);
  if (hasToolResult && messages[index - 1]?.role === "assistant") related.push(index - 1);
  // Keep the immediately preceding user request with an assistant tool call so
  // the provider never receives a tool exchange without its initiating turn.
  if (hasToolUse && messages[index - 1]?.role === "user") related.push(index - 1);
  return related;
}

/**
 * Select a bounded chronological subset. Recent messages are preferred, with
 * older booking/customer-detail messages pinned when room remains. The
 * selection is pure and stable for the same input; no summarization call is
 * made and the original array is not mutated.
 */
export function boundPublicAgentMessages(
  messages: TurnMessage[],
  budgetTokens: number,
): BoundedPublicMessages {
  const safeBudget = Math.max(PUBLIC_AGENT_MIN_MESSAGE_BUDGET_TOKENS, Math.floor(budgetTokens));
  const before = estimatePublicAgentTokens(messages);
  if (before <= safeBudget) {
    return {
      messages,
      originalMessageCount: messages.length,
      includedMessageCount: messages.length,
      estimatedTokensBefore: before,
      estimatedTokensAfter: before,
      trimmed: false,
    };
  }

  const selected = new Set<number>();
  let used = 0;
  const tryAdd = (index: number) => {
    const indexes = relatedMessageIndexes(messages, index).filter((i) => !selected.has(i));
    const cost = indexes.reduce((sum, i) => sum + estimatePublicAgentTokens(messages[i]), 0);
    if (used + cost > safeBudget) return;
    indexes.forEach((i) => selected.add(i));
    used += cost;
  };

  // The current user turn is authoritative and must always be present.
  tryAdd(messages.length - 1);

  // Pin the latest relevant booking/customer-detail context first.
  for (let i = messages.length - 2; i >= 0; i--) {
    if (isRelevantBookingContext(messages[i])) tryAdd(i);
  }

  // Fill remaining capacity with the newest ordinary conversation turns.
  for (let i = messages.length - 2; i >= 0; i--) tryAdd(i);

  const bounded = messages.filter((_, index) => selected.has(index));
  const after = estimatePublicAgentTokens(bounded);
  return {
    messages: bounded,
    originalMessageCount: messages.length,
    includedMessageCount: bounded.length,
    estimatedTokensBefore: before,
    estimatedTokensAfter: after,
    trimmed: bounded.length !== messages.length,
  };
}
