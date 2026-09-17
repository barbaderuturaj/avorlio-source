# Production and provenance

Avorlio public application routing recognizes `avorlio.com`, `www.avorlio.com`,
and `app.avorlio.com` in `packages/crm/src/proxy.ts`; workspace subdomains are
configured through `WORKSPACE_BASE_DOMAIN`. Production is an Oracle Cloud,
Docker-based deployment. This document intentionally omits host credentials,
private network details, and operator access paths.

The running production image observed in recovery is:

`sha256:bb7ae5b21f4fd65071541b710825acc78aa8ad832d19c28b821e9c8cc6cda919`

The verified recovery candidate image is:

`sha256:7f3fe72ec61c2a9e2af50c888262b9f97efe8004d8f615b9372114eb88e911f0`

The corresponding-source baseline is public commit
`f817f1c259c700720b85f1bef1a24a42e546c8a7`, with tag
`avorlio-prod-reconstructed-2026-09-17`. It is reconstructed and verified
corresponding source; it is **not** proof of the original production Git SHA.

Read [PRODUCTION-PROVENANCE.md](PRODUCTION-PROVENANCE.md) and
`15-AGPL-SOURCE-PARITY.md` before making any production/source-parity claim.

