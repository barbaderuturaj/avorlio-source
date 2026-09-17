# Decisions (condensed ADR history)

## Avorlio product direction

**Decision:** present and operate the product as Avorlio, a done-for-you AI Front
Office, while acknowledging SeldonFrame as the historical codebase name.

**Reason:** the current launch and recovery context use Avorlio, while the code
and package names retain SeldonFrame ancestry.

## HVAC-only launch

**Decision:** limit active launch scope to US residential HVAC.

**Reason:** this constrains work to stable customer acquisition/onboarding and
prevents inherited multi-vertical platform scope from becoming accidental work.

## Dodo launch billing

**Decision:** Dodo is the current launch subscription path.

**Reason:** checkout/webhook code uses the avorlio_hvac offer and an active-only
entitlement model. Stripe code remains historical/inherited context.

## Oracle Docker production

**Decision:** document production as Oracle Cloud, Docker-based runtime.

**Reason:** recovery observed a production Docker image and the repository has
Dockerfile/compose mechanics. No broader infrastructure claim is made.

## Corresponding-source reconstruction

**Decision:** publish the verified reconstructed corresponding-source baseline at
the public repository/anchor/tag named in 16-CURRENT-STATE.md.

**Reason:** the original production Git SHA is not available. The tag identifies
the recovery baseline, not later documentation commits.

## Public AGPL source and Project Brain

**Decision:** keep technical source/provenance and public-safe handoff in Git;
keep operator-only continuity in ignored .avorlio-private/.

**Reason:** new agents need independent, source-grounded context without exposing
credentials, customer data, or private operating details.

