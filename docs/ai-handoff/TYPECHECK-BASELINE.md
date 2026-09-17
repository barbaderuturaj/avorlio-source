# Typecheck Baseline

## Toolchain

- Command: `pnpm typecheck` (`tsc --noEmit -p packages/crm/tsconfig.json`)
- Candidate Node: `v22.14.0` (local runtime)
- Package manager: `pnpm 10.18.1` when invoked directly; Corepack selected `pnpm 12.3.4` and rejected the repository package-manager requirement.
- TypeScript: `5.9.3`

## Public Base

- Commit: `cf08f0947f36070d6297d77f46a45bc62bd763ae`
- A normal install/typecheck could not be started: offline pnpm install failed with a local Windows `EPERM` creating a temporary file in the untouched base worktree, leaving `node_modules` absent.
- No source was changed in that worktree.
- The candidate was initially based on this exact commit. Before production overlays, its typecheck had the same non-Dodo errors later observed in the candidate (workspace timezone references, landing-shell typing, and existing test typing). This establishes inheritance by path/history, but not a clean standalone public-base compiler run.

## Candidate

- Final direct `pnpm typecheck` result: failed.
- Observed diagnostics: generated `tsconfig.tsbuildinfo` `EPERM`, six `workspaceTimezone` references, one landing-shell type error, four generic test typing errors, and one `contactEmail` test typing error.
- The initial Dodo-specific errors were caused by an incomplete reconstruction overlay. Production versions of `managed-workspace.ts`, onboarding links, CRM package metadata/lockfile, and related Dodo source were recovered; the Dodo-specific errors disappeared.

## Candidate-only regressions

- Count after correction: `0` identified candidate-only typecheck regressions.
- Remaining errors are inherited/known source or test typing debt, plus the local generated-file write restriction.
- The final production build passes because the repository build explicitly skips TypeScript validation.

## Conclusion

Typecheck is not clean, but no candidate-only regression remains identified after correcting the reconstruction omissions. The public-base standalone run remains limited by the local EPERM install failure.

## Phase 2A.2 Final Check

After recovering the Oracle onboarding-submit route, one production-source type defect was corrected locally (`NeonHttpQueryResult.length` → `.rows.length`) without changing behavior. The final typecheck still reports only the previously recorded inherited `workspaceTimezone`, landing-shell, and test typing debt. Candidate-only regressions: **0**. Final production build and targeted tests pass.
