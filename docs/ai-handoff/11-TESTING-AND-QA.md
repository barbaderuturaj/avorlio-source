# Testing and QA

## Commands

Run from the repository root:

    pnpm build
    pnpm test:unit
    pnpm --filter @seldonframe/crm db:check-journaled
    pnpm --filter @seldonframe/crm test:cross-block

Use focused unit tests under packages/crm/tests/unit/ for changed billing,
booking, onboarding, migration, agent, or integration behavior. The integration
first-run smoke test is pnpm test:first-run and requires its configured API
base; do not treat it as an offline unit test. E2E assets live under
packages/crm/e2e/.

## Recovery validation snapshot

For the reconstructed source validation on 2026-09-17:

- Production build: **PASS**
- Tests: **95 pass, 1 skipped, 0 fail**
- Candidate-only typecheck regressions: **0**
- Migration parity: **VERIFIED**
- Dodo parity: **VERIFIED**

This is a historical verification snapshot, not automatically current CI state.

## Typecheck caveat

Do not claim the whole inherited codebase has a clean full typecheck merely
because the recovery candidate introduced zero new type regressions. “Build
PASS” and “candidate-only type regressions 0” are narrower claims. Run and
report the relevant command for the change at hand.

