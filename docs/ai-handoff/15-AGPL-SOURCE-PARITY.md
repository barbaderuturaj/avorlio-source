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
2. Build the production image from that committed source and handle or verify
   migrations.
3. Generate, validate, and copy the schema-versioned `.avorlio-release.json`
   into the production directory.
4. Confirm its public-source SHA and Docker image ID against the actual
   deployment, then retain build/test/migration and smoke-check evidence.
5. Update the current-state/provenance docs when the verified state changes.

A release is not continuity-complete until every step above is complete.
Operators and AI agents must read `.avorlio-release.json` rather than infer a
deployed Git SHA from filesystem timestamps. See `17-RELEASE-IDENTITY.md`.

Never publish credentials, private keys, database URLs containing credentials,
customer data, sales/lead data, runtime uploads/dumps, or private operator
notes. This is a technical process description, not legal advice or a legal
compliance guarantee.
