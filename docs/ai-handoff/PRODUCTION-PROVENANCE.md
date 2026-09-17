# Production Provenance

## Identifiers

- Oracle image ID: `sha256:bb7ae5b21f4fd65071541b710825acc78aa8ad832d19c28b821e9c8cc6cda919`
- Oracle Git SHA: unavailable; `/home/ubuntu/seldonframe/.git` is absent.
- Candidate base commit: `cf08f0947f36070d6297d77f46a45bc62bd763ae`
- Candidate Docker image tag: `avorlio-recovery:candidate-2026-09-17`
- Candidate Docker image ID: `sha256:7f3fe72ec61c2a9e2af50c888262b9f97efe8004d8f615b9372114eb88e911f0`

## Scoped source fingerprint

The fingerprint uses sorted `SHA-256  normalized/path` records. It excludes Git metadata, dependencies, Next/build output, logs, uploads, temporary/runtime directories, `.env*`, certificate/key extensions, archives, and candidate handoff documents.

- Production host source files: `5,316`
- `PRODUCTION_SOURCE_FINGERPRINT`: `b8e212b10193f1b6236e710ebe87566ce29a939d905486d4445b894e1644bcfc`
- Candidate source files: `5,175`
- `CANDIDATE_SOURCE_FINGERPRINT`: `ad000e27c4c4899da4142f7bb2436ab568d18ab05edddb5acae972be34ce597a`
- Shared identical files: `4,973`
- Shared differing files: `95`
- Production-only: `248`
- Candidate-only: `107`

The fingerprints do not match. This remains expected for the reconstructed mixed recovery state and is not evidence that the candidate exactly equals the baked image. The candidate Docker image is built and its runtime manifest was compared to the existing production runtime manifest.

## Provenance statement

The recovery tree is a reconstructed corresponding-source candidate for review, associated with the Oracle deployment image identified above. It must not be described as “built from commit X”; no evidence maps the image to a Git commit.

## Docker Runtime Evidence

The candidate image was built from the existing root `Dockerfile` and tagged as `avorlio-recovery:candidate-2026-09-17`. The Docker-generated candidate runtime manifest contains 14,716 scoped files versus 14,644 in the existing production runtime manifest: 13,541 identical hashes, 989 differing hashes, 114 production-only paths, and 186 candidate-only paths. No production-only app route exists; the only candidate-only app route is the documented `/billing/success` route.

## Remaining source evidence

The exact path-level comparison is available in the temporary normalized manifests under `.recovery-tmp/`. Active Dodo/build/onboarding source was recovered from the Oracle host and the candidate build passes, but image-to-source identity remains unproven.

## Phase 2A.2 Final Production-Required Scope

The authoritative scope is derived from the Oracle production source tree and includes production source, build/configuration, public assets, workspace package source, blocks/skills/integrations/souls, and migration source; it excludes Git metadata, dependencies, generated output, handoff/recovery docs, tests/QA artifacts, logs, caches, archives, backups, dumps, and secrets.

- Required paths: `3,109`.
- `PRODUCTION_REQUIRED_SOURCE_FINGERPRINT`: `272ad2f731bb2c5a95b9431ebc3bc0ebbf1d5e768d027bf17e78bc8de9c060fb`.
- `CANDIDATE_ON_PRODUCTION_SCOPE_FINGERPRINT`: `ba2e0a8dc5ee5e425e073c8870fab6e8ec3fdd655f648066864062fd946b159f`.
- Missing production-required paths: `0`.
- Exact remaining source difference: `packages/crm/src/app/api/v1/onboarding/[token]/submit/route.ts`; candidate changes `submitted.length` to `submitted.rows.length`, a behavior-preserving type correction required by the installed Neon result type. This is the only deliberate, documented candidate deviation.
- Candidate-only extra files remain outside the production scope and are preserved/reported separately; the original 97 unreleased artifacts remain untouched.
