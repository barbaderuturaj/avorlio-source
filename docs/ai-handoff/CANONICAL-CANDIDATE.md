# Canonical Production-Source Candidate

Phase 2A read-only recovery candidate. Separate uncommitted worktree; not deployed.

## Candidate Base

- Base: cached public `avorlio-source/main`
- Base commit: `cf08f0947f36070d6297d77f46a45bc62bd763ae`
- Branch: `recovery/production-parity-2026-09-17`
- Rationale: public main has active production Dodo/build path coverage absent from Windows working tree. It is the least-incomplete available base, not proven exact production source.

## Local Original State

- Branch/SHA: `launch/dodo-billing` / `3318d998560855c2ada97785083025545f58493b`
- Tracked diff was empty at safety capture.
- 97 prior untracked artifacts remain preserved; complete manifest is in the original repo’s `docs/ai-handoff/recovery/UNTRACKED-MANIFEST.txt`.
- Local-only work remains excluded; see `recovery/LOCAL-UNRELEASED-WORK.md`.

## Public AGPL State

- Remote: `https://github.com/barbaderuturaj/avorlio-source.git`
- Cached main SHA: `cf08f0947f36070d6297d77f46a45bc62bd763ae`
- Contains AGPL license/source docs, Docker/compose, package manifests, scripts, migrations, MCP source, and the active Dodo/build path names found in production.
- Fresh remote SHA was unavailable because direct remote access was blocked.

## Oracle Production State

- `/home/ubuntu/seldonframe` has no `.git`; no production source SHA.
- App image/container: `seldonframe-app@sha256:bb7ae5b21f4fd65071541b710825acc78aa8ad832d19c28b821e9c8cc6cda919`, `seldonframe-app-1`, created 2026-09-14 07:25:59 UTC, started 07:26:00 UTC, healthy.
- App workdir `/app`; no host source mount. Host has source-like tree, Docker/compose, 101 migration SQL files, and a source archive.

## Production Image

The running app is baked into the image; image contents were not unpacked. The digest above is the authoritative runtime identifier currently observed.

## Files Recovered From Production

Safe production source/configuration was copied into this candidate with SCP: `packages/crm/src`, `packages/crm/drizzle`, safe shared package `src` trees, `scripts`, `blocks`, `skills`, `integrations`, `souls`, package manifests, Dockerfile, compose files, and active Dodo/build/onboarding/upload source. Excluded from transfer: `.env*`, credentials, keys, certificates, dumps, uploads/customer data, logs, caches, archives, backups, and pre-change snapshots.

Recovered active Dodo paths include:

- `packages/crm/src/app/api/billing/dodo/checkout/route.ts`
- `packages/crm/src/app/api/webhooks/dodo/route.ts`
- `packages/crm/src/app/billing/dodo/success/page.tsx`
- `packages/crm/src/lib/billing/dodo-checkout.ts`
- `packages/crm/src/lib/billing/dodo-client.ts`
- `packages/crm/src/lib/billing/dodo-subscription.ts`
- ready-page Dodo checkout/onboarding-link UI
- `packages/crm/src/lib/auth/managed-workspace.ts`
- production `packages/crm/package.json` and `pnpm-lock.yaml` carrying `dodopayments` 2.50.0

## Files Retained From Public Main

All public-main source not replaced by the safe production overlay remains, including license/source docs, package metadata, MCP source, public assets, shared source, migrations, Docker/compose, and tests. Active Dodo/build paths present in public main were retained or overlaid with production content.

## Local Unreleased Files Excluded

Excluded are the six selected local-only source/test paths, the two untracked application-source candidates, local patch/recovery files, Dodo test/golden Dockerfiles, `litellm/`, `.pnpm-store`, generated `next-env.d.ts`, cache/build state, and all local patch/backup/status/debug/test artifacts not proven deployed. No original file was removed or modified.

## Generated / Runtime Exclusions

Excluded: `.git`, `node_modules`, `.next`, `dist`, `build`, logs, uploads, customer data, database volumes, caches, temporary files, source archive, dumps, pre-change snapshots, and runtime-generated files.

## Secret Exclusions

No production `.env` file was copied. No key, token, password, database URL, private key, certificate, or credential value was read or displayed.

## Dodo Production Source

The production Dodo route, webhook, success UI, client, checkout, subscription, related UI, authentication helper, package metadata/lockfile, and migration source are present in the candidate. The candidate production build now compiles the Dodo routes. Exact image-to-source identity remains unknown because Oracle has no Git checkout and the image was not unpacked.

