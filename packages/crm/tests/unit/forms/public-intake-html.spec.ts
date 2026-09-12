import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { rewriteStoredIntakeCompletionBookCta } from "@/lib/forms/public-intake-html";

const storedHtml = `
<div>
  <a href="/book" class="other-link">Book from another area</a>
  <div class="sf-intake__complete">
    <a class="sf-btn sf-btn--primary sf-intake__complete-cta" href="/book">
      <span class="sf-btn__label">Book service</span>
    </a>
  </div>
</div>`;

describe("rewriteStoredIntakeCompletionBookCta", () => {
  test("rewrites completion CTA /book to localhost org-qualified booking URL", () => {
    const bookingUrl = "http://localhost:3002/book/desertcool-hvac/default";

    const out = rewriteStoredIntakeCompletionBookCta(storedHtml, bookingUrl);

    assert.match(
      out,
      /sf-intake__complete-cta" href="http:\/\/localhost:3002\/book\/desertcool-hvac\/default"/,
    );
    assert.match(out, /<a href="\/book" class="other-link">/);
  });

  test("rewrites completion CTA /book to workspace-origin booking URL", () => {
    const bookingUrl = "https://desertcool-hvac.app.seldonframe.com/book/default";

    const out = rewriteStoredIntakeCompletionBookCta(storedHtml, bookingUrl);

    assert.match(
      out,
      /sf-intake__complete-cta" href="https:\/\/desertcool-hvac.app.seldonframe.com\/book\/default"/,
    );
  });

  test("rewrites completion CTA /book to custom-origin booking URL", () => {
    const bookingUrl = "https://coolair.example/book/default";

    const out = rewriteStoredIntakeCompletionBookCta(storedHtml, bookingUrl);

    assert.match(
      out,
      /sf-intake__complete-cta" href="https:\/\/coolair.example\/book\/default"/,
    );
  });

  test("leaves HTML unchanged when no completion /book CTA exists", () => {
    const html = `<a href="/book" class="other-link">Book from another area</a>`;
    assert.equal(
      rewriteStoredIntakeCompletionBookCta(html, "https://desertcool-hvac.app.seldonframe.com/book/default"),
      html,
    );
  });

  test("removes only the completion CTA when booking is unavailable", () => {
    const out = rewriteStoredIntakeCompletionBookCta(storedHtml, null);

    assert.doesNotMatch(out, /sf-intake__complete-cta/);
    assert.doesNotMatch(out, /Book service/);
    assert.match(out, /<a href="\/book" class="other-link">/);
  });
});
