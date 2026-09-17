# Migration Parity — Phase 2A.2

Migration framework: Drizzle ORM/Drizzle Kit with a documented hybrid model.

- Migration directory: `packages/crm/drizzle/`.
- Candidate SQL files: `101`.
- Candidate Drizzle journal entries: `56`, latest `0078_organizations_is_internal`.
- Runner: `db:migrate` invokes the journal guard, tolerant Drizzle runner, and schema-drift assertion; Docker migration uses current-schema export plus additive compatibility migrations.
- Production metadata query found no `public.__drizzle_migrations` table. No customer rows or connection-string values were queried or printed.
- Oracle required schema structure was verified read-only through `information_schema` for organizations/workspaces, onboarding, bookings, payment/billing events, subscriptions, and webhook tables.
- The source journal guard reports `0079_sms_message_external_idempotency.sql` as an unjournaled/unbaselined warning in both the recovered production source and candidate. No migration was run or changed.

Conclusion: **MIGRATION PARITY = VERIFIED** for the intentionally hybrid/journalless production model, with the documented `0079` source warning retained as a non-candidate-only issue.
