// Avorlio's concise Markdown homepage twin (`/home.md`).
//
// PURE - no I/O, no React - so it unit-tests with no fixtures.

import { POSITIONING_ONE_LINER } from "@/app/(public)/home-copy";

/** Canonical public origin for absolute links. */
export const HOME_BASE_URL = "https://app.avorlio.com";

function trimBase(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

/** Absolute URL of the human homepage. */
export function homeUrl(baseUrl: string = HOME_BASE_URL): string {
  return trimBase(baseUrl) || HOME_BASE_URL;
}

/**
 * Render the launch homepage as concise Markdown. The base URL remains
 * overridable for tests and non-production hosts.
 */
export function renderHomeMarkdown(baseUrl: string = HOME_BASE_URL): string {
  const base = homeUrl(baseUrl);
  const lines: string[] = [];

  lines.push("# Avorlio");
  lines.push("");
  lines.push("AI Front Office for Service Businesses.");
  lines.push("");
  lines.push("Never miss another lead.");
  lines.push("");
  lines.push(
    "Avorlio captures website leads, answers approved business questions, qualifies prospects, books appointments, and follows up automatically.",
  );
  lines.push("");
  lines.push(`> ${POSITIONING_ONE_LINER}`);
  lines.push("");
  lines.push("Currently launching for HVAC businesses.");
  lines.push("");
  lines.push(`[Open Avorlio](${base})`);
  lines.push("");

  return lines.join("\n");
}
