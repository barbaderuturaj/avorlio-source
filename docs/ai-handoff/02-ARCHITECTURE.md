# Architecture

## Application shape

This is a pnpm/Turborepo workspace (`package.json`, `pnpm-workspace.yaml`). The
main runtime is `packages/crm`, a Next.js 16.2.10 / React 19 application. It
contains App Router pages, route handlers, server actions, Drizzle schema, and
domain libraries. `packages/core` is shared code; `packages/payments`, `packages/cli`,
`skills/`, and `blocks/` are supporting or inherited packages.

## Runtime and tenancy

PostgreSQL access is through Drizzle and Neon HTTP (`packages/crm/src/db/index.ts`).
`organizations` is the workspace/tenant root; business records are generally
scoped by `orgId`. Settings, integrations, soul, theme, and subscription state
are JSONB-backed fields. Preserve org scoping and use atomic SQL/JSONB patterns
where concurrent state matters.

`packages/crm/src/proxy.ts` handles host-aware routing and access gates. It
recognizes Avorlio app/marketing hosts, resolves workspace subdomains from
`WORKSPACE_BASE_DOMAIN`, and rewrites public workspace home, booking, forms,
and service paths. Do not add `middleware.ts`.

## Major data flows

- **Public site/chat:** public workspace routes feed generated site surfaces;
  agent execution is centered in `src/lib/agents/runtime.ts`, with prompts,
  validators, tools, and booking bindings under `src/lib/agents/`.
- **Booking:** public booking UI/routes use `src/lib/bookings/`; slot reservation
  is deliberately atomic and can synchronize through Google Calendar helpers.
- **Onboarding:** a tokenized form becomes a change plan and applies workspace
  surfaces (Soul, booking, contacts, theme/domain) through `src/lib/onboarding/`.
- **Billing:** authorized checkout creates a Dodo session; a signed webhook
  persists subscription state and activates onboarding only on `subscription.active`.
- **Auth:** NextAuth is primary interactive auth, with narrowly scoped admin-token
  and operator-portal contexts in `src/lib/auth/`.

## AI and integrations

The runtime resolves an AI client via `src/lib/ai/client` and the agent runtime
uses Anthropic-oriented prompts/tools/validators. Docker Compose routes Anthropic
requests through LiteLLM when self-hosted. Google Calendar, Resend, Twilio, and
Composio code live under `src/lib/integrations`, `src/lib/emails`, `src/lib/sms`,
and related auth/deployment libraries. Availability in source is not a claim
that every integration is configured in production.

