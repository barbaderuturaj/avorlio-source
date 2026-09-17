# Avorlio: five-minute AI handoff

Avorlio is a done-for-you AI Front Office for **US residential HVAC** businesses.
The current operating priority is a stable production service and acquiring/onboarding
customers—not reviving the older broad SeldonFrame platform roadmap.

## What is verified

The public corresponding-source baseline is commit
`f817f1c259c700720b85f1bef1a24a42e546c8a7` in
`barbaderuturaj/avorlio-source`, tagged
`avorlio-prod-reconstructed-2026-09-17`. It was reconstructed and validated
against an Oracle Docker deployment on 2026-09-17. It is not proven to be the
original Git commit used to build that image. See `16-CURRENT-STATE.md` and
`PRODUCTION-PROVENANCE.md`.

## What the repository contains

The active product is `packages/crm`: a Next.js 16 application containing the
dashboard, public HVAC sites, chat, booking, onboarding, CRM, integrations,
and Dodo billing. `packages/core` provides shared primitives, `packages/payments`
contains payment-domain utilities, and `skills/`/`blocks/` retain inherited
SeldonFrame infrastructure. Much of the latter is historical capability, not
current Avorlio launch scope.

## AI FIRST 5 COMMANDS

```powershell
git status --porcelain=v1 -uall
git branch --show-current
git rev-parse HEAD
git log -5 --oneline
pnpm --filter @seldonframe/crm build
```

Inspect the relevant code before editing. For a framework/proxy change, read
the installed Next 16 documentation first; `proxy.ts`, not `middleware.ts`, is
the routing entry point.

## Read by task

- Architecture and flow: `02-ARCHITECTURE.md`, `03-REPO-MAP.md`
- Runtime/env/deploy: `04-RUNTIME-AND-ENV.md`, `07-DEPLOYMENT.md`
- Database/migrations: `05-DATABASE.md`
- Dodo: `09-BILLING-DODO.md`
- HVAC customer lifecycle: `10-HVAC-CUSTOMER-FLOW.md`
- Tests/limits/operations: `11-TESTING-AND-QA.md` through `14-OPERATIONS-RUNBOOK.md`

Never casually alter production, migrations, auth, billing, or secrets. Older
README/legacy SeldonFrame material may describe features and verticals that are
not current Avorlio launch scope. Current code plus provenance documents win.

