# Safe operations runbook

## Local inspection

    git status --porcelain=v1 -uall
    git branch --show-current
    git rev-parse HEAD
    git log -5 --oneline
    pnpm build
    pnpm test:unit
    pnpm --filter @seldonframe/crm db:check-journaled

Inspect local Compose state without changing it:

    docker compose ps
    docker compose logs --tail 200 app

## Route and workflow checks

Verify the intended public host/path using a browser or a non-mutating request.
For changed functionality, check the exact flow: public website, chat, booking,
Dodo checkout initiation (not a real purchase without authorization), onboarding,
or calendar/email behavior as applicable. Record what was observed and distinguish
local, staging, and production evidence.

## Before any production request

- Read `.avorlio-release.json` first; verify its exact source commit and Docker
  image identity. Never infer a deployed Git SHA from filesystem timestamps.
- Review migration implications; do not run migrations by default.
- Confirm required environment variable names/configuration without printing values.
- Obtain explicit authorization for production mutation.
- Preserve logs/evidence and perform a targeted post-change verification.

Do not make destructive production commands the default. There is no claim here
that a production deploy, rollback, migration, or provider configuration occurred.

## Release continuity closeout

Before calling a production deployment continuity-complete, confirm the source
commit is committed, corresponding AGPL source is public, the image is built,
migrations are handled or verified, the release manifest is generated and
copied to production, its image and public source SHA match the deployment, and
post-deploy smoke checks pass. Validate the manifest with `pnpm release:verify`.
