# Product and launch scope

## Current production / current launch

Avorlio is a done-for-you AI Front Office for **US residential HVAC only**.
The practical customer surface is a managed business workspace: public website,
web chat, booking/calendar workflows, CRM/operator visibility, onboarding, and
the Dodo subscription checkout path. The code contains the HVAC-specific offer
identifier `avorlio_hvac` in `packages/crm/src/lib/billing/dodo-checkout.ts` and
an HVAC onboarding form in `packages/crm/src/lib/onboarding/hvac-form-definition.ts`.

## Currently supported in source

- Workspace-scoped public pages, bookings, and web-agent runtime in `packages/crm`.
- Dodo checkout and subscription webhooks, documented in `09-BILLING-DODO.md`.
- Customer onboarding links/forms and dashboard readiness surfaces.
- Google Calendar, Resend email, and Twilio integration code when configured.

## Deferred / post-launch

SMS and voice are not assumed launch requirements. The repository has Twilio,
OpenAI Realtime, marketplace, and automation code, but their existence does not
make them part of the initial Avorlio customer offer. Treat activation as an
explicit product/operations decision.

## Historical upstream SeldonFrame capability

The inherited repository describes a multi-vertical, self-service agent/marketplace
platform, blocks, MCP workflows, Stripe paths, and many vertical examples. These
are historical or reusable implementation assets—not evidence that plumbing,
med-spa, marketplace, voice, or agency expansion is currently launched.

