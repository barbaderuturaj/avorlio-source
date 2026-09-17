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
7. After a deploy, verify health, relevant public routes, and the specific
   changed workflow; record the outcome and source/image identity.

`scripts/docker-migrate.sh` is used by the compose migration service. It is not
a casual production command. The rollback philosophy is: stop, retain evidence,
return to a known image/source identity, and use a reviewed database recovery
plan rather than improvising schema reversal. Future modified production source
must be published/recorded according to `15-AGPL-SOURCE-PARITY.md`.

