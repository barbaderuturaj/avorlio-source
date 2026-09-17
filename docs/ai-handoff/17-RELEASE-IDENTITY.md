# Release identity contract

Every production Avorlio directory must contain a non-secret,
machine-readable `.avorlio-release.json`. It is the first source of release
identity for operators and AI tools; filesystem timestamps are not deployment
provenance.

Schema version `1` supports two release kinds: `normal_deploy` and
`reconstructed_baseline`.

## Normal future deployments

Use this shape for a deployment whose source commit is known:

```json
{
  "schema_version": 1,
  "project": "Avorlio",
  "environment": "production",
  "release_kind": "normal_deploy",
  "source_repository": "https://github.com/barbaderuturaj/avorlio-source",
  "source_commit": "<actual deployed Git SHA>",
  "corresponding_source_commit": "<public source SHA>",
  "release_tag": "<tag if used>",
  "docker_image_id": "sha256:<full image digest>",
  "deployed_at": "<ISO-8601 timestamp>",
  "migration_identity": "<verified identifier or documented mode>",
  "generated_at": "<ISO-8601 timestamp>"
}
```

`source_commit`, `corresponding_source_commit`, the image digest, deployment
timestamp, migration identity, and generated timestamp are required. A release
tag is optional. Generate it with `pnpm release:manifest -- ...` and validate
the result with `pnpm release:verify -- --file <path>`.

## Reconstructed baseline

The current Oracle deployment has reconstructed provenance, so its historical
source commit and original deployment timestamp are intentionally `null`. Its
manifest must use `release_kind: "reconstructed_baseline"` and include:

- `production_original_git_sha_known: false`
- `corresponding_source_anchor` (the verified reconstructed source commit)
- `reconstruction_tag`
- `project_brain_commit`
- `migration_parity` and `dodo_parity`
- `stamped_at`, the actual metadata-writing time

It must not claim that the reconstructed source anchor is the original image
build commit. The generator deliberately refuses to invent unknown values.

## Tooling and deployment rule

`scripts/release/generate-avorlio-release.mjs` writes a manifest only from
explicit non-secret flags, except that it may obtain the checked-out Git SHA for
a `normal_deploy` when `--source-commit` is omitted. It requires an
environment, release kind, and full Docker image ID.

`scripts/release/verify-avorlio-release.mjs` validates schema version, required
fields, identifiers, timestamps, release-kind rules, and rejects secret-like
keys. Do not put credentials, tokens, database URLs, customer data, or private
operator notes in a manifest.

A production deployment is continuity-complete only when the exact source is
committed and public, the image and migration state are verified, the manifest
is generated/copied/validated, source and image agree with production, and
post-deploy smoke checks pass.
