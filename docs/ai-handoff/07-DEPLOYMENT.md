# Deployment guidance

No automated CI/CD process is asserted here. The repository evidence supports a
Docker build/compose deployment model, with a separate migration service and
runtime app service. Treat all production actions as explicit operator work.

## Safe pre-deploy sequence

1. Confirm branch, commit, diff, and intended release identity.
2. Run the root build and focused tests for changed behavior.
3. Run the migration-journal check; review every migration and its target.
4. Build the Docker image from the exact commit; record image and source IDs.
5. Verify environment variable *names* and deployment configuration without
   exposing values.
6. Obtain explicit approval before any production mutation.
7. Generate `.avorlio-release.json` with `pnpm release:manifest`, copy it into
   the production directory, and validate it with `pnpm release:verify`.
8. Confirm the deployed Docker image ID and the public source SHA agree with
   the manifest.
9. After a deploy, verify health, relevant public routes, and the specific
   changed workflow; record the outcome and source/image identity.

## Permanent release identity contract

A production deployment is not continuity-complete until the exact source
commit is committed, corresponding AGPL source is public, the production image
is built, migrations are handled or verified, `.avorlio-release.json` is
generated and copied to production, the deployed Docker image ID is confirmed,
the public source SHA agrees with the production manifest, and post-deploy
smoke checks pass. The schema and tooling are defined in
`17-RELEASE-IDENTITY.md`.

Future operators and AI agents must read `.avorlio-release.json` first. Never
infer a deployed Git SHA from filesystem timestamps.

`scripts/docker-migrate.sh` is used by the compose migration service. It is not
a casual production command. The rollback philosophy is: stop, retain evidence,
return to a known image/source identity, and use a reviewed database recovery
plan rather than improvising schema reversal. Future modified production source
must be published/recorded according to `15-AGPL-SOURCE-PARITY.md`.