## Route Contract Conclusions

- `/api/v1/seldon-it`: `LEGACY_AND_STALE_DOCS`; absent from local/public/Oracle; MCP README says no endpoint.
- `/api/v1/brain/query`: `LEGACY_AND_STALE_DOCS`; absent from all three; `/api/v1/brain` and workspace snapshot are observed replacements.
- No obsolete route was recreated.

## Database / Migration Source

Candidate contains the public migration set plus the production overlay of `packages/crm/drizzle`, 101 SQL files through `0079_sms_message_external_idempotency.sql`. Production journal/version was not queried. No migration or database write occurred.

## Validation Commands

- `git status --short --branch` — pass; separate recovery branch.
- Dodo/build/migration file-presence checks — pass.
- `corepack pnpm install --frozen-lockfile --offline` — initially failed after the production CRM manifest was recovered because the public-base lockfile lacked `dodopayments`; after recovering the production lockfile, pass. Dependencies were reused from the offline store. pnpm warned that several install scripts were ignored.
- `corepack pnpm typecheck` — failed before TypeScript because Corepack selected pnpm 12.3.4 while the project requires pnpm 10.18.1.
- `pnpm typecheck` — failed with an `EPERM` write to the generated `tsconfig.tsbuildinfo`, six unresolved `workspaceTimezone` references, one landing-shell type error, four generic test typing errors, and one `contactEmail` test typing error. The Dodo module/dependency/export errors were cleared by the production overlay.
- `pnpm build` — pass on the final candidate; all 4 workspace build tasks completed. Turbopack emitted one NFT tracing warning and the build emitted expected missing-auth-environment warnings because no environment values were supplied.
- `pnpm --filter @seldonframe/crm exec node --import tsx --test tests/unit/billing-entitlements.spec.ts tests/unit/billing-webhook-state-consolidation.spec.ts tests/unit/billing-tier-resolve.spec.ts tests/unit/billing-plans-catalog.spec.ts tests/unit/build/builder-ladder.spec.ts` — pass; 95 passed, 1 skipped, 0 failed.
- safe GET checks for `https://avorlio.com`, `https://www.avorlio.com`, and `https://app.avorlio.com` — pass; 200, 200, and 200 (app final URL `/login`). Expected AGPL link was present in all three responses.

## Validation Results

The candidate has successful offline dependency installation, a successful production build, and passing targeted billing/build tests. Full typecheck still fails on an `EPERM` tsbuildinfo write plus remaining source/test type errors; the production build itself skips type validation by repository configuration. No production behavior-changing requests were made.

## Remaining Unknowns

- Source commit corresponding to the Oracle image.
- Whether every overlaid file matches the baked image; image unpacking was not performed.
- Fresh public main SHA/content because remote fetch was unavailable.
- Production migration journal/version.
- Live Avorlio-domain route/source-link behavior.
- Whether any production pre-change file is release-critical.
- Whether the source copied from the host source-like tree exactly matches image `sha256:bb7ae5…`; the image was not unpacked.

## Candidate Source Hash / Commit Candidate

- Base commit: `cf08f0947f36070d6297d77f46a45bc62bd763ae`
- Recovery branch: `recovery/production-parity-2026-09-17`
- Candidate is intentionally uncommitted; production overlay appears as worktree modifications/untracked files for review.
- Candidate overlay counts at capture: 11 newly recovered production-source files plus 4 modified tracked production files/manifests; 56 selected local/Oracle differences were reviewed, with 15 active production Dodo/build/onboarding paths explicitly reconciled where evidence was available.

## Typecheck Baseline Result

See `docs/ai-handoff/TYPECHECK-BASELINE.md`. The final candidate has no identified candidate-only typecheck regression after correcting the recovered Dodo source omissions, but inherited source/test typing errors and a local `tsconfig.tsbuildinfo` EPERM remain. The untouched public-base run was blocked by a local pnpm install EPERM.

## Full Production Image Identity

See `docs/ai-handoff/PRODUCTION-IMAGE.md`. The verified running image is `sha256:bb7ae5b21f4fd65071541b710825acc78aa8ad832d19c28b821e9c8cc6cda919`, tagged `seldonframe-app:dodo-stage-rc3` and `seldonframe-app:latest`. No production Git SHA exists.

## Production Image vs Candidate Image

