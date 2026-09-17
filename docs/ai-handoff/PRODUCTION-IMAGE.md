# Production Image Identity

- Container: `seldonframe-app-1`
- Full container ID: `66b4059338243f4ae51259647d2ac34c5fb339f1c86ccb49a8320551e917fe69`
- Full image ID: `sha256:bb7ae5b21f4fd65071541b710825acc78aa8ad832d19c28b821e9c8cc6cda919`
- Config image: `seldonframe-app`
- Repo tags: `seldonframe-app:dodo-stage-rc3`, `seldonframe-app:latest`
- Repo digest: `seldonframe-app@sha256:bb7ae5b21f4fd65071541b710825acc78aa8ad832d19c28b821e9c8cc6cda919`
- Image created: `2026-09-14T07:25:59.921262831Z`
- Container created: `2026-09-14T07:25:59.921262831Z`
- Container started: `2026-09-14T07:26:00.541743098Z`
- Image size reported by Docker: `709020569` bytes

## Phase 2A.3 Final Docker Candidate Verification

- Candidate tag: `avorlio-recovery:candidate-2026-09-17`
- Candidate full image ID: `sha256:7f3fe72ec61c2a9e2af50c888262b9f97efe8004d8f615b9372114eb88e911f0`
- Candidate image size: `825061111` bytes
- Candidate build: **PASS** using the existing root `Dockerfile` and production build path.

## Export

A compressed `docker image save` stream was attempted directly from Oracle to `.recovery-tmp/production-image.tar.gz`. The transfer was stopped locally after prolonged low throughput. The resulting partial archive is not valid evidence and was not inspected as a complete image.

No archive was written on Oracle. No production container was created, restarted, or modified.

## Phase 2A.2 Final Candidate Verification

- Docker CLI: `29.7.2`; Buildx: `v0.36.1-desktop.1`.
- This was the prior Phase 2A.2 checkpoint state; Docker access was restored for Phase 2A.3.
- The Phase 2A.3 candidate image is recorded above and was built without changing global Buildx configuration.
- Local production build: **PASS** (`pnpm build`, 4/4 tasks successful).
