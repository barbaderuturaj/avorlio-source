# Database and migrations

Avorlio uses PostgreSQL through `@neondatabase/serverless` and Drizzle. Schema
definitions live in `packages/crm/src/db/schema/`; `organizations` is the main
workspace/tenant record, with JSONB for settings, integrations, Soul/theme, and
subscription state. Booking, onboarding, contact/CRM, agent, and workflow table
families have separate schema modules and migrations.

## Tenant and JSONB safety

Preserve `orgId` scoping on every tenant-facing query. Do not read-modify-write
whole organization JSONB blobs when modifying a subtree; use the targeted SQL
merge/`jsonb_build_object`/`jsonb_set` pattern used by current billing code to
avoid clobbering concurrent siblings.

## Hybrid migration system

`packages/crm/drizzle/` is deliberately hybrid:

- Drizzle-managed SQL files recorded in `drizzle/meta/_journal.json` are applied
  by `drizzle-kit migrate`.
- A documented baseline of hand-authored, out-of-band files is intentionally not
  journaled and is protected by `scripts/check-migrations-journaled.mjs`.

Run `pnpm --filter @seldonframe/crm db:check-journaled` before migration work.
Do not casually run `db:migrate`, `db:push`, or production helper scripts;
inspect the migration path, target database, and deployment plan first. Recovery
validation on 2026-09-17 verified migration parity, but that is not permission
to apply anything to production.

## Dodo and onboarding persistence

Dodo state is stored in `organizations.subscription`: provider, Dodo customer/
subscription/product IDs, status, tier, period fields, and processed webhook IDs.
The Dodo SQL update is idempotent. Onboarding links/forms and booking records
are persisted through the onboarding and bookings schema/modules; never export
rows or customer data to repository files.

