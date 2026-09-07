from pathlib import Path

p = Path(r"packages/crm/src/lib/agents/runtime.ts")
s = p.read_text(encoding="utf-8")

# 1. Import the pure helper.
old = '''import {
  enforceExplicitConfirmation,
  latestPendingConfirmationAction,
} from "@/lib/agents/explicit-confirmation";'''

new = '''import {
  enforceExplicitConfirmation,
  latestPendingConfirmationAction,
} from "@/lib/agents/explicit-confirmation";
import {
  localDateYmd,
  shouldForceGenericAvailabilityLookup,
} from "@/lib/agents/public-availability-intent";'''

if old not in s:
    raise SystemExit("import anchor not found")
s = s.replace(old, new, 1)

# 2. Build a deterministic availability input next to the existing
# deterministic booking fast-path.
old = '''  const bookingTool = tools.find((tool) => tool.name === "book_appointment");
  const missingSelectionFields ='''

new = '''  const bookingTool = tools.find((tool) => tool.name === "book_appointment");
  const availabilityTool = tools.find(
    (tool) => tool.name === "look_up_availability",
  );
  const deterministicAvailabilityInput =
    agent.archetype === "website-chatbot" &&
    availabilityTool &&
    shouldForceGenericAvailabilityLookup(input.userMessage)
      ? {
          date: localDateYmd(
            new Date(),
            orgRow.timezone ?? "UTC",
          ),
        }
      : null;

  const missingSelectionFields ='''

if old not in s:
    raise SystemExit("availability input anchor not found")
s = s.replace(old, new, 1)

# 3. Extend the existing synthetic-response branch.
old = '''      if (deterministicBookingInput && iter === 0) {
        response = {
          id: "deterministic-slot-selection",
          type: "message",
          role: "assistant",
          model: turnModel,
          content: [
            {
              type: "tool_use",
              id: "deterministic-slot-selection",
              name: "book_appointment",
              input: deterministicBookingInput,
            },
          ],
          stop_reason: "tool_use",
          stop_sequence: null,
          usage: { input_tokens: 0, output_tokens: 0 },
        } as Anthropic.Messages.Message;
      } else {'''

new = '''      if (deterministicBookingInput && iter === 0) {
        response = {
          id: "deterministic-slot-selection",
          type: "message",
          role: "assistant",
          model: turnModel,
          content: [
            {
              type: "tool_use",
              id: "deterministic-slot-selection",
              name: "book_appointment",
              input: deterministicBookingInput,
            },
          ],
          stop_reason: "tool_use",
          stop_sequence: null,
          usage: { input_tokens: 0, output_tokens: 0 },
        } as Anthropic.Messages.Message;
      } else if (deterministicAvailabilityInput && iter === 0) {
        response = {
          id: "deterministic-availability",
          type: "message",
          role: "assistant",
          model: turnModel,
          content: [
            {
              type: "tool_use",
              id: "deterministic-availability",
              name: "look_up_availability",
              input: deterministicAvailabilityInput,
            },
          ],
          stop_reason: "tool_use",
          stop_sequence: null,
          usage: { input_tokens: 0, output_tokens: 0 },
        } as Anthropic.Messages.Message;
      } else {'''

if old not in s:
    raise SystemExit("synthetic response anchor not found")
s = s.replace(old, new, 1)

# 4. Don't record a fake LLM generation for either deterministic path.
old = '''      if (!(deterministicBookingInput && iter === 0)) {
        captureLlmGeneration({'''

new = '''      if (
        !(deterministicBookingInput && iter === 0) &&
        !(deterministicAvailabilityInput && iter === 0)
      ) {
        captureLlmGeneration({'''

if old not in s:
    raise SystemExit("analytics anchor not found")
s = s.replace(old, new, 1)

p.write_text(s, encoding="utf-8")
print("PASS: deterministic public availability fast-path wired")
