# Corresponding-source parity process

This public repository is the technical corresponding-source location for Avorlio
production releases. The recovery baseline is public main commit
f817f1c259c700720b85f1bef1a24a42e546c8a7, tagged
avorlio-prod-reconstructed-2026-09-17.

That tag must remain attached to the reconstruction baseline. It does not mean
the running Oracle image was originally built from that Git SHA; it identifies
the verified reconstructed source used for parity/recovery purposes.

## Future release discipline

1. Commit and normally push the corresponding source before or with release.
2. Record the public commit/tag and built image identity in a future
   .avorlio-release.json or equivalent release record.
3. Retain build/test/migration evidence and state whether deployment was verified.
4. Compare the deployed source/image inputs with the recorded release identity.
5. Update the current-state/provenance docs when the verified state changes.

Never publish credentials, private keys, database URLs containing credentials,
customer data, sales/lead data, runtime uploads/dumps, or private operator
notes. This is a technical process description, not legal advice or a legal
compliance guarantee.

