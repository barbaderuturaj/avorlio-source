# Local Unreleased Work Excluded From Canonical Candidate

The original Windows worktree was not altered. These local-only items remain excluded from the production candidate.

| Path/group | State | Production | Public main | Disposition |
|---|---|---|---|---|
| `packages/crm/src/app/(dashboard)/clients/[slug]/ready/checklist-actions.ts` | untracked | no | no | needs review |
| `packages/crm/src/app/(dashboard)/clients/[slug]/ready/internal-onboarding-checklist.tsx` | untracked | no | no | needs review |
| `packages/crm/src/lib/onboarding/internal-checklist.ts` | untracked | no | no | needs review |
| `packages/crm/src/lib/soul/generated-booking-price.ts` | untracked | no | no | needs review |
| corresponding two unit tests | untracked | no | no | later merge if approved |
| `avorlio-launch-rebrand.patch`, `Dockerfile.dodo-test`, `Dockerfile.golden-patch` | untracked | no evidence | no | recovery/test artifact; exclude |
| all remaining `*.patch`, `*.bak*`, `*.txt`, QA/debug scripts, `.pnpm-store`, and build/cache state | untracked | no evidence | no | test/QA, local recovery, or generated; exclude |

No local-only file was deleted, staged, committed, or copied into the candidate unless independently identified as production source.
