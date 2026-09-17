# Runtime and environment

## Docker runtime

The root `Dockerfile` builds the pnpm workspace and starts `@seldonframe/crm`
on port 3000. `docker-compose.yml` defines `postgres`, `neon-proxy`, one-shot
`migrate`, `litellm`, and `app` services. The application exposes port 3000;
the local Neon proxy maps 4444. `docker-compose.ghcr.yml` is an optional image
override, not evidence of a current automated deployment pipeline.

The self-host compose topology uses plain Postgres behind a Neon SQL-over-HTTP
proxy; normal runtime database access stays in `src/db/index.ts`.

## Environment variable names

Never place values in documentation or commits. Source is authoritative for the
complete set; these names are the operationally relevant groups.

- **Core/runtime:** `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `WORKSPACE_BASE_DOMAIN`,
  `AUTH_SECRET`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`.
- **AI:** `ANTHROPIC_API_KEY`, `ANTHROPIC_AGENT_MODEL`, `ANTHROPIC_BASE_URL`,
  `OPENAI_API_KEY`.
- **Dodo launch billing:** `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY`,
  `DODO_PAYMENTS_ENVIRONMENT`, `DODO_PAYMENTS_HVAC_PRODUCT_ID`.
- **Optional integrations:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `RESEND_API_KEY`, `AUTH_RESEND_KEY`, `AUTH_RESEND_FROM`, `DEFAULT_FROM_EMAIL`,
  `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`.
- **Development/self-host only:** `NEON_LOCAL_HOST`, `NEON_LOCAL_PORT`, and compose
  image selection `SELDONFRAME_IMAGE`.
- **Deferred/historical feature flags:** `SF_MARKETPLACE_BILLING`,
  `SF_OAUTH_ENABLED`, `SF_REFERRALS_ENABLED`, plus voice-specific variables.

`.env.docker.example` is a self-host template. Treat all `.env*` files as
private configuration even when an example exists; do not print or copy values.

