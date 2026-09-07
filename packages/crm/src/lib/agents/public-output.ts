import type { AgentToolCall, AgentToolResult } from "@/db/schema";
import { buildBookingReadBack, formatSlotLabel } from "./tools";
import { sanitizeUnbackedOperationalPromises } from "./validators";

/**
 * Final public-output boundary for the website agent.
 *
 * A model may paraphrase a tool result instead of reading it back verbatim.
 * For the pre-confirmation booking call, that is unsafe because the model can
 * expose the machine ISO. Rebuild the sentence from the structured call and
 * the workspace timezone before anything is persisted or streamed.
 */
export function enforcePublicAgentOutput(
  response: string,
  calls: readonly AgentToolCall[],
  results: readonly AgentToolResult[],
  timezone?: string,
): string {
  for (let index = calls.length - 1; index >= 0; index -= 1) {
    const call = calls[index];
    if (call.name !== "book_appointment") continue;

    const input = call.input;
    if (!input || typeof input !== "object") continue;
    const inputRecord = input as Record<string, unknown>;
    const result = results.find((candidate) => candidate.toolCallId === call.id);
    if (!result?.ok) continue;

    const fullName = inputRecord.fullName;
    const slotIso = inputRecord.slotIso;
    if (typeof fullName !== "string" || typeof slotIso !== "string") continue;

    const output = result.output;
    const outputRecord = output && typeof output === "object"
      ? (output as Record<string, unknown>)
      : null;

    if (inputRecord.confirmed === true && outputRecord?.ok === true && (timezone || typeof outputRecord.displayTime === "string")) {
      const displayTime =
        typeof outputRecord.displayTime === "string" && outputRecord.displayTime.trim()
          ? outputRecord.displayTime
          : formatSlotLabel(slotIso, timezone ?? "UTC");

      const checkoutUrl =
        typeof outputRecord.checkoutUrl === "string" && outputRecord.checkoutUrl.trim()
          ? outputRecord.checkoutUrl.trim()
          : "";
      const paymentRequired =
        outputRecord.paymentRequired === true || Boolean(checkoutUrl);

      if (paymentRequired) {
        if (checkoutUrl) {
          return `Your slot is reserved for ${displayTime}. Complete payment to finalize your appointment: ${checkoutUrl}`;
        }
        return `Your slot is reserved for ${displayTime}, but payment is still required to finalize the appointment. Please contact the business to complete payment.`;
      }

      return `Done — you're booked for ${displayTime}.`;
    }

    if (inputRecord.confirmed !== true) {
      // executeTurn may already have constructed the authoritative readback
      // from the exact offered slot label. Preserve that safe text at the SSE
      // boundary instead of rebuilding it without a timezone (the route does
      // not carry org context). This was the live raw-ISO regression.
      if (!/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/.test(response)) {
        return sanitizeUnbackedOperationalPromises(response, calls, results);
      }
      const toolReadBack = typeof outputRecord?.readBack === "string"
        ? outputRecord.readBack.trim()
        : "";
      if (
        toolReadBack &&
        !/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/.test(toolReadBack)
      ) {
        return toolReadBack;
      }
      if (timezone) {
        return buildBookingReadBack({ fullName, slotIso, timezone });
      }
      return "Please confirm those appointment details.";
    }
  }

  return sanitizeUnbackedOperationalPromises(response, calls, results);
}
