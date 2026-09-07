// v1.26.2 — public agent turn endpoint
//
// POST /api/v1/public/agent/<slug>/turn
//   body: {
//     conversation_id?: string,        // omitted on first turn
//     anonymous_session_id?: string,   // browser-stable id from embed
//     message: string,
//     channel_meta?: object             // referrer, page url, etc.
//     stream?: boolean                  // v1.26.2 — opt-in SSE response
//   }
//   non-streaming response: { conversation_id, message, validators_critical_failed? }
//   streaming response (Content-Type: text/event-stream):
//     event: start    data: {"conversation_id":"..."}
//     event: delta    data: {"text":"..."}    (multiple)
//     event: done     data: {"conversation_id":"...","validators_critical_failed":false}
//     event: error    data: {"reason":"..."}
//
// Auth: anonymous. Agent's `slug` resolves to its workspace via
// `(orgs.slug, agents.slug)` join. Agent must be in 'live' or 'test' status.
//
// v1.26.2 SSE NOTE: the runtime still buffers the full response (validators
// run before any byte reaches the client — critical for safety). The SSE
// branch then chunks the buffered text and emits ~25ms-spaced delta events
// for typewriter UX. Real Anthropic-streaming-passthrough lands in v1.27
// alongside the multi-step tool-call streaming story.

import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { agents, organizations } from "@/db/schema";
import { executeTurn } from "@/lib/agents/runtime";
import { enforcePublicAgentOutput } from "@/lib/agents/public-output";
import { resolvePublicWebConversationWithDb } from "@/lib/agents/public-web-conversation-db";
import { decidePublicConversationStatus } from "@/lib/agents/public-turn-status";
import { getCurrentUser } from "@/lib/auth/helpers";

type Body = {
  conversation_id?: string;
  anonymous_session_id?: string;
  message?: string;
  channel_meta?: Record<string, unknown>;
  stream?: boolean;
  start_new_conversation?: boolean;
};

const CRITICAL_VALIDATORS = [
  "quotes_only_from_soul_pricing",
  "no_prompt_injection_echo",
  "no_pii_leak",
  "no_unbacked_operational_promises",
];

