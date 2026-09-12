import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  formatValidatorFailureDiagnostics,
  sanitizeValidatorCandidateForLog,
  sanitizeValidatorDetailForLog,
} from "../../../src/lib/agents/validator-diagnostics";

describe("validator diagnostic log formatter", () => {
  test("prints failed validator names with one-line details", () => {
    const formatted = formatValidatorFailureDiagnostics([
      { name: "quotes_only_from_soul_pricing", passed: true },
      {
        name: "no_unbacked_operational_promises",
        passed: false,
        details: "Unsupported operational claims:\nwe can operational promise",
      },
    ]);

    assert.equal(
      formatted,
      "no_unbacked_operational_promises details=\"Unsupported operational claims: we can operational promise\"",
    );
  });

  test("redacts contact-shaped values from details", () => {
    const safe = sanitizeValidatorDetailForLog(
      "Possible PII leak: qa@example.com and +1 (214) 555-0199",
    );

    assert.equal(safe, "Possible PII leak: [email] and [phone]");
  });

  test("prints sanitized candidate text only for operational-promise failures", () => {
    const formatted = formatValidatorFailureDiagnostics(
      [
        {
          name: "no_unbacked_operational_promises",
          passed: false,
          details: "Unsupported operational claims: unsupported service promise",
        },
      ],
      {
        candidateResponse:
          "Line one with qa@example.com\nLine two with +1 (214) 555-0199",
      },
    );

    assert.equal(
      formatted,
      "no_unbacked_operational_promises details=\"Unsupported operational claims: unsupported service promise\" candidate=\"Line one with [email] Line two with [phone]\"",
    );
  });

  test("does not print candidate text for other failed validators", () => {
    const formatted = formatValidatorFailureDiagnostics(
      [
        {
          name: "quotes_only_from_soul_pricing",
          passed: false,
          details: "Quoted unallowed amounts: $199",
        },
      ],
      { candidateResponse: "Candidate should not be logged." },
    );

    assert.equal(
      formatted,
      "quotes_only_from_soul_pricing details=\"Quoted unallowed amounts: $199\"",
    );
  });

  test("candidate sanitizer redacts secret-shaped values and caps length", () => {
    const safe = sanitizeValidatorCandidateForLog(
      `${"A".repeat(520)} sk-ant_abc123 Bearer wst_secret authorization: raw-token`,
    );

    assert.equal(safe.length, 500);
    assert.match(safe, /\.\.\.$/);
    assert.doesNotMatch(safe, /sk-ant_abc123|wst_secret|raw-token/);
  });
});
