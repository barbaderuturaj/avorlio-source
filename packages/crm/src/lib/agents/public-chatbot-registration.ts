type ChatbotStatus = "draft" | "test" | "live";

type ChatbotEmbedRecord = {
  embedUrl: string;
  agentId: string;
};

export type PublicChatbotEmbedRegistrar = (
  orgId: string,
  record: ChatbotEmbedRecord,
) => Promise<void>;

export type HvacCreateFullChatbotRegistrationResult =
  | { registered: true }
  | { registered: false; reason: "non_hvac" | "not_live" | "missing_agent_id" | "missing_embed_url" | "failed" };

export async function registerHvacCreateFullChatbotEmbed(input: {
  workspaceId: string;
  personality: string | null | undefined;
  chatbotStatus: ChatbotStatus | null | undefined;
  chatbotAgentId: string | null | undefined;
  chatbotEmbedUrl: string | null | undefined;
  register: PublicChatbotEmbedRegistrar;
  onRegistrationError?: (error: unknown) => void;
}): Promise<HvacCreateFullChatbotRegistrationResult> {
  if (input.personality !== "hvac") return { registered: false, reason: "non_hvac" };
  if (input.chatbotStatus !== "live") return { registered: false, reason: "not_live" };

  const agentId = input.chatbotAgentId?.trim();
  if (!agentId) return { registered: false, reason: "missing_agent_id" };

  const embedUrl = input.chatbotEmbedUrl?.trim();
  if (!embedUrl) return { registered: false, reason: "missing_embed_url" };

  try {
    await input.register(input.workspaceId, { agentId, embedUrl });
    return { registered: true };
  } catch (error) {
    input.onRegistrationError?.(error);
    return { registered: false, reason: "failed" };
  }
}
