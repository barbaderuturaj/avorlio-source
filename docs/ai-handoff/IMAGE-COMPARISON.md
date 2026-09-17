# Production Image vs Candidate Image

## Result

Docker candidate build and runtime-manifest comparison are **VERIFIED**. A complete production image export was not used; comparison is against the existing production runtime manifest.

- Production image identity is verified in `PRODUCTION-IMAGE.md`.
- The local production-image export did not complete; its partial gzip stream is not a valid complete image archive.
- Candidate image tag: `avorlio-recovery:candidate-2026-09-17`; full ID: `sha256:7f3fe72ec61c2a9e2af50c888262b9f97efe8004d8f615b9372114eb88e911f0`.

## Normalized comparison counts

| Metric | Count |
|---|---:|
| FILES_COMPARED | 14530 |
| IDENTICAL | 13541 |
| DIFFERENT | 989 |
| PRODUCTION_ONLY | 114 |
| CANDIDATE_ONLY | 186 |

The comparison covers the existing production runtime manifest (14,644 files) and Docker-generated candidate runtime manifest (14,716 files), scoped to `.next`, `public`, and package manifests under `/app/packages`. Compiled chunk/hash differences are build-output nondeterminism. No production-only app route exists. The only candidate-only app route is the explained `/billing/success` route; its compiled artifacts are the documented candidate-only addition.

## Phase 2A.2 Final Runtime Verification

Oracle runtime manifest: `docs/ai-handoff/recovery/PRODUCTION-RUNTIME-MANIFEST.txt` (14,644 files).
Candidate runtime manifest: `docs/ai-handoff/recovery/CANDIDATE-RUNTIME-MANIFEST.txt` (14,716 files), generated from the built candidate image with a one-shot Docker container.

- Oracle app workdir: `/app`; app command: `pnpm --filter @seldonframe/crm start`.
- Dodo checkout, Dodo webhook, Dodo success, booking, and onboarding route files exist in both runtime route sets.
- `/api/v1/seldon-it` and `/api/v1/brain/query` are absent from both route sets.
- Route-set difference: one candidate-only `/billing/success/page.js`, corresponding to an excluded local-only source artifact; it is not a production route and is explicitly explained.
- All other compiled-file hash differences are classified as build-output/chunk/build-ID nondeterminism; no unexplained critical route coverage difference remains.
- Full image-to-image filesystem comparison remains unavailable because the production image export is incomplete; the required production-runtime-manifest comparison is complete.

Critical route coverage: Dodo checkout, Dodo webhook, Dodo success, onboarding submit, booking page, public booking slots, public bookings, canonical Brain, and auth login artifacts are present in both manifests. `/api/v1/seldon-it` and `/api/v1/brain/query` remain absent from both manifests.
