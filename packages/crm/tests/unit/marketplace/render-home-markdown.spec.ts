// Marketing-homepage Markdown twin (/home.md) renderer - pure.

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { renderHomeMarkdown, homeUrl, HOME_BASE_URL } from "../../../src/lib/marketplace/render-home-markdown";
import { POSITIONING_ONE_LINER } from "../../../src/app/(public)/home-copy";

describe("renderHomeMarkdown()", () => {
  test("renders the concise Avorlio launch copy", () => {
    const md = renderHomeMarkdown();

    assert.equal(
      md,
      "# Avorlio\n\nAI Front Office for Service Businesses.\n\nNever miss another lead.\n\nAvorlio captures website leads, answers approved business questions, qualifies prospects, books appointments, and follows up automatically.\n\n> " +
        POSITIONING_ONE_LINER +
        "\n\nCurrently launching for HVAC businesses.\n\n[Open Avorlio](https://app.avorlio.com)\n",
    );
  });

  test("uses the Avorlio origin by default", () => {
    assert.equal(homeUrl(), HOME_BASE_URL);
    assert.equal(HOME_BASE_URL, "https://app.avorlio.com");
  });

  test("honors a custom base URL without a duplicate slash", () => {
    const md = renderHomeMarkdown("https://staging.example.com/");

    assert.equal(homeUrl("https://staging.example.com/"), "https://staging.example.com");
    assert.match(md, /\[Open Avorlio\]\(https:\/\/staging\.example\.com\)/);
    assert.ok(!md.includes("https://staging.example.com//"), "no double slash");
  });

  test("does not emit legacy positioning or offer claims", () => {
    const md = renderHomeMarkdown();
    const forbidden = [
      "SeldonFrame",
      "seldonframe.com",
      "app.seldonframe.com",
      "GoHighLevel",
      "$29",
      "$49",
      "$99",
      "$199",
      "$299",
      "free forever",
      "unlimited",
      "20+ verticals",
      "3 minutes",
      "60 seconds",
      "Build it free",
      "marketplace",
      "Maxime Houle",
    ];

    for (const phrase of forbidden) {
      assert.ok(!md.toLowerCase().includes(phrase.toLowerCase()), `unexpected legacy phrase: ${phrase}`);
    }
  });
});