// v1.40.8 — CORS headers for cross-origin embed.
//
// The chat widget is loaded as <script src="https://app.seldonframe.com/...">
// on workspace subdomain pages (e.g. sunset-plumbing-co.app.seldonframe.com),
// AND on operator-owned external websites (foo.com). The fetch from
// inside the widget to .../turn is therefore cross-origin in BOTH cases.
//
// Pre-1.40.8 this endpoint returned no CORS headers; browsers blocked the
// fetch and the widget surfaced "Connection issue. Please try again." —
// surfaced first on the v1.40.7 chatbot embed test on sunset-plumbing-co.
//
// Origin = "*" is correct here: the chatbot is intentionally embeddable on
// any operator's site (that's the entire point), and the endpoint serves
// only public, conversation-scoped data. This route validates any supplied
// conversation_id against the resolved agent/org and anonymous session before
// it ever reaches the runtime. Loosening CORS doesn't loosen application
// authorization.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Max-Age": "86400",
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug: agentSlugPath } = await context.params;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json(
      { error: "missing_message" },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  if (message.length > 2000) {
    return NextResponse.json(
      { error: "message_too_long" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const wantsStream =
    body.stream === true ||
    request.headers.get("accept")?.includes("text/event-stream") ||
    request.nextUrl.searchParams.get("stream") === "1";

  // Resolve agent.
  const [orgSlugPart, agentSlugPart] = agentSlugPath.includes("--")
    ? agentSlugPath.split("--", 2)
    : [agentSlugPath, "default"];

  const [agentRow] = await db
    .select({
      id: agents.id,
      orgId: agents.orgId,
      orgSlug: organizations.slug,
      orgName: organizations.name,
      agentSlug: agents.slug,
      status: agents.status,
    })
    .from(agents)
    .innerJoin(organizations, eq(organizations.id, agents.orgId))
    .where(
      and(
        eq(organizations.slug, orgSlugPart),
        eq(agents.slug, agentSlugPart),
      ),
    )
    .limit(1);

  if (!agentRow) {
    return NextResponse.json(
      { error: "agent_not_found" },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  if (agentRow.status !== "live" && agentRow.status !== "test") {
    return NextResponse.json(
      { error: "agent_not_active", status: agentRow.status },
      { status: 403, headers: CORS_HEADERS },
    );
  }

  // 2026-05-22 — conversation status decision is now centralized in
  // decidePublicConversationStatus(). Pre-fix this endpoint copied
  // `agent.status === "test"` straight onto the conversation, which
  // caused the runtime testMode plumbing (tools.ts:120, 291) to short-
  // circuit booking + escalation tools for public visitors talking to
  // auto-deployed chatbots. Now anonymous callers always get "active";
  // only authenticated operators sending `x-test-mode: 1` get "test".
  // The /agents/[id]/test sandbox sends that header explicitly.
  const requestedTestMode =
    request.headers.get("x-test-mode")?.trim() === "1" ||
    request.nextUrl.searchParams.get("dryRun") === "1";
  let isAuthenticatedOperator = false;
  if (requestedTestMode) {
    // Only resolve the session when the caller is asking for test mode —
    // avoids paying the auth round-trip on every public turn.
    try {
      const user = await getCurrentUser();
      isAuthenticatedOperator = Boolean(user?.id);
    } catch {
      // Auth resolution failure → treat as anonymous (safe default).
      isAuthenticatedOperator = false;
    }
  }
  const conversationStatus = decidePublicConversationStatus({
    agentStatus: agentRow.status,
    requestedTestMode,
    isAuthenticatedOperator,
  });

  const conversationResolution = await resolvePublicWebConversationWithDb({
    suppliedConversationId: body.conversation_id,
    anonymousSessionId: body.anonymous_session_id,
    agentId: agentRow.id,
    orgId: agentRow.orgId,
    status: conversationStatus,
    channelMeta: body.channel_meta ?? {},
    startNewConversation: body.start_new_conversation === true,
  }).catch((err) => {
    console.error("public_agent_conversation_resolve_failed", {
      agentId: agentRow.id,
      orgId: agentRow.orgId,
      reason: err instanceof Error ? err.message : String(err),
    });
    return null;
  });

  if (!conversationResolution) {
    return NextResponse.json(
      { error: "conversation_create_failed" },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  const conversationId = conversationResolution.conversationId;

  if (conversationResolution.rejectedSuppliedReason) {
    console.warn("public_agent_conversation_id_rejected", {
      agentId: agentRow.id,
      orgId: agentRow.orgId,
      reason: conversationResolution.rejectedSuppliedReason,
    });
  }

  if (conversationResolution.abandonedStaleConversationId) {
    console.info("public_agent_stale_conversation_abandoned", {
      agentId: agentRow.id,
      orgId: agentRow.orgId,
      conversationId: conversationResolution.abandonedStaleConversationId,
    });
  }

  if (conversationResolution.abandonedResetConversationId) {
    console.info("public_agent_conversation_reset", {
      agentId: agentRow.id,
      orgId: agentRow.orgId,
      previousConversationId: conversationResolution.abandonedResetConversationId,
      conversationId,
    });
  }

  if (conversationResolution.created) {
    // 2026-08-07 — activation-moment analytics. Only for real ("active")
    // conversations — the operator test sandbox routes through this same
    // endpoint with status="test" (decidePublicConversationStatus above),
    // and that traffic must never count as activation. Fire-and-forget:
    // never awaited, internally swallows every error.
    if (conversationStatus === "active") {
      const { recordAgentConversationStarted } = await import(
        "@/lib/analytics/record-agent-activation"
      );
      void recordAgentConversationStarted({
        orgId: agentRow.orgId,
        agentId: agentRow.id,
        conversationId,
        channel: "web",
      });
    }
  }

  // SSE branch ───────────────────────────────────────────────────────────
  if (wantsStream) {
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        };
        try {
          send("start", { conversation_id: conversationId });
          const result = await executeTurn({
            conversationId: conversationId!,
            userMessage: message,
          });
          if (!result.ok) {
            send("delta", { text: result.fallbackMessage });
            send("done", {
              conversation_id: conversationId,
              degraded: true,
              reason: result.reason,
            });
            controller.close();
            return;
          }
          // Chunk + emit. Smaller chunks = smoother typewriter; we cap at
          // ~28 chars and pause ~22ms between chunks. Total response is
          // typically <600 chars so this lands in <500ms.
          const text = enforcePublicAgentOutput(
            result.assistantMessage,
            result.toolCalls,
            result.toolResults,
          );
          const chunks = chunkText(text, 28);
          for (const chunk of chunks) {
            send("delta", { text: chunk });
            await sleep(22);
          }
          send("done", {
            conversation_id: conversationId,
            validators_critical_failed: result.validators.some(
              (v) => !v.passed && CRITICAL_VALIDATORS.includes(v.name),
            ),
          });
          controller.close();
        } catch (err) {
          send("error", {
            reason: "internal_error",
            detail: err instanceof Error ? err.message : String(err),
          });
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        ...CORS_HEADERS,
      },
    });
  }

  // Non-streaming JSON branch (back-compat) ──────────────────────────────
  const result = await executeTurn({
    conversationId,
    userMessage: message,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        conversation_id: conversationId,
        message: result.fallbackMessage,
        degraded: true,
        reason: result.reason,
      },
      { headers: CORS_HEADERS },
    );
  }

  return NextResponse.json(
    {
      conversation_id: conversationId,
      message: enforcePublicAgentOutput(
        result.assistantMessage,
        result.toolCalls,
        result.toolResults,
      ),
      validators_critical_failed: result.validators.some(
        (v) => !v.passed && CRITICAL_VALIDATORS.includes(v.name),
      ),
    },
    { headers: CORS_HEADERS },
  );
}

// ─── helpers ────────────────────────────────────────────────────────────

function chunkText(text: string, maxLen: number): string[] {
  if (!text) return [""];
  // Split on word boundaries when possible so the typewriter pauses at
  // natural gaps. Falls back to fixed-width slicing for very long runs.
  const words = text.split(/(\s+)/);
  const out: string[] = [];
  let buf = "";
  for (const w of words) {
    if (buf.length + w.length > maxLen) {
      if (buf) out.push(buf);
      if (w.length > maxLen) {
        // very long token (URL, etc.) — slice
        for (let i = 0; i < w.length; i += maxLen) {
          out.push(w.slice(i, i + maxLen));
        }
        buf = "";
      } else {
        buf = w;
      }
    } else {
      buf += w;
    }
  }
  if (buf) out.push(buf);
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
