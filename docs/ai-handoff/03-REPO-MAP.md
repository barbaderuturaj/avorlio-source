# Repository map for coding tasks

| If changing… | Inspect first |
| --- | --- |
| Dodo billing | `src/lib/billing/dodo-client.ts`, `dodo-checkout.ts`, `dodo-subscription.ts`, `src/app/api/webhooks/dodo/route.ts`, `src/app/api/billing/dodo/checkout/route.ts`, dashboard `clients/[slug]/ready/` |
| Web chatbot / agent behavior | `src/lib/agents/runtime.ts`, `prompt.ts`, `validators.ts`, `tools.ts`, `skills/website-chatbot/`, public agent routes |
| Booking | `src/lib/bookings/`, `src/components/bookings/`, `src/app/book/[orgSlug]/[bookingSlug]/page.tsx`, `src/lib/agents/booking/` |
| Customer onboarding | `src/lib/onboarding/`, `src/components/onboarding/`, `src/app/(onboarding)/welcome/`, `src/app/api/v1/onboarding/[token]/submit/route.ts` |
| Customer website/public routing | `src/proxy.ts`, `src/app/(public)/`, `src/app/(dashboard)/clients/`, `src/lib/landing/`, `src/lib/page-*` |
| Database | `src/db/schema/`, `drizzle/`, `scripts/check-migrations-journaled.mjs`, `scripts/migrate-tolerant.mjs` |
| Auth | `src/auth.ts`, `src/lib/auth/`, `src/app/api/auth/`, `src/proxy.ts` |
| Email/calendar/SMS | `src/lib/integrations/`, `src/lib/emails/`, `src/lib/calendar/`, `src/lib/sms/`, `src/lib/telephony/` |
| Deployment | root `Dockerfile`, `docker-compose.yml`, `docker-compose.ghcr.yml`, `scripts/docker-migrate.sh`, CRM migration scripts |
| Tests | `packages/crm/tests/unit/`, `packages/crm/e2e/`, root `scripts/run-unit-tests.js` |

All paths in this table are relative to `packages/crm` unless a root path is
explicitly named. Search adjacent tests and schema before changing behavior.

