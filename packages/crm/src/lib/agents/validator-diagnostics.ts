import type { AgentValidatorResult } from "@/db/schema/agents";

const MAX_DETAIL_LENGTH = 280;
const MAX_CANDIDATE_LENGTH = 500;

function compactAndRedactForLog(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\+?\d[\d\s().-]{6,}\d/g, "[phone]")
    .replace(/\b(?:sk-ant|sk-proj|sk|wst)_[A-Za-z0-9._-]+/g, "[secret]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [secret]")
    .replace(/\b(x-seldon-api-key|authorization|cookie|set-cookie)\s*[:=]\s*[^;,\s]+/gi, "$1=[redacted]")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/"/g, "'")
    .trim();
}

export function sanitizeValidatorDetailForLog(details: unknown): string {
  if (typeof details !== "string") return "";

  const compact = compactAndRedactForLog(details);

  if (compact.length <= MAX_DETAIL_LENGTH) return compact;
  return `${compact.slice(0, MAX_DETAIL_LENGTH - 1).trimEnd()}…`;
}

export function sanitizeValidatorCandidateForLog(candidate: unknown): string {
  if (typeof candidate !== "string") return "";

  const compact = compactAndRedactForLog(candidate);

  if (compact.length <= MAX_CANDIDATE_LENGTH) return compact;
  return `${compact.slice(0, MAX_CANDIDATE_LENGTH - 3).trimEnd()}...`;
}

export function formatValidatorFailureDiagnostics(
  results: readonly AgentValidatorResult[],
  options: { candidateResponse?: unknown } = {},
): string {
  const formatted = results
    .filter((result) => !result.passed)
    .map((result) => {
      const name = result.name.replace(/[^\w.-]/g, "_");
      const details = sanitizeValidatorDetailForLog(result.details);
      return details ? `${name} details="${details}"` : name;
    })
    .join("; ");

  const shouldIncludeCandidate = results.some(
    (result) =>
      !result.passed && result.name === "no_unbacked_operational_promises",
  );
  if (!shouldIncludeCandidate) return formatted;

  const candidate = sanitizeValidatorCandidateForLog(options.candidateResponse);
  if (!candidate) return formatted;
  return formatted ? `${formatted} candidate="${candidate}"` : `candidate="${candidate}"`;
}
