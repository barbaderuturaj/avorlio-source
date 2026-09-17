# Known limits and deferred scope

## Non-blocking known limits

- **Source provenance:** the reconstructed baseline was validated against the
  Oracle production image, but the original production Git SHA is unavailable.
  See 06-PRODUCTION.md.
- **Migrations:** the repository intentionally has a hybrid journaled and
  out-of-band migration history. This requires review, not casual migration
  commands. See 05-DATABASE.md.
- **Documentation drift:** root README and older SeldonFrame documents describe
  broader platform capabilities and domains. They are historical unless current
  source/provenance evidence says otherwise.

## Deferred features

- **SMS and voice:** code exists, but they are deferred from initial Avorlio
  HVAC launch unless explicitly enabled and verified.
- **Cross-vertical expansion:** plumbing, med-spa, agency/marketplace, and other
  historical verticals are not current launch scope.
- **Automated deployment:** no source-grounded automated CI/CD claim is made in
  this handoff; deployment is an explicit operator process.

## Launch blockers

No additional launch blocker is asserted by this documentation. Do not infer
that every historical issue or unused code path blocks the HVAC launch; evaluate
a concrete production workflow with current evidence.

