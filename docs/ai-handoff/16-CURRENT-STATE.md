# Current state snapshot

**Snapshot date:** 2026-09-17. This file is not automatically updated truth;
verify current Git and runtime state before relying on it.

| Item | Verified snapshot |
| --- | --- |
| Current public main / Project Brain commit | 24fd3916d4411f08a38c67efa808162e60f7ed43 |
| Production reconstructed corresponding-source anchor | f817f1c259c700720b85f1bef1a24a42e546c8a7 |
| Reconstruction tag | avorlio-prod-reconstructed-2026-09-17 |
| Current production image | sha256:bb7ae5b21f4fd65071541b710825acc78aa8ad832d19c28b821e9c8cc6cda919 |
| Verification image | sha256:7f3fe72ec61c2a9e2af50c888262b9f97efe8004d8f615b9372114eb88e911f0 |
| Build | PASS |
| Tests | 95 pass; 1 skipped; 0 fail |
| Candidate-only type regressions | 0 |
| Migration parity | VERIFIED |
| Dodo parity | VERIFIED |
| Production provenance | Reconstructed and verified; original Git SHA not proven. The reconstructed anchor is not the historical production build commit. |
| Current launch scope | US residential HVAC |

## Oracle continuity metadata installation

Verified metadata-only continuity stamping completed on 2026-09-17. This was
not an application redeployment.

| Item | Verified installation state |
| --- | --- |
| CURRENT PUBLIC MAIN | `24fd3916d4411f08a38c67efa808162e60f7ed43` |
| Project Brain / roadmap / release contract | Installed in current public main |
| Production corresponding-source anchor | `f817f1c259c700720b85f1bef1a24a42e546c8a7` |
| Current running production image | `sha256:bb7ae5b21f4fd65071541b710825acc78aa8ad832d19c28b821e9c8cc6cda919` |
| Oracle release manifest | Installed and verified |
| Oracle AI context | Installed and verified |

The only Oracle production-directory changes were `.avorlio-release.json`,
`AGENTS.md`, `CLAUDE.md`, and a narrow backup of the pre-existing Oracle AI
context files. The application container was not restarted; no database,
environment, or application-source change was made.

Later commits may contain documentation or changes beyond this snapshot; always
inspect branch, commit, remote, tests, and deployment evidence.