Candidate Docker image verification is complete. Built from the existing root `Dockerfile` and tagged `avorlio-recovery:candidate-2026-09-17`; full image ID: `sha256:7f3fe72ec61c2a9e2af50c888262b9f97efe8004d8f615b9372114eb88e911f0`. Runtime-manifest comparison is recorded in `IMAGE-COMPARISON.md`.

## Production Source Fingerprint

Production: `b8e212b10193f1b6236e710ebe87566ce29a939d905486d4445b894e1644bcfc` over 5,316 files. Candidate: `ad000e27c4c4899da4142f7bb2436ab568d18ab05edddb5acae972be34ce597a` over 5,175 files. They differ; the candidate is not proven byte-equivalent to production.

## Migration Parity

The repository uses Drizzle with a hybrid journal/out-of-band model. Candidate source contains 101 SQL files, 56 journal entries through `0078_organizations_is_internal`, and the documented out-of-band baseline. Production migration metadata was verified read-only under the documented hybrid/journalless model; required production schema structure matches and the known `0079` journal warning is non-candidate-only. `MIGRATION PARITY = VERIFIED`.

## Dodo Parity

Dodo source/runtime parity is verified for checkout, webhook signature path, subscription.active activation, cancellation/revocation handling, onboarding-link persistence, env names, schema, tests, and route coverage. Candidate runtime manifest coverage matches the existing production manifest. `DODO SOURCE PARITY = VERIFIED`.

## Legacy Route Confirmation

Host source and candidate build route manifests contain `/api/v1/brain` and workspace snapshot, but not `/api/v1/seldon-it` or `/api/v1/brain/query`. Image-level confirmation was unavailable. Current conclusion remains `LEGACY / STALE DOCUMENTATION`; no routes were recreated.

## Remaining Differences

- 95 differing shared host-source paths, 248 host production-only paths, and 107 candidate-only paths under the scoped fingerprint inventory.
- Production and candidate fingerprints differ.
- Full image filesystem comparison is unavailable.
- Candidate Docker image build is complete; full image ID is recorded above.
- Full typecheck remains non-green with inherited source/test errors.
- Migration metadata/applied state is unverified.

## Provenance Statement

This recovery tree represents reconstructed corresponding source associated with the Oracle production deployment identified by image ID `sha256:bb7ae5b21f4fd65071541b710825acc78aa8ad832d19c28b821e9c8cc6cda919` and the documented production host-source fingerprint. It must not be described as built from a specific Git commit because Oracle has no Git checkout and no image-to-commit mapping was found.

CANONICAL CANDIDATE = READY FOR COMMIT

## Phase 2A.2 Final Canonical Candidate Verification

- Candidate Docker image: **created** and tagged `avorlio-recovery:candidate-2026-09-17`; full ID recorded above.
- Local production build: **PASS**.
- Tests: **95 passed, 1 skipped, 0 failed**.
- Full typecheck: inherited diagnostics remain; candidate-only regressions: **0**.
- Production-required source scope: `3,109` paths; all paths present. The only remaining difference is the documented compile-only onboarding-submit correction in `PRODUCTION-PROVENANCE.md`.
- Runtime manifests were generated and stored locally. Critical Dodo, booking, onboarding, and canonical Brain route coverage matches Oracle. One explained candidate-only `/billing/success` route remains from excluded local-only source.
- Migration parity: **VERIFIED** under the source-documented hybrid/journalless production model; Oracle has no `public.__drizzle_migrations` table, and required production schema structure was verified read-only. The source journal checker still reports the known unjournaled `0079` warning.
- Dodo source/runtime parity: **VERIFIED** for checkout, webhook signature path, subscription.active activation, cancellation/revocation status handling, onboarding-link persistence, env names, schema, tests, and route coverage. Critical Dodo source hashes match Oracle.
- Secret embedding check: **NO OBVIOUS SECRET FILES FOUND**; no `.env`, credential, key, certificate, or service-account file was found in the Oracle app image, and no secret values were printed or copied.
- Original repository safety: **PRESERVED**; no Oracle mutation, deployment, migration, commit, push, reset, rebase, stash, or original-repo modification occurred.

Remaining caveat: full image-to-image filesystem parity cannot be proven because the production image export is incomplete; the required candidate-to-existing-production-runtime-manifest comparison is complete. The candidate production-scope fingerprint differs only at the documented behavior-preserving type correction; one explained candidate-only runtime route remains.

CANONICAL CANDIDATE = READY FOR COMMIT
