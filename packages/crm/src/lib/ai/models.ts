/**
 * Shared default Anthropic model ids for Seldon's internal generation calls
 * (Seldon-It, block generation, soul compiler, soul wiki, public URL analysis).
 *
 * WHY THIS EXISTS: `claude-sonnet-4-20250514` (Sonnet 4) was copy-pasted as the
 * hardcoded default across ~10 call sites. It is now deprecated and 404s in
 * production (`personality_generator_model_fallback` fires on it). Centralizing
 * the default here means the next model retirement is a one-line change, not
 * another repo-wide sweep.
 *
 * `claude-sonnet-4-6` is the current supported Sonnet alias used by the
 * runtime model selector and pricing table.
 *
 * Call sites keep their own env override (`SELDON_MODEL`, `SOUL_COMPILER_MODEL`,
 * `ANTHROPIC_MODEL`); this constant only supplies the fallback default.
 */
export const DEFAULT_SONNET_MODEL = "claude-sonnet-4-6";
