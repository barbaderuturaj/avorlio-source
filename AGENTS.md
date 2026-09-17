# READ THIS FIRST — Avorlio AI instructions

## Project identity

- **Project:** Avorlio
- **Historical codebase name:** SeldonFrame
- **Current product:** done-for-you AI Front Office
- **Current launch niche:** **US residential HVAC only**
- **Operating priority:** production stability and customer acquisition. Do not
  broaden into cross-vertical product work unless explicitly requested.

## Source of truth

When sources conflict, use this order:

1. Current source code and its tests
2. Verified recovery/provenance documents, especially
   `docs/ai-handoff/PRODUCTION-PROVENANCE.md`
3. `docs/ai-handoff/`
4. Older upstream SeldonFrame documentation

The public canonical repository is
`https://github.com/barbaderuturaj/avorlio-source`. The reconstructed
production-source anchor is `f817f1c259c700720b85f1bef1a24a42e546c8a7`, tagged
`avorlio-prod-reconstructed-2026-09-17`.

This is verified reconstructed corresponding source, **not proof** that the
currently running Oracle image was originally built from that Git commit.

## Safety rules

- Inspect before modifying. Keep changes narrow and source-grounded.
- Never put credentials, tokens, private keys, customer data, or sales data in
  source or public docs.
- Do not mutate production, deploy, run production migrations, or alter billing
  or auth without explicit instruction.
- Preserve the HVAC-only launch scope.
- Build/test after meaningful source changes; distinguish code-correct from
  production-verified and never claim deployment without verification.
- Do not use destructive Git cleanup to discard local work.

## Next.js 16.2+ rule

This repository uses Next 16.2+. Read the relevant guide under
`node_modules/.pnpm/next@*/node_modules/next/dist/docs/` before changing
routing or proxy behavior. `packages/crm/src/proxy.ts` replaces legacy
`middleware.ts`; do **not** create `middleware.ts`.

## Continue here

Read [the five-minute handoff](docs/ai-handoff/00-START-HERE.md), then the
topic document relevant to the task. If `.avorlio-private/` exists, read only
its `README.md` when operator/private context is relevant; it is local-only and
must never be staged.
